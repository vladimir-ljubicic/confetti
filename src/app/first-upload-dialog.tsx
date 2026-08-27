"use client";

import { useState } from "react";
import { DISPLAY_NAME_MAX_LENGTH, type Visibility } from "@/lib/uploader-profile";

export type FirstUploadDialogLabels = {
  title: string;
  nameLabel: string;
  nameHint: string;
  visibilityLabel: string;
  visibilityPublic: string;
  visibilityPrivate: string;
  submit: string;
  cancel: string;
  saveFailed: string;
};

export function FirstUploadDialog({
  labels,
  onSaved,
  onCancel,
}: {
  labels: FirstUploadDialogLabels;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [visibility, setVisibility] = useState<Visibility>("public");
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setFailed(false);
    try {
      const response = await fetch("/api/profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ displayName: name.trim(), defaultVisibility: visibility }),
      });
      if (!response.ok) throw new Error(`Saving profile failed (${response.status})`);
      onSaved();
    } catch (error) {
      console.error("Saving profile failed", error);
      setFailed(true);
      setSaving(false);
    }
  }

  return (
    <div className="pointer-events-auto fixed inset-0 z-50 flex items-center justify-center bg-ink/40 px-4">
      <form
        onSubmit={save}
        className="flex w-full max-w-sm flex-col gap-5 rounded-2xl bg-white p-6 shadow-lg"
      >
        <h2 className="font-serif text-2xl text-gold-small">{labels.title}</h2>

        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium text-ink">{labels.nameLabel}</span>
          <input
            autoFocus
            type="text"
            value={name}
            maxLength={DISPLAY_NAME_MAX_LENGTH}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-ink/20 px-3 py-2 outline-none focus:border-gold"
          />
          <span className="text-xs text-ink/50">{labels.nameHint}</span>
        </label>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-medium text-ink">{labels.visibilityLabel}</legend>
          {(
            [
              ["public", labels.visibilityPublic],
              ["private", labels.visibilityPrivate],
            ] as const
          ).map(([value, label]) => (
            <label key={value} className="flex items-center gap-2 text-sm text-ink">
              <input
                type="radio"
                name="visibility"
                value={value}
                checked={visibility === value}
                onChange={() => setVisibility(value)}
                className="accent-gold-small"
              />
              {label}
            </label>
          ))}
        </fieldset>

        {failed && <p className="text-sm text-red-600">{labels.saveFailed}</p>}

        <div className="flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-full px-4 py-2 text-sm text-ink/60 transition hover:text-ink"
          >
            {labels.cancel}
          </button>
          <button
            type="submit"
            disabled={name.trim().length === 0 || saving}
            className="rounded-full bg-gold px-6 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-gold-small disabled:opacity-60"
          >
            {labels.submit}
          </button>
        </div>
      </form>
    </div>
  );
}
