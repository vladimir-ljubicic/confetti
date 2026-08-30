import type { SortMode } from "./sort-mode";

// What one load of gallery rows spans, and what a screen wants to show: the
// whole gallery or one guest's photos, in one of the gallery's orders.
export type GalleryScope = {
  // The guest's public id, or null for the whole gallery.
  guestId: string | null;
  sort: SortMode;
};

// Whether the server-rendered head can already show the requested view, or the
// grid must wait for the background fetch of the whole gallery: a gallery-wide
// head is a prefix of one order only, while a guest-scoped head is that
// guest's complete set and so re-orderable locally.
export function headCoversView(head: GalleryScope, view: GalleryScope): boolean {
  if (head.guestId === null) return view.sort === head.sort;
  return view.guestId === head.guestId;
}
