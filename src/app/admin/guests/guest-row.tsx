"use client";

import Link from "next/link";
import { useState } from "react";
import { useServerAction } from "@/app/photo-controls";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/uploader-profile";
import { GuestAvatar } from "./guest-avatar";

export type GuestRowLabels = {
  rename: string;
  renameSave: string;
  renameCancel: string;
  actionFailed: string;
};

export function GuestRow({
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

  if (!editing) {
    return (
      <li className="relative flex items-center gap-3 rounded-card border-[1.5px] border-transparent bg-card px-3.5 py-3">
        <Link
          href={`/admin/guests/${publicId}`}
          aria-label={name}
          className="absolute inset-0 rounded-card"
        />
        <GuestAvatar name={name} size={40} />
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="truncate text-[15px] text-ink">{name}</span>
          <span className="text-meta whitespace-nowrap text-ink-muted">{countsLine}</span>
        </span>
        <button
          type="button"
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
          className="relative z-10 flex h-11 shrink-0 items-center rounded-pill border border-ink/16 px-[13px] text-[13px] whitespace-nowrap text-gold-small transition hover:border-ink/30 active:border-ink/40"
        >
          {labels.rename}
        </button>
        <span aria-hidden className="text-[15px] text-ink-muted">
          ›
        </span>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-3 rounded-card border-[1.5px] border-gold bg-card px-3.5 py-3">
      <GuestAvatar name={name} size={40} />
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
            className="flex h-11 shrink-0 items-center rounded-pill bg-gold-small px-3.5 text-[13px] whitespace-nowrap text-card transition disabled:opacity-60"
          >
            {labels.renameSave}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(false)}
            aria-label={labels.renameCancel}
            className="flex h-11 w-8 shrink-0 items-center justify-center text-[15px] text-ink-muted transition hover:text-ink active:text-ink disabled:opacity-60"
          >
            ✕
          </button>
        </div>
        {failed && <p className="text-xs text-danger">{labels.actionFailed}</p>}
      </form>
    </li>
  );
}
