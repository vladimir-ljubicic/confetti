import type { SortMode } from "./sort-mode";

// How far down each order the guest was standing when they left it, for as
// long as the gallery stays loaded.
export type SortScroll = Partial<Record<SortMode, number>>;

// Switching orders: the order being left keeps the guest's place, and the one
// being entered resumes theirs — its top until they have stood in it, since
// the same distance down the two orders is not the same photos.
export function resumeSort(
  memory: SortScroll,
  from: SortMode,
  to: SortMode,
  scrollY: number,
): { memory: SortScroll; scrollTo: number } {
  return { memory: { ...memory, [from]: scrollY }, scrollTo: memory[to] ?? 0 };
}

// The ways into the latest order that mean its top — the wordmark home, and an
// upload whose photos land at its head. Where the guest last stood there is no
// longer where they want to be, so it goes.
export function restartLatest(
  memory: SortScroll,
  from: SortMode,
  scrollY: number,
): { memory: SortScroll; scrollTo: number } {
  return { memory: { ...memory, [from]: scrollY, latest: 0 }, scrollTo: 0 };
}
