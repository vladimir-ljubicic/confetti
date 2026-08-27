"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import * as tus from "tus-js-client";
import { extractTakenAt } from "@/lib/exif";
import { generateThumbnail } from "@/lib/thumbnail";
import { UPLOADS_FROZEN_STATUS } from "@/lib/upload-freeze";
import {
  FILE_TOO_LARGE_STATUS,
  RATE_LIMITED_STATUS,
  type RateLimitReason,
} from "@/lib/upload-limits";
import type { UploadTicket } from "@/lib/upload-ticket";
import type { Locale } from "@/lib/i18n";
import { IntroSheet, type IntroSheetLabels } from "./intro-sheet";
import { useUploadQueue } from "./upload-queue";

// Fixed by Supabase's resumable upload endpoint; other sizes are rejected.
const CHUNK_SIZE = 6 * 1024 * 1024;
const CONCURRENT_UPLOADS = 3;
// Larger batches use the plain progress list; per-photo tiles would be noise.
const OPTIMISTIC_TILE_MAX = 10;
const CANCELLED_TILE_TTL_MS = 4000;

type UploadLabels = {
  add: string;
  uploading: string;
  fileFailed: string;
  someFailed: string;
  frozen: string;
  fileTooLarge: string;
  batchLimit: string;
  rateLimited: string;
};

type UploadLimitProps = {
  maxBatch: number;
  maxFileBytes: number;
};

type UploadItem = {
  id: number;
  file: File;
  status: "pending" | "uploading" | "done" | "error" | "too-large";
  percent: number;
};

type TileItem = { id: number; file: File };

type TileController = {
  cancelled: boolean;
  done: boolean;
  abortTus: (() => void) | null;
  removeTimer: number | null;
};

// The server refuses to sign uploads for devices without a saved profile;
// the client reacts by (re)opening the intro sheet.
class ProfileRequiredError extends Error {}

// The admin froze uploads; remaining files are dropped and a notice is shown.
class UploadsFrozenError extends Error {}

class FileTooLargeError extends Error {}

class UploadCancelledError extends Error {}

// The device hit an upload limit; remaining files are dropped and a notice
// names the limit that was hit.
class RateLimitedError extends Error {
  constructor(public reason: RateLimitReason) {
    super();
  }
}

type UploadControl = {
  isCancelled: () => boolean;
  onTusStart: (abort: () => void) => void;
};

// Best-effort: failures are swallowed and the upload proceeds without a
// thumbnail.
async function uploadThumbnail(file: File, uploadUrl: string): Promise<void> {
  try {
    const thumbnail = await generateThumbnail(file);
    if (!thumbnail) return;
    await fetch(uploadUrl, {
      method: "PUT",
      headers: { "content-type": "image/jpeg", "cache-control": "max-age=3600" },
      body: thumbnail,
    });
  } catch (error) {
    console.error("Thumbnail upload failed", error);
  }
}

async function uploadFile(
  file: File,
  batchSize: number,
  onProgress: (percent: number) => void,
  control?: UploadControl,
): Promise<string> {
  const takenAt = await extractTakenAt(file);
  if (control?.isCancelled()) throw new UploadCancelledError();
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      batchSize,
      takenAt,
    }),
  });
  if (response.status === 409) throw new ProfileRequiredError();
  if (response.status === UPLOADS_FROZEN_STATUS) throw new UploadsFrozenError();
  if (response.status === FILE_TOO_LARGE_STATUS) throw new FileTooLargeError();
  if (response.status === RATE_LIMITED_STATUS) {
    const body = (await response.json().catch(() => null)) as {
      reason?: unknown;
    } | null;
    throw new RateLimitedError(body?.reason === "batch" ? "batch" : "window");
  }
  if (!response.ok) throw new Error(`Upload request failed (${response.status})`);
  const { photoId, path, token, storageUrl, thumbnailUploadUrl } =
    (await response.json()) as UploadTicket;
  if (control?.isCancelled()) throw new UploadCancelledError();

  const thumbnailUpload = thumbnailUploadUrl
    ? uploadThumbnail(file, thumbnailUploadUrl)
    : null;

  await new Promise<void>((resolve, reject) => {
    const upload = new tus.Upload(file, {
      endpoint: `${storageUrl}/storage/v1/upload/resumable/sign`,
      chunkSize: CHUNK_SIZE,
      uploadDataDuringCreation: false,
      headers: { "x-signature": token },
      metadata: {
        bucketName: "photos",
        objectName: path,
        contentType: file.type || "application/octet-stream",
        cacheControl: "3600",
      },
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onError: reject,
      onSuccess: () => resolve(),
    });
    // tus abort() stops silently, so cancellation must reject here itself or
    // the awaiting worker would hang forever.
    control?.onTusStart(() => {
      void upload.abort();
      reject(new UploadCancelledError());
    });
    upload.start();
  });

  if (thumbnailUpload) await thumbnailUpload;
  const complete = await fetch(`/api/uploads/${photoId}/complete`, { method: "POST" });
  if (!complete.ok) throw new Error(`Completing upload failed (${complete.status})`);
  return photoId;
}

