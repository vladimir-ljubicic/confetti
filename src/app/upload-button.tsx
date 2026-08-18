"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import * as tus from "tus-js-client";
import { extractTakenAt } from "@/lib/exif";
import { generateThumbnail } from "@/lib/thumbnail";
import type { UploadTicket } from "@/lib/upload-ticket";
import { FirstUploadDialog, type FirstUploadDialogLabels } from "./first-upload-dialog";

// Fixed by Supabase's resumable upload endpoint; other sizes are rejected.
const CHUNK_SIZE = 6 * 1024 * 1024;
const CONCURRENT_UPLOADS = 3;

type UploadLabels = {
  add: string;
  uploading: string;
  fileFailed: string;
  someFailed: string;
};

type UploadItem = {
  id: number;
  file: File;
  status: "pending" | "uploading" | "done" | "error";
  percent: number;
};

// The server refuses to sign uploads for devices without a saved profile;
// the client reacts by (re)opening the first-upload dialog.
class ProfileRequiredError extends Error {}

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

async function uploadFile(file: File, onProgress: (percent: number) => void): Promise<void> {
  const takenAt = await extractTakenAt(file);
  const response = await fetch("/api/uploads", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      contentType: file.type || "application/octet-stream",
      size: file.size,
      takenAt,
    }),
  });
  if (response.status === 409) throw new ProfileRequiredError();
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
  dialogLabels,
  needsProfile,
}: {
  labels: UploadLabels;
  dialogLabels: FirstUploadDialogLabels;
  needsProfile: boolean;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [hasProfile, setHasProfile] = useState(!needsProfile);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [items, setItems] = useState<UploadItem[]>([]);
  const [batchActive, setBatchActive] = useState(false);

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

    const queue = [...batch];
    const retryFiles: File[] = [];
    let profileRequired = false;
    let anyFailed = false;
    await Promise.all(
      Array.from({ length: Math.min(CONCURRENT_UPLOADS, queue.length) }, async () => {
        for (let item = queue.shift(); item; item = queue.shift()) {
          if (profileRequired) {
            retryFiles.push(item.file);
            continue;
          }
          patchUpload(item.id, { status: "uploading" });
          try {
            await uploadFile(item.file, (percent) => patchUpload(item.id, { percent }));
            patchUpload(item.id, { status: "done", percent: 100 });
          } catch (error) {
            if (error instanceof ProfileRequiredError) {
              profileRequired = true;
              retryFiles.push(item.file);
              patchUpload(item.id, { status: "pending", percent: 0 });
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
    if (profileRequired) {
      setItems([]);
      askForProfile(retryFiles);
      return;
    }
    if (!anyFailed) setItems([]);
    router.refresh();
  }

  function onFilesSelected(files: File[]) {
    if (files.length === 0) return;
    if (hasProfile) {
      void startBatch(files);
    } else {
      askForProfile(files);
    }
  }

  const doneCount = items.filter((item) => item.status === "done").length;
  const failedCount = items.filter((item) => item.status === "error").length;

  return (
    <div className="flex w-full max-w-md flex-col items-center gap-3">
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
      <button
        type="button"
        disabled={batchActive}
        onClick={() => inputRef.current?.click()}
        className="rounded-full bg-gold px-8 py-3 font-medium text-white shadow-sm transition hover:bg-gold-deep disabled:opacity-60"
      >
        {batchActive
          ? labels.uploading
              .replace("{done}", String(doneCount))
              .replace("{total}", String(items.length))
          : labels.add}
      </button>

      {items.length > 0 && (
        <ul className="flex w-full flex-col gap-1.5">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 text-xs text-ink/70">
              <span className="min-w-0 flex-1 truncate">{item.file.name}</span>
              {item.status === "error" ? (
                <span className="shrink-0 text-red-600">{labels.fileFailed}</span>
              ) : item.status === "done" ? (
                <span className="shrink-0 text-gold-deep">✓</span>
              ) : (
                <span className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full bg-pearl">
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
        <p className="text-sm text-red-600">{labels.someFailed}</p>
      )}

      {dialogOpen && (
        <FirstUploadDialog
          labels={dialogLabels}
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
