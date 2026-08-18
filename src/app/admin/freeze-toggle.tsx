"use client";

import { useServerAction } from "@/app/photo-controls";

export type FreezeToggleLabels = {
  freeze: string;
  unfreeze: string;
  frozenStatus: string;
  actionFailed: string;
};

export function FreezeToggle({
  frozen,
  labels,
}: {
  frozen: boolean;
  labels: FreezeToggleLabels;
}) {
  const { busy, failed, run } = useServerAction();

  function toggle() {
    void run(() =>
      fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uploadsFrozen: !frozen }),
      }),
    );
  }

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex items-center gap-3">
        {frozen && (
          <span className="rounded-full bg-ink/70 px-3 py-1 text-xs tracking-wide text-white uppercase">
            {labels.frozenStatus}
          </span>
        )}
        <button
          type="button"
          disabled={busy}
          onClick={toggle}
          className="rounded-full border border-gold-deep px-4 py-1.5 text-sm text-gold-deep transition hover:bg-gold-deep hover:text-white disabled:opacity-60"
        >
          {frozen ? labels.unfreeze : labels.freeze}
        </button>
      </div>
      {failed && <p className="text-xs text-red-600">{labels.actionFailed}</p>}
    </div>
  );
}
