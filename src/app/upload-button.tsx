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

// Fixed by Supabase's resumable upload endpoint; other sizes are rejected.
const CHUNK_SIZE = 6 * 1024 * 1024;
const CONCURRENT_UPLOADS = 3;

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

// The server refuses to sign uploads for devices without a saved profile;
// the client reacts by (re)opening the intro sheet.
class ProfileRequiredError extends Error {}

// The admin froze uploads; remaining files are dropped and a notice is shown.
class UploadsFrozenError extends Error {}

class FileTooLargeError extends Error {}

// The device hit an upload limit; remaining files are dropped and a notice
// names the limit that was hit.
class RateLimitedError extends Error {
  constructor(public reason: RateLimitReason) {
    super();
  }
}

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
): Promise<void> {
  const takenAt = await extractTakenAt(file);
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
    upload.start();
  });

  if (thumbnailUpload) await thumbnailUpload;
  const complete = await fetch(`/api/uploads/${photoId}/complete`, { method: "POST" });
  if (!complete.ok) throw new Error(`Completing upload failed (${complete.status})`);
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
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasProfile, setHasProfile] = useState(!needsProfile);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [batchActive, setBatchActive] = useState(false);
  const [frozenNotice, setFrozenNotice] = useState(false);
  const [limitNotice, setLimitNotice] = useState<string | null>(null);

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

  async function startBatch(files: File[]) {
    const batch: UploadItem[] = files.map((file, index) => ({
      id: index,
      file,
      status: "pending",
      percent: 0,
    }));
    setItems(batch);
    setBatchActive(true);
    setFrozenNotice(false);
    setLimitNotice(null);

    const queue = [...batch];
    const retryFiles: File[] = [];
    let abort: "profile" | "frozen" | "limit" | null = null;
    let limitMessage = labels.rateLimited;
    let anyFailed = false;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENT_UPLOADS, queue.length) }, async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
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

  const doneCount = items.filter((item) => item.status === "done").length;
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
                .replace("{total}", String(items.length))
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
