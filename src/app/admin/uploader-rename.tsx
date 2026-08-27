"use client";

import { useState } from "react";
import { useServerAction } from "@/app/photo-controls";
import { DISPLAY_NAME_MAX_LENGTH } from "@/lib/uploader-profile";

export type RenameLabels = {
  rename: string;
  renameSave: string;
  renameCancel: string;
  actionFailed: string;
};

export function UploaderRename({
  publicId,
  name,
  labels,
}: {
  publicId: string;
  name: string;
  labels: RenameLabels;
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
      <span className="flex items-center gap-2">
        <span className="font-medium text-ink">{name}</span>
        <button
          type="button"
          onClick={() => {
            setValue(name);
            setEditing(true);
          }}
          className="text-xs text-gold-small transition hover:underline"
        >
          {labels.rename}
        </button>
      </span>
    );
  }

  return (
    <form onSubmit={save} className="flex flex-wrap items-center gap-2">
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        required
        maxLength={DISPLAY_NAME_MAX_LENGTH}
        autoFocus
        className="rounded-lg border border-ink/20 bg-white px-2 py-1 text-sm outline-none focus:border-gold-small"
      />
      <button
        type="submit"
        disabled={busy}
        className="text-xs text-gold-small transition hover:underline disabled:opacity-60"
      >
        {labels.renameSave}
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => setEditing(false)}
        className="text-xs text-ink/60 transition hover:underline disabled:opacity-60"
      >
        {labels.renameCancel}
      </button>
      {failed && <p className="text-xs text-red-600">{labels.actionFailed}</p>}
    </form>
  );
}
