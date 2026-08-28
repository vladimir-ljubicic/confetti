"use client";

import { useState } from "react";
import { useServerAction } from "@/app/photo-controls";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/uploader-profile";
import { GuestAvatar } from "../guest-avatar";
import type { GuestRowLabels } from "../guest-row";

export function GuestHeader({
  publicId,
  name,
  countsLine,
  labels,
}: {
  publicId: string;
  name: string;
  countsLine: string;
  labels: GuestRowLabels;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(name);
  const { busy, failed, run } = useServerAction();

  async function save(event: React.FormEvent) {
    event.preventDefault();
    const saved = await run(() =>
      fetch(`/api/admin/uploaders/${publicId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: value }),
      }),
    );
    if (saved) setEditing(false);
  }

  return (
    <div className="flex items-center gap-[13px] px-5 pt-[18px] pb-4">
      <GuestAvatar name={name} size={52} />
      {editing ? (
        <form onSubmit={save} className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex min-w-0 items-center gap-2">
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Escape") setEditing(false);
              }}
              required
              maxLength={DISPLAY_NAME_MAX_LENGTH}
              autoFocus
              aria-label={labels.rename}
              className="w-full min-w-0 flex-1 rounded-[10px] border border-gold bg-paper px-3 py-[11px] text-[15px] text-ink outline-none"
            />
            <button
              type="submit"
              disabled={busy}
              className="flex h-11 shrink-0 items-center rounded-pill bg-gold-small px-3.5 text-[13px] whitespace-nowrap text-card transition active:bg-gold-deep disabled:opacity-60"
            >
              {labels.renameSave}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setEditing(false)}
              aria-label={labels.renameCancel}
              className="flex h-11 w-8 shrink-0 items-center justify-center text-[15px] text-ink/45 transition hover:text-ink active:text-ink disabled:opacity-60"
            >
              ✕
            </button>
          </div>
          {failed && <p className="text-xs text-danger">{labels.actionFailed}</p>}
        </form>
      ) : (
        <>
          <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
            <h1 className="truncate font-serif text-[28px] leading-[1.1] font-medium text-gold-small">
              {name}
            </h1>
            <span className="text-[13px] whitespace-nowrap text-ink/60">
              {countsLine}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setValue(name);
              setEditing(true);
            }}
            className="flex min-h-11 shrink-0 items-center rounded-pill border border-ink/16 bg-card px-3.5 text-[13px] whitespace-nowrap text-gold-small transition hover:border-ink/30 active:border-ink/40"
          >
            {labels.rename}
          </button>
        </>
      )}
    </div>
  );
}
