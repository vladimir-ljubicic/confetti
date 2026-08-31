// Where the slide being watched sits after its photo list changes: the same
// photo found by id, or — when that photo is gone — the same place, clamped
// to the new list.
export function anchoredIndex<T extends { id: string }>(
  previous: T[],
  index: number,
  next: T[],
): number {
  const anchor = previous[Math.min(index, previous.length - 1)];
  if (anchor !== undefined) {
    const found = next.findIndex((photo) => photo.id === anchor.id);
    if (found >= 0) return found;
  }
  return Math.max(Math.min(index, next.length - 1), 0);
}
