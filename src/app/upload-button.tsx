"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import * as tus from "tus-js-client";

// Fixed by Supabase's resumable upload endpoint; other sizes are rejected.
const CHUNK_SIZE = 6 * 1024 * 1024;

type UploadState =
  | { phase: "idle" }
  | { phase: "uploading"; percent: number }
  | { phase: "error" };

export function UploadButton({
  labels,
}: {
  labels: { add: string; uploading: string; failed: string };
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>({ phase: "idle" });

  async function uploadFile(file: File) {
    setState({ phase: "uploading", percent: 0 });
    try {
      const response = await fetch("/api/uploads", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          contentType: file.type || "application/octet-stream",
          size: file.size,
        }),
      });
      if (!response.ok) throw new Error(`Upload request failed (${response.status})`);
      const { photoId, path, token, storageUrl } = (await response.json()) as {
        photoId: string;
        path: string;
        token: string;
        storageUrl: string;
      };

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
          onProgress: (sent, total) => {
            setState({ phase: "uploading", percent: Math.round((sent / total) * 100) });
          },
          onError: reject,
          onSuccess: () => resolve(),
        });
        upload.start();
      });

      const complete = await fetch(`/api/uploads/${photoId}/complete`, {
        method: "POST",
      });
      if (!complete.ok) throw new Error(`Completing upload failed (${complete.status})`);

      setState({ phase: "idle" });
      router.refresh();
    } catch (error) {
      console.error("Upload failed", error);
      setState({ phase: "error" });
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void uploadFile(file);
        }}
      />
      <button
        type="button"
        disabled={state.phase === "uploading"}
        onClick={() => inputRef.current?.click()}
        className="rounded-full bg-gold px-8 py-3 font-medium text-white shadow-sm transition hover:bg-gold-deep disabled:opacity-60"
      >
        {state.phase === "uploading"
          ? labels.uploading.replace("{percent}", String(state.percent))
          : labels.add}
      </button>
      {state.phase === "error" && (
        <p className="text-sm text-red-600">{labels.failed}</p>
      )}
    </div>
  );
}
