"use client";

import { useServerAction } from "@/app/photo-controls";

export type GuestSettingsLabels = {
  uploadsTitle: string;
  uploadsHint: string;
  allow: string;
  block: string;
  hideAll: string;
  actionFailed: string;
};

export function GuestSettings({
  publicId,
  blocked,
  publicCount,
  labels,
}: {
  publicId: string;
  blocked: boolean;
  publicCount: number;
  labels: GuestSettingsLabels;
}) {
  const uploads = useServerAction();
  const hideAll = useServerAction();

  function setBlocked(next: boolean) {
    if (next === blocked || uploads.busy) return;
    void uploads.run(() =>
      fetch(`/api/admin/uploaders/${publicId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ uploadsBlocked: next }),
      }),
    );
  }

  const segments: { value: boolean; label: string }[] = [
    { value: false, label: labels.allow },
    { value: true, label: labels.block },
  ];

  return (
    <div className="sticky bottom-0 mt-auto flex flex-col gap-0.5 bg-paper-alt px-3.5 pt-4 pb-[22px]">
      <div className="flex flex-col rounded-t-card border border-ink/10 bg-card px-4 py-2.5">
        <div className="flex items-center justify-between gap-3">
          <span className="flex min-w-0 flex-col gap-0.5">
            <span className="text-sm text-ink">{labels.uploadsTitle}</span>
            <span className="text-meta text-ink/60">{labels.uploadsHint}</span>
          </span>
          <div className="flex shrink-0 items-center rounded-pill bg-sand p-[3px] text-meta">
            {segments.map((segment) => (
              <button
                key={segment.label}
                type="button"
                aria-pressed={blocked === segment.value}
                disabled={uploads.busy}
                onClick={() => setBlocked(segment.value)}
                className={`rounded-pill px-3 py-2 transition disabled:opacity-60 ${
                  blocked === segment.value
                    ? "bg-gold-small text-card"
                    : "text-ink/55 hover:text-ink active:text-ink"
                }`}
              >
                {segment.label}
              </button>
            ))}
          </div>
        </div>
        {uploads.failed && (
          <p className="pt-1 text-xs text-danger">{labels.actionFailed}</p>
        )}
      </div>
      <div className="flex flex-col rounded-b-card border border-ink/10 bg-card">
        <button
          type="button"
          disabled={hideAll.busy || publicCount === 0}
          onClick={() =>
            void hideAll.run(() =>
              fetch(`/api/admin/uploaders/${publicId}/hide-all`, { method: "POST" }),
            )
          }
          className="flex items-center justify-between gap-3 px-4 py-[15px] text-left transition disabled:opacity-60"
        >
          <span className="text-sm text-ink">{labels.hideAll}</span>
          <span className="text-[13px] whitespace-nowrap text-ink/60">
            {publicCount} →
          </span>
        </button>
        {hideAll.failed && (
          <p className="px-4 pb-2 text-xs text-danger">{labels.actionFailed}</p>
        )}
      </div>
    </div>
  );
}
