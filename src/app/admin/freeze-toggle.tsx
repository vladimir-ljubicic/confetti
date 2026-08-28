"use client";

import { useState } from "react";
import { useServerAction } from "@/app/photo-controls";

export type FreezeToggleLabels = {
  title: string;
  open: string;
  frozen: string;
  eventDate: string;
  freezeAfterDays: string;
  actionFailed: string;
};

export function FreezeToggle({
  frozen,
  eventDateIso,
  freezeOffsetDays,
  labels,
}: {
  frozen: boolean;
  eventDateIso: string;
  freezeOffsetDays: number;
  labels: FreezeToggleLabels;
}) {
  const { busy, failed, run } = useServerAction();
  const [date, setDate] = useState(eventDateIso);
  const [offset, setOffset] = useState(String(freezeOffsetDays));

  function save(patch: object) {
    void run(() =>
      fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      }),
    );
  }

  function setFrozen(next: boolean) {
    if (next === frozen || busy) return;
    save({ uploadsFrozen: next });
  }

  function commitDate(value: string) {
    setDate(value);
    if (busy || value === eventDateIso) return;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return;
    save({ eventDate: value });
  }

  function commitOffset() {
    const parsed = Number(offset);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setOffset(String(freezeOffsetDays));
      return;
    }
    if (busy || parsed === freezeOffsetDays) return;
    save({ freezeOffsetDays: parsed });
  }

  const segments: { value: boolean; label: string }[] = [
    { value: false, label: labels.open },
    { value: true, label: labels.frozen },
  ];

  const fieldClass =
    "rounded-[9px] border border-ink/12 bg-sand px-2 py-1.5 text-[13px] text-ink disabled:opacity-60";

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
              onClick={() => setFrozen(segment.value)}
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
      <div className="mt-1.5 flex items-center gap-3 border-t border-ink/8 pt-2.5 pb-1">
        <label className="flex min-w-0 flex-1 items-center justify-between gap-2 text-meta text-ink/60">
          <span className="truncate">{labels.eventDate}</span>
          <input
            type="date"
            value={date}
            disabled={busy}
            onChange={(event) => commitDate(event.target.value)}
            className={fieldClass}
          />
        </label>
        <label className="flex shrink-0 items-center gap-2 text-meta text-ink/60">
          <span>{labels.freezeAfterDays}</span>
          <input
            type="number"
            min={0}
            step={1}
            inputMode="numeric"
            value={offset}
            disabled={busy}
            onChange={(event) => setOffset(event.target.value)}
            onBlur={commitOffset}
            onKeyDown={(event) => {
              if (event.key === "Enter") event.currentTarget.blur();
            }}
            className={`w-[52px] text-center ${fieldClass}`}
          />
        </label>
      </div>
      {failed && <p className="pt-1 text-xs text-danger">{labels.actionFailed}</p>}
    </div>
  );
}