export function UploadButton({
  labels,
  sheetLabels,
  locale,
  needsProfile,
  limits,
  limitsExempt,
  variant = "floating",
}: {
  labels: UploadLabels;
  sheetLabels: IntroSheetLabels;
  locale: Locale;
  needsProfile: boolean;
  limits: UploadLimitProps;
  // Admin devices: the server skips limit checks, so the client must too.
  limitsExempt: boolean;
  variant?: "floating" | "inline";
}) {
  const router = useRouter();
  const queue = useUploadQueue();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasProfile, setHasProfile] = useState(!needsProfile);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [batchActive, setBatchActive] = useState(false);
  const [batchTileIds, setBatchTileIds] = useState<Set<number>>(new Set());
  const [frozenNotice, setFrozenNotice] = useState(false);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const tileIdRef = useRef(0);
  const controllers = useRef(new Map<number, TileController>());

  const batchLimitMessage = labels.batchLimit.replace(
    "{max}",
    String(limits.maxBatch),
  );

  function patchUpload(id: number, patch: Partial<UploadItem>) {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }

  function askForProfile(files: File[]) {
    setHasProfile(false);
    setPendingFiles(files);
    setDialogOpen(true);
  }

  function dropTile(id: number) {
    const controller = controllers.current.get(id);
    if (controller?.removeTimer) window.clearTimeout(controller.removeTimer);
    controllers.current.delete(id);
    queue?.removeTiles([id]);
  }

  function cancelTile(id: number) {
    const controller = controllers.current.get(id);
    if (!controller || controller.done || controller.cancelled) return;
    controller.cancelled = true;
    controller.abortTus?.();
    controller.abortTus = null;
    queue?.patchTile(id, { status: "cancelled" });
    controller.removeTimer = window.setTimeout(() => dropTile(id), CANCELLED_TILE_TTL_MS);
  }

  async function uploadTile(item: TileItem, batchSize: number): Promise<void> {
    const controller = controllers.current.get(item.id);
    if (!controller || controller.cancelled || controller.done) return;
    if (!limitsExempt && item.file.size > limits.maxFileBytes) {
      queue?.patchTile(item.id, { status: "failed" });
      return;
    }
    queue?.patchTile(item.id, { status: "uploading", percent: 0 });
    try {
      const photoId = await uploadFile(
        item.file,
        batchSize,
        (percent) => queue?.patchTile(item.id, { percent }),
        {
          isCancelled: () => controller.cancelled,
          onTusStart: (abort) => {
            controller.abortTus = abort;
          },
        },
      );
      // A cancel that raced a finished upload is moot: the photo exists.
      if (controller.removeTimer) window.clearTimeout(controller.removeTimer);
      controller.removeTimer = null;
      controller.cancelled = false;
      controller.done = true;
      queue?.patchTile(item.id, { status: "done", percent: 100, photoId });
    } catch (error) {
      if (error instanceof UploadCancelledError || controller.cancelled) return;
      if (
        error instanceof ProfileRequiredError ||
        error instanceof UploadsFrozenError ||
        error instanceof RateLimitedError
      ) {
        throw error;
      }
      if (!(error instanceof FileTooLargeError)) {
        console.error("Upload failed", error);
      }
      queue?.patchTile(item.id, { status: "failed" });
    }
  }

  async function retryTile(item: TileItem) {
    const controller = controllers.current.get(item.id);
    if (!controller || controller.done) return;
    controller.cancelled = false;
    try {
      await uploadTile(item, 1);
      router.refresh();
    } catch (error) {
      dropTile(item.id);
      if (error instanceof ProfileRequiredError) {
        askForProfile([item.file]);
      } else if (error instanceof UploadsFrozenError) {
        setFrozenNotice(true);
        router.refresh();
      } else if (error instanceof RateLimitedError) {
        setLimitNotice(
          error.reason === "batch" ? batchLimitMessage : labels.rateLimited,
        );
      }
    }
  }

  function restoreTile(item: TileItem) {
    const controller = controllers.current.get(item.id);
    if (!controller || controller.done) return;
    if (controller.removeTimer) window.clearTimeout(controller.removeTimer);
    controller.removeTimer = null;
    controller.cancelled = false;
    queue?.patchTile(item.id, { status: "queued", percent: 0 });
    void retryTile(item);
  }

  async function startTileBatch(files: File[]) {
    if (!queue) return;
    const tileItems: TileItem[] = files.map((file) => ({
      id: tileIdRef.current++,
      file,
    }));
    for (const item of tileItems) {
      controllers.current.set(item.id, {
        cancelled: false,
        done: false,
        abortTus: null,
        removeTimer: null,
      });
    }
    queue.addTiles(
      tileItems.map((item) => ({
        id: item.id,
        previewUrl: URL.createObjectURL(item.file),
        status: "queued",
        percent: 0,
        photoId: null,
        cancel: () => cancelTile(item.id),
        retry: () => void retryTile(item),
        restore: () => restoreTile(item),
      })),
    );
    setBatchTileIds(new Set(tileItems.map((item) => item.id)));
    setItems([]);
    setBatchActive(true);
    setFrozenNotice(false);
    setLimitNotice(null);

    const pending = [...tileItems];
    const retryFiles: File[] = [];
    let abort: "profile" | "frozen" | "limit" | null = null;
    let limitMessage = labels.rateLimited;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENT_UPLOADS, pending.length) }, async () => {
        for (let item = pending.shift(); item; item = pending.shift()) {
          if (abort) {
            if (abort === "profile") retryFiles.push(item.file);
            dropTile(item.id);
            continue;
          }
          try {
            await uploadTile(item, files.length);
          } catch (error) {
            dropTile(item.id);
            if (error instanceof ProfileRequiredError) {
              abort = "profile";
              retryFiles.push(item.file);
            } else if (error instanceof UploadsFrozenError) {
              abort = "frozen";
            } else if (error instanceof RateLimitedError) {
              abort = "limit";
              limitMessage =
                error.reason === "batch" ? batchLimitMessage : labels.rateLimited;
            }
          }
        }
      }),
    );

    setBatchActive(false);
    if (abort === "profile") {
      askForProfile(retryFiles);
      return;
    }
    if (abort === "frozen") setFrozenNotice(true);
    if (abort === "limit") setLimitNotice(limitMessage);
    router.refresh();
  }

  async function startListBatch(files: File[]) {
    const batch: UploadItem[] = files.map((file, index) => ({
      id: index,
      file,
      status: "pending",
      percent: 0,
    }));
    setItems(batch);
    setBatchTileIds(new Set());
    setBatchActive(true);
    setFrozenNotice(false);
    setLimitNotice(null);

    const queued = [...batch];
    const retryFiles: File[] = [];
    let abort: "profile" | "frozen" | "limit" | null = null;
    let limitMessage = labels.rateLimited;
    let anyFailed = false;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENT_UPLOADS, queued.length) }, async () => {
        for (let item = queued.shift(); item; item = queued.shift()) {
          if (abort) {
            if (abort === "profile") retryFiles.push(item.file);
            continue;
          }
          if (!limitsExempt && item.file.size > limits.maxFileBytes) {
            anyFailed = true;
            patchUpload(item.id, { status: "too-large" });
            continue;
          }
          patchUpload(item.id, { status: "uploading" });
          try {
            await uploadFile(item.file, files.length, (percent) =>
              patchUpload(item.id, { percent }),
            );
            patchUpload(item.id, { status: "done", percent: 100 });
          } catch (error) {
            if (error instanceof ProfileRequiredError) {
              abort = "profile";
              retryFiles.push(item.file);
              patchUpload(item.id, { status: "pending", percent: 0 });
            } else if (error instanceof UploadsFrozenError) {
              abort = "frozen";
              patchUpload(item.id, { status: "pending", percent: 0 });
            } else if (error instanceof RateLimitedError) {
              abort = "limit";
              limitMessage =
                error.reason === "batch" ? batchLimitMessage : labels.rateLimited;
              patchUpload(item.id, { status: "pending", percent: 0 });
            } else if (error instanceof FileTooLargeError) {
              anyFailed = true;
              patchUpload(item.id, { status: "too-large" });
            } else {
              console.error("Upload failed", error);
              anyFailed = true;
              patchUpload(item.id, { status: "error" });
            }
          }
        }
      }),
    );

    setBatchActive(false);
    if (abort) {
      setItems([]);
      if (abort === "profile") {
        askForProfile(retryFiles);
      } else if (abort === "frozen") {
        setFrozenNotice(true);
        router.refresh();
      } else {
        setLimitNotice(limitMessage);
        router.refresh();
      }
      return;
    }
    if (!anyFailed) setItems([]);
    router.refresh();
  }

  async function startBatch(files: File[]) {
    if (queue && files.length <= OPTIMISTIC_TILE_MAX) {
      await startTileBatch(files);
    } else {
      await startListBatch(files);
    }
  }

  function onFilesSelected(files: File[]) {
    if (files.length === 0) return;
    if (!limitsExempt && files.length > limits.maxBatch) {
      setLimitNotice(batchLimitMessage);
      return;
    }
    setLimitNotice(null);
    if (hasProfile) {
      void startBatch(files);
    } else {
      askForProfile(files);
    }
  }

  const batchTiles = (queue?.tiles ?? []).filter((tile) =>
    batchTileIds.has(tile.id),
  );
  const tileMode = batchTiles.length > 0;
  const doneCount = tileMode
    ? batchTiles.filter((tile) => tile.status === "done").length
    : items.filter((item) => item.status === "done").length;
  const totalCount = tileMode
    ? batchTiles.filter((tile) => tile.status !== "cancelled").length
    : items.length;
  const failedCount = items.filter(
    (item) => item.status === "error" || item.status === "too-large",
  ).length;

  return (
    <div
      className={
        variant === "floating"
          ? "pointer-events-none sticky bottom-6 flex w-full flex-col items-center gap-3 px-4"
          : "flex w-full flex-col items-center gap-3"
      }
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="hidden"
        onChange={(event) => {
          onFilesSelected(Array.from(event.target.files ?? []));
          event.target.value = "";
        }}
      />

      {items.length > 0 && (
        <ul className="pointer-events-auto flex w-full max-w-md flex-col gap-1.5 rounded-bar bg-card/95 p-4 shadow-floating backdrop-blur-sm">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 text-xs text-ink/70">
              <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
              {item.status === "error" ? (
                <span className="shrink-0 text-danger">{labels.fileFailed}</span>
              ) : item.status === "too-large" ? (
                <span className="shrink-0 text-danger">
                  {labels.fileTooLarge.replace(
                    "{max}",
                    String(Math.round(limits.maxFileBytes / (1024 * 1024))),
                  )}
                </span>
              ) : item.status === "done" ? (
                <span className="shrink-0 text-gold-small">✓</span>
              ) : (
                <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-sand">
                  <span
                    className="block h-full rounded-full bg-gold transition-[width]"
                    style={{ width: `${item.percent}%` }}
                  />
                </span>
              )}
            </li>
          ))}
        </ul>
      )}

      {!batchActive && failedCount > 0 && (
        <p className="pointer-events-auto rounded-pill bg-card/95 px-4 py-2 text-sm text-danger shadow-floating">
          {labels.someFailed}
        </p>
      )}

      {frozenNotice && (
        <p className="pointer-events-auto rounded-pill bg-card/95 px-4 py-2 text-sm text-ink/70 shadow-floating">
          {labels.frozen}
        </p>
      )}

      {limitNotice && (
        <p className="pointer-events-auto rounded-pill bg-card/95 px-4 py-2 text-sm text-danger shadow-floating">
          {limitNotice}
        </p>
      )}

      <button
        type="button"
        disabled={batchActive}
        onClick={() => inputRef.current?.click()}
        className={`pointer-events-auto flex items-center gap-[9px] rounded-pill bg-gold text-base font-medium text-card transition hover:bg-gold-small disabled:opacity-60 ${
          variant === "floating"
            ? "px-7 py-4 shadow-floating"
            : "px-[30px] py-4 shadow-[0_12px_26px_-12px_rgb(176_141_60/0.9)]"
        }`}
      >
        {variant === "floating" && !batchActive && (
          <span className="text-xl leading-none">+</span>
        )}
        <span>
          {batchActive
            ? labels.uploading
                .replace("{done}", String(doneCount))
                .replace("{total}", String(totalCount))
            : labels.add}
        </span>
      </button>

      {dialogOpen && (
        <IntroSheet
          labels={sheetLabels}
          locale={locale}
          fileCount={pendingFiles.length}
          onSaved={() => {
            setHasProfile(true);
            setDialogOpen(false);
            const files = pendingFiles;
            setPendingFiles([]);
            void startBatch(files);
          }}
          onCancel={() => {
            setDialogOpen(false);
            setPendingFiles([]);
          }}
        />
      )}
    </div>
  );
}
