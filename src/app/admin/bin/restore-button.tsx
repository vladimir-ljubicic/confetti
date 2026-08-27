"use client";

import { useServerAction } from "@/app/photo-controls";

export function RestoreButton({
  photoId,
  labels,
}: {
  photoId: string;
  labels: { restore: string; actionFailed: string };
}) {
  const { busy, failed, run } = useServerAction();

  function restore() {
    void run(() => fetch(`/api/admin/photos/${photoId}/restore`, { method: "POST" }));
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={restore}
        className="text-xs text-gold-small transition hover:underline disabled:opacity-60"
      >
        {labels.restore}
      </button>
      {failed && <p className="text-xs text-red-600">{labels.actionFailed}</p>}
    </div>
  );
}
