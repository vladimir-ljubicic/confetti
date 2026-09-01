"use client";

import { useState } from "react";
import { useServerAction } from "@/app/photo-controls";
import { Segmented } from "@/app/segmented";

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
    if (busy) return;
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
    "no-native-chrome h-11 rounded-card border border-ink/16 bg-card px-3 text-base text-ink caret-gold outline-none focus:border-gold focus:bg-paper disabled:opacity-60";

  return (
    <div className="flex flex-col rounded-t-card border border-ink/10 bg-card px-4 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm text-ink">{labels.title}</span>
        <Segmented segments={segments} value={frozen} onChange={setFrozen} disabled={busy} />
      </div>
      <div className="mt-1.5 flex flex-col gap-2 border-t border-ink/8 pt-2.5 pb-1">
        <label className="flex items-center justify-between gap-3 text-body text-ink-muted">
          <span className="min-w-0 truncate">{labels.eventDate}</span>
          <input
            type="date"
            value={date}
            disabled={busy}
            onChange={(event) => commitDate(event.target.value)}
            className={`w-[140px] shrink-0 ${fieldClass}`}
          />
        </label>
        <label className="flex items-center justify-between gap-3 text-body text-ink-muted">
          <span className="min-w-0 truncate">{labels.freezeAfterDays}</span>
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
            className={`w-[72px] shrink-0 text-center ${fieldClass}`}
          />
        </label>
      </div>
      {failed && <p className="pt-1 text-xs text-danger">{labels.actionFailed}</p>}
    </div>
  );
}
