"use client";

import { useState } from "react";
import { useServerAction } from "@/app/photo-controls";
import type { Visibility } from "@/lib/uploader-profile";

export type PickerLabels = {
  defaultLabel: string;
  visibilityPublic: string;
  visibilityPrivate: string;
  actionFailed: string;
};

export function DefaultVisibilityPicker({
  value,
  labels,
}: {
  value: Visibility;
  labels: PickerLabels;
}) {
  const [selected, setSelected] = useState<Visibility>(value);
  const { failed, run } = useServerAction();

  async function change(visibility: Visibility) {
    const previous = selected;
    setSelected(visibility);
    const saved = await run(() =>
      fetch("/api/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ defaultVisibility: visibility }),
      }),
    );
    if (!saved) setSelected(previous);
  }

  return (
    <fieldset className="flex flex-col gap-2 rounded-2xl bg-pearl/60 px-5 py-4">
      <legend className="float-left mb-2 text-sm font-medium text-ink">
        {labels.defaultLabel}
      </legend>
      {(
        [
          ["public", labels.visibilityPublic],
          ["private", labels.visibilityPrivate],
        ] as const
      ).map(([visibility, label]) => (
        <label key={visibility} className="flex items-center gap-2 text-sm text-ink">
          <input
            type="radio"
            name="defaultVisibility"
            value={visibility}
            checked={selected === visibility}
            onChange={() => void change(visibility)}
            className="accent-gold-deep"
          />
          {label}
        </label>
      ))}
      {failed && <p className="text-sm text-red-600">{labels.actionFailed}</p>}
    </fieldset>
  );
}
