"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Visibility } from "@/lib/uploader-profile";

export type PhotoControlLabels = {
  privateBadge: string;
  makePublic: string;
  makePrivate: string;
  delete: string;
  confirmDelete: string;
  actionFailed: string;
};

export function useServerAction() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  async function run(request: () => Promise<Response>): Promise<boolean> {
    setBusy(true);
    setFailed(false);
    const response = await request().catch(() => null);
    if (!response?.ok) {
      setBusy(false);
      setFailed(true);
      return false;
    }
    router.refresh();
    setBusy(false);
    return true;
  }

  return { busy, failed, run };
}

export function PhotoControls({
  photoId,
  visibility,
  labels,
}: {
  photoId: string;
  visibility: Visibility;
  labels: PhotoControlLabels;
}) {
  const { busy, failed, run } = useServerAction();

  function toggleVisibility() {
    void run(() =>
      fetch(`/api/photos/${photoId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          visibility: visibility === "public" ? "private" : "public",
        }),
      }),
    );
  }

  function remove() {
    if (!window.confirm(labels.confirmDelete)) return;
    void run(() => fetch(`/api/photos/${photoId}`, { method: "DELETE" }));
  }

  return (
    <div className="flex flex-col gap-1 px-2 py-2">
      {visibility === "private" && (
        <span className="absolute top-2 left-2 rounded-full bg-ink/70 px-2 py-0.5 text-[10px] tracking-wide text-white uppercase">
          {labels.privateBadge}
        </span>
      )}
      <div className="flex items-center justify-between gap-2 text-xs">
        <button
          type="button"
          disabled={busy}
          onClick={toggleVisibility}
          className="text-gold-deep transition hover:underline disabled:opacity-60"
        >
          {visibility === "public" ? labels.makePrivate : labels.makePublic}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={remove}
          className="text-red-600 transition hover:underline disabled:opacity-60"
        >
          {labels.delete}
        </button>
      </div>
      {failed && <p className="text-xs text-red-600">{labels.actionFailed}</p>}
    </div>
  );
}
