"use client";

import { useServerAction } from "@/app/photo-controls";

export type FreezeToggleLabels = {
  title: string;
  open: string;
  frozen: string;
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

  function set(next: boolean) {
    if (next === frozen || busy) return;
    void run(() =>
      fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uploadsFrozen: next }),
      }),
    );
  }

  const segments: { value: boolean; label: string }[] = [
    { value: false, label: labels.open },
    { value: true, label: labels.frozen },
  ];

  return (
    <div className="flex flex-col rounded-t-card border border-ink/10 bg-card px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink">{labels.title}</span>
        <div className="flex shrink-0 items-center rounded-pill bg-sand p-[3px] text-meta">
          {segments.map((segment) => (
            <button
              key={segment.label}
              type="button"
              aria-pressed={frozen === segment.value}
              disabled={busy}
              onClick={() => set(segment.value)}
              className={`rounded-pill px-3 py-2 transition disabled:opacity-60 ${
                frozen === segment.value
                  ? "bg-gold-small text-card"
                  : "text-ink/55 hover:text-ink active:text-ink"
              }`}
            >
              {segment.label}
            </button>
          ))}
        </div>
      </div>
      {failed && <p className="pt-1 text-xs text-danger">{labels.actionFailed}</p>}
    </div>
  );
}
