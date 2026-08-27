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
    <div className="flex shrink-0 flex-col items-center gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={restore}
        className="flex h-11 min-w-[78px] items-center justify-center rounded-pill bg-gold-small px-3.5 text-[13px] text-card transition disabled:opacity-60"
      >
        {labels.restore}
      </button>
      {failed && <p className="text-xs text-danger">{labels.actionFailed}</p>}
    </div>
  );
}
