import type { Visibility } from "./uploader-profile";

// Edits a grid has made on the spot, ahead of the server list catching up.
export type SelectionEdits = {
  removed: ReadonlySet<string>;
  overrides: ReadonlyMap<string, Visibility>;
};

// The photos as the grid should show them once its own edits are applied;
// with a visibility on show, only the photos that still match it.
export function selectionView<T extends { id: string; visibility: Visibility }>(
  photos: readonly T[],
  edits: SelectionEdits,
  visibility?: Visibility,
): T[] {
  const view: T[] = [];
  for (const photo of photos) {
    if (edits.removed.has(photo.id)) continue;
    const override = edits.overrides.get(photo.id);
    const shown = override === undefined ? photo : { ...photo, visibility: override };
    if (visibility !== undefined && shown.visibility !== visibility) continue;
    view.push(shown);
  }
  return view;
}
