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
import { estimateRemainingMs, formatEta } from "@/lib/upload-eta";
import type { UploadTicket } from "@/lib/upload-ticket";
import { pluralize, type Locale } from "@/lib/i18n";
import { IntroSheet, type IntroSheetLabels } from "./intro-sheet";
import { BulkMiniBar, BulkSummary, RejectedCard } from "./upload-minibar";
import { useUploadQueue } from "./upload-queue";

// Fixed by Supabase's resumable upload endpoint; other sizes are rejected.
const CHUNK_SIZE = 6 * 1024 * 1024;
const CONCURRENT_UPLOADS = 3;
// Larger batches use the bulk mini-bar; per-photo tiles would be noise.
const OPTIMISTIC_TILE_MAX = 10;
const CANCELLED_TILE_TTL_MS = 4000;
const BULK_REFRESH_EVERY = 10;
const BULK_TICK_MS = 1000;
// Too little data for a stable rate before this.
const BULK_ETA_WARMUP_MS = 3000;
const SUMMARY_TTL_MS = 6000;
// Longer when failures remain, so the retry pill can still be reached.
const SUMMARY_FAILED_TTL_MS = 30000;

type UploadLabels = {
  add: string;
  uploading: string;
  frozen: string;
  batchLimit: string;
  rateLimited: string;
  retry: string;
  cancel: string;
  bulkProgress: string;
  bulkEtaMinutes: string;
  bulkEtaUnderMinute: string;
  bulkHint: string;
  bulkDoneOne: string;
  bulkDoneFew: string;
  bulkDoneMany: string;
  bulkFailedOne: string;
  bulkFailedFew: string;
  bulkFailedMany: string;
  rejectedOne: string;
  rejectedFew: string;
  rejectedMany: string;
  rejectedTooLargeOne: string;
  rejectedTooLargeFew: string;
  rejectedTooLargeMany: string;
  skip: string;
};

type UploadLimitProps = {
  maxBatch: number;
  maxFileBytes: number;
};

type TileItem = { id: number; file: File };

type TileController = {
  cancelled: boolean;
  done: boolean;
  abortTus: (() => void) | null;
  removeTimer: number | null;
};

type BulkView =
  | {
      phase: "uploading";
      current: number;
      total: number;
      fraction: number;
      etaMs: number | null;
      previewUrl: string | null;
    }
  | { phase: "summary"; done: number; failedCount: number };

type RejectedView = {
  count: number;
  previewUrl: string | null;
  uploaded: number;
};

type BulkRun = {
  cancelled: boolean;
  aborts: Map<number, () => void>;
  uploadedBytes: Map<number, number>;
  inFlight: { id: number; url: string }[];
  notifyCancel: () => void;
};

// The server refuses to sign uploads for devices without a saved profile;
// the client reacts by (re)opening the intro sheet.
class ProfileRequiredError extends Error {}

// The admin froze uploads; remaining files are dropped and a notice is shown.
class UploadsFrozenError extends Error {}

class FileTooLargeError extends Error {}

class UploadCancelledError extends Error {}

