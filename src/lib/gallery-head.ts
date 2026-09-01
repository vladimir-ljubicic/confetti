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

// A fetch of the whole gallery, remembering the head as rendered when it
// began — the same head means the fetch is the fresher of the two.
export type FullGallery<T> = { photos: T[]; head: T[] };

// The gallery the grid shows: the server-rendered head until the full set
// lands. A fetch begun against the current head postdates everything in it
// and is the whole truth — photos it no longer holds are gone. A head
// re-rendered since the fetch began (a photo just uploaded or deleted) is
// the fresher one instead, so where both hold a photo the head's copy wins.
export function mergeGallery<T extends { id: string }>(
  head: T[],
  full: FullGallery<T> | null,
): T[] {
  if (full === null) return head;
  if (full.head === head) return full.photos;
  const seen = new Set<string>();
  const merged: T[] = [];
  for (const photo of [...head, ...full.photos]) {
    if (seen.has(photo.id)) continue;
    seen.add(photo.id);
    merged.push(photo);
  }
  return merged;
}

// The ids the grid may show once the guest lets in the photos one pill
// announced: what it was already showing, plus those alone — a pill speaks for
// the gallery it hangs over, and photos outside that gallery keep waiting for
// a pill of their own. Nothing is admitted while `admitted` is null, where the
// grid is still showing everything and holds nothing back.
export function admitPhotos<T extends { id: string }>(
  admitted: ReadonlySet<string> | null,
  photos: T[],
): ReadonlySet<string> | null {
  if (admitted === null) return null;
  const next = new Set(admitted);
  for (const photo of photos) next.add(photo.id);
  return next;
}

// The gallery split into what the grid may show and what waits behind the
// "new photos" pill. A photo the grid has already admitted stays, carrying
// whatever fresher like count and place the gallery now gives it, and the
// guest's own upload enters the moment it appears; every other photo arriving
// after the gallery has settled is held back rather than inserted under a
// scroll. Nothing is held while `admitted` is null: the gallery is still
// arriving, and all of it is what the guest opened.
export function holdNewPhotos<T extends { id: string; ownedByViewer: boolean }>(
  gallery: T[],
  admitted: ReadonlySet<string> | null,
): { shown: T[]; held: T[] } {
  if (admitted === null) return { shown: gallery, held: [] };
  const shown: T[] = [];
  const held: T[] = [];
  for (const photo of gallery) {
    if (admitted.has(photo.id) || photo.ownedByViewer) shown.push(photo);
    else held.push(photo);
  }
  return { shown, held };
}