// The device is offline; the item goes back into the queue and waits for the
// connection to return.
class OfflineError extends Error {}

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
  const [batchActive, setBatchActive] = useState(false);
  const [batchTileIds, setBatchTileIds] = useState<Set<number>>(new Set());
  const [bulkView, setBulkView] = useState<BulkView | null>(null);
  const [frozenNotice, setFrozenNotice] = useState(false);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);
  const [rejectedView, setRejectedView] = useState<RejectedView | null>(null);
  const tileIdRef = useRef(0);
  const controllers = useRef(new Map<number, TileController>());
  const bulkRunRef = useRef<BulkRun | null>(null);
  const bulkFailedRef = useRef<File[]>([]);
  const rejectedRef = useRef<{ file: File; previewUrl: string }[]>([]);
  const summaryTimerRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  const batchLimitMessage = labels.batchLimit.replace(
    "{max}",
    String(limits.maxBatch),
  );
  const maxFileMb = Math.round(limits.maxFileBytes / (1024 * 1024));

  function waitForOnline(): Promise<void> {
    if (queue) return queue.waitForOnline();
    if (navigator.onLine) return Promise.resolve();
    return new Promise((resolve) =>
      window.addEventListener("online", () => resolve(), { once: true }),
    );
  }

  function recordRejection(file: File) {
    rejectedRef.current.push({ file, previewUrl: URL.createObjectURL(file) });
  }

  function showRejected(uploaded: number) {
    const rejected = rejectedRef.current;
    if (rejected.length === 0) return;
    setRejectedView({
      count: rejected.length,
      previewUrl: rejected[0].previewUrl,
      uploaded,
    });
  }

  function clearRejected() {
    for (const entry of rejectedRef.current) {
      URL.revokeObjectURL(entry.previewUrl);
    }
    rejectedRef.current = [];
    setRejectedView(null);
  }

  function retryRejected() {
    const files = rejectedRef.current.map((entry) => entry.file);
    clearRejected();
    void startBatch(files);
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
      throw new FileTooLargeError();
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
        error instanceof RateLimitedError ||
        error instanceof FileTooLargeError
      ) {
        throw error;
      }
      if (!navigator.onLine) {
        queue?.patchTile(item.id, { status: "queued", percent: 0 });
        throw new OfflineError();
      }
      console.error("Upload failed", error);
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
      if (error instanceof OfflineError) {
        await waitForOnline();
        return retryTile(item);
      }
      dropTile(item.id);
      if (error instanceof FileTooLargeError) {
        recordRejection(item.file);
        showRejected(0);
      } else if (error instanceof ProfileRequiredError) {
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
    setBatchActive(true);
    setFrozenNotice(false);
    setLimitNotice(null);

    const pending = [...tileItems];
    const retryFiles: File[] = [];
    let abort: "profile" | "frozen" | "limit" | null = null;
    let limitMessage = labels.rateLimited;
    let uploaded = 0;
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
            if (controllers.current.get(item.id)?.done) uploaded += 1;
          } catch (error) {
            if (error instanceof OfflineError) {
              pending.push(item);
              await waitForOnline();
              continue;
            }
            dropTile(item.id);
            if (error instanceof FileTooLargeError) {
              recordRejection(item.file);
            } else if (error instanceof ProfileRequiredError) {
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
    showRejected(uploaded);
    if (abort === "profile") {
      askForProfile(retryFiles);
      return;
    }
    if (abort === "frozen") setFrozenNotice(true);
    if (abort === "limit") setLimitNotice(limitMessage);
    router.refresh();
  }

  async function acquireWakeLock() {
    if (!("wakeLock" in navigator)) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
    } catch {
      wakeLockRef.current = null;
    }
  }

  async function releaseWakeLock() {
    const sentinel = wakeLockRef.current;
    wakeLockRef.current = null;
    if (sentinel) await sentinel.release().catch(() => {});
  }

  function cancelBulk() {
    const run = bulkRunRef.current;
    if (!run) return;
    run.cancelled = true;
    for (const abortTus of run.aborts.values()) abortTus();
    run.aborts.clear();
    run.notifyCancel();
  }

  function retryBulkFailures() {
    if (summaryTimerRef.current) {
      window.clearTimeout(summaryTimerRef.current);
      summaryTimerRef.current = null;
    }
    const files = bulkFailedRef.current;
    if (files.length === 0) {
      setBulkView(null);
      return;
    }
    void startBulkBatch(files);
  }

  async function startBulkBatch(files: File[]) {
    if (summaryTimerRef.current) {
      window.clearTimeout(summaryTimerRef.current);
      summaryTimerRef.current = null;
    }
    let notifyCancel: () => void = () => {};
    // Workers waiting out an offline stretch must also wake on cancel, or the
    // batch could never finish.
    const cancelSignal = new Promise<void>((resolve) => {
      notifyCancel = resolve;
    });
    const run: BulkRun = {
      cancelled: false,
      aborts: new Map(),
      uploadedBytes: new Map(),
      inFlight: [],
      notifyCancel,
    };
    bulkRunRef.current = run;
    bulkFailedRef.current = [];
    setBatchActive(true);
    setFrozenNotice(false);
    setLimitNotice(null);

    const total = files.length;
    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    const startedAt = Date.now();
    let done = 0;
    let sinceRefresh = 0;

    setBulkView({
      phase: "uploading",
      current: 1,
      total,
      fraction: 0,
      etaMs: null,
      previewUrl: null,
    });

    const patchUploading = (patch: Partial<Extract<BulkView, { phase: "uploading" }>>) =>
      setBulkView((view) =>
        view && view.phase === "uploading" ? { ...view, ...patch } : view,
      );

    const sumUploadedBytes = () => {
      let sum = 0;
      for (const bytes of run.uploadedBytes.values()) sum += bytes;
      return sum;
    };

    const syncPreview = () =>
      patchUploading({ previewUrl: run.inFlight[0]?.url ?? null });

    const ticker = window.setInterval(() => {
      if (run.cancelled) return;
      const bytes = sumUploadedBytes();
      const elapsed = Date.now() - startedAt;
      patchUploading({
        fraction: totalBytes > 0 ? bytes / totalBytes : 0,
        etaMs:
          elapsed >= BULK_ETA_WARMUP_MS
            ? estimateRemainingMs(bytes, totalBytes, elapsed)
            : null,
      });
    }, BULK_TICK_MS);

    // Mobile browsers kill uploads when the tab backgrounds; tus resumption
    // only helps if the guest returns. The lock is auto-released on tab
    // switch, hence the re-acquire on visibilitychange.
    void acquireWakeLock();
    const reacquireWakeLock = () => {
      if (document.visibilityState === "visible" && bulkRunRef.current === run) {
        void acquireWakeLock();
      }
    };
    document.addEventListener("visibilitychange", reacquireWakeLock);

    const pending: TileItem[] = files.map((file, index) => ({ id: index, file }));
    const retryFiles: File[] = [];
    let abort: "profile" | "frozen" | "limit" | null = null;
    let limitMessage = labels.rateLimited;
    let offlineWaiting = 0;
    const syncWaiting = () =>
      queue?.setBulkWaiting(pending.length + offlineWaiting);
    try {
      await Promise.all(
        Array.from({ length: Math.min(CONCURRENT_UPLOADS, pending.length) }, async () => {
          for (let item = pending.shift(); item; item = pending.shift()) {
            if (run.cancelled) continue;
            if (abort) {
              if (abort === "profile") retryFiles.push(item.file);
              continue;
            }
            if (!limitsExempt && item.file.size > limits.maxFileBytes) {
              recordRejection(item.file);
              continue;
            }
            let requeue = false;
            run.inFlight.push({ id: item.id, url: URL.createObjectURL(item.file) });
            syncPreview();
            try {
              await uploadFile(
                item.file,
                total,
                (percent) =>
                  run.uploadedBytes.set(item.id, (percent / 100) * item.file.size),
                {
                  isCancelled: () => run.cancelled,
                  onTusStart: (abortTus) => run.aborts.set(item.id, abortTus),
                },
              );
              run.uploadedBytes.set(item.id, item.file.size);
              done += 1;
              sinceRefresh += 1;
              patchUploading({ current: Math.min(done + 1, total) });
              if (sinceRefresh >= BULK_REFRESH_EVERY) {
                sinceRefresh = 0;
                router.refresh();
              }
            } catch (error) {
              run.uploadedBytes.delete(item.id);
              if (error instanceof UploadCancelledError || run.cancelled) {
                // Cancelled files are neither done nor failed.
              } else if (error instanceof ProfileRequiredError) {
                abort = "profile";
                retryFiles.push(item.file);
              } else if (error instanceof UploadsFrozenError) {
                abort = "frozen";
              } else if (error instanceof RateLimitedError) {
                abort = "limit";
                limitMessage =
                  error.reason === "batch" ? batchLimitMessage : labels.rateLimited;
              } else if (error instanceof FileTooLargeError) {
                recordRejection(item.file);
              } else if (!navigator.onLine) {
                requeue = true;
              } else {
                console.error("Upload failed", error);
                bulkFailedRef.current.push(item.file);
              }
            } finally {
              run.aborts.delete(item.id);
              const index = run.inFlight.findIndex((entry) => entry.id === item.id);
              if (index >= 0) {
                URL.revokeObjectURL(run.inFlight[index].url);
                run.inFlight.splice(index, 1);
              }
              syncPreview();
            }
            if (requeue) {
              pending.push(item);
              offlineWaiting += 1;
              syncWaiting();
              await Promise.race([waitForOnline(), cancelSignal]);
              offlineWaiting -= 1;
              syncWaiting();
            }
          }
        }),
      );
    } finally {
      window.clearInterval(ticker);
      document.removeEventListener("visibilitychange", reacquireWakeLock);
      await releaseWakeLock();
      bulkRunRef.current = null;
      queue?.setBulkWaiting(0);
      setBatchActive(false);
    }

    if (abort === "profile") {
      setBulkView(null);
      showRejected(done);
      askForProfile(retryFiles);
      return;
    }
    router.refresh();
    showRejected(done);
    if (abort === "frozen") {
      setBulkView(null);
      setFrozenNotice(true);
      return;
    }
    if (abort === "limit") {
      setBulkView(null);
      setLimitNotice(limitMessage);
      return;
    }
    if (run.cancelled) {
      setBulkView(null);
      return;
    }

    const failedCount = bulkFailedRef.current.length;
    // The rejected card carries the success count itself; a summary next to
    // it would duplicate it. Retryable failures still need the summary.
    if (rejectedRef.current.length > 0 && failedCount === 0) {
      setBulkView(null);
      return;
    }
    setBulkView({ phase: "summary", done, failedCount });
    summaryTimerRef.current = window.setTimeout(
      () => setBulkView(null),
      failedCount > 0 ? SUMMARY_FAILED_TTL_MS : SUMMARY_TTL_MS,
    );
  }

  async function startBatch(files: File[]) {
    if (queue && files.length <= OPTIMISTIC_TILE_MAX) {
      await startTileBatch(files);
    } else {
      await startBulkBatch(files);
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
  const doneCount = batchTiles.filter((tile) => tile.status === "done").length;
  const totalCount = batchTiles.filter(
    (tile) => tile.status !== "cancelled",
  ).length;

  return (
    <div
      className={
        variant === "floating"
          ? `pointer-events-none sticky flex w-full flex-col items-center gap-3 px-3 ${
              bulkView ? "bottom-4" : "bottom-6"
            }`
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

      {bulkView?.phase === "uploading" && (
        <BulkMiniBar
          progressLabel={labels.bulkProgress
            .replace("{done}", String(bulkView.current))
            .replace("{total}", String(bulkView.total))}
          etaLabel={
            bulkView.etaMs !== null
              ? formatEta(bulkView.etaMs, {
                  minutes: labels.bulkEtaMinutes,
                  underMinute: labels.bulkEtaUnderMinute,
                })
              : null
          }
          hintLabel={labels.bulkHint}
          cancelLabel={labels.cancel}
          fraction={bulkView.fraction}
          previewUrl={bulkView.previewUrl}
          onCancel={cancelBulk}
        />
      )}

      {bulkView?.phase === "summary" && (
        <BulkSummary
          doneLabel={pluralize(locale, bulkView.done, {
            one: labels.bulkDoneOne,
            few: labels.bulkDoneFew,
            many: labels.bulkDoneMany,
          })}
          failedLabel={
            bulkView.failedCount > 0
              ? pluralize(locale, bulkView.failedCount, {
                  one: labels.bulkFailedOne,
                  few: labels.bulkFailedFew,
                  many: labels.bulkFailedMany,
                })
              : null
          }
          retryLabel={labels.retry}
          onRetry={bulkView.failedCount > 0 ? retryBulkFailures : null}
        />
      )}

      {rejectedView && (
        <RejectedCard
          previewUrl={rejectedView.previewUrl}
          titleLabel={pluralize(locale, rejectedView.count, {
            one: labels.rejectedOne,
            few: labels.rejectedFew,
            many: labels.rejectedMany,
          })}
          detailLabel={[
            pluralize(locale, rejectedView.count, {
              one: labels.rejectedTooLargeOne,
              few: labels.rejectedTooLargeFew,
              many: labels.rejectedTooLargeMany,
            }).replace("{max}", String(maxFileMb)),
            ...(rejectedView.uploaded > 0
              ? [
                  pluralize(locale, rejectedView.uploaded, {
                    one: labels.bulkDoneOne,
                    few: labels.bulkDoneFew,
                    many: labels.bulkDoneMany,
                  }),
                ]
              : []),
          ].join(" · ")}
          retryLabel={labels.retry}
          skipLabel={labels.skip}
          onRetry={retryRejected}
          onSkip={clearRejected}
        />
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

      {!bulkView && (
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
      )}

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
