export type SortMode = "latest" | "popular";

export function resolveSortMode(param: string | undefined): SortMode {
  if (param === "latest" || param === "popular") return param;
  return "latest";
}

// What a sort orders by. Every sort ends on the id so its key is unique and the
// order is total.
export type SortablePhoto = {
  id: string;
  uploadedAt: string;
  likeCount: number;
};

// Mirrors the order the database applies, so re-sorting an already-loaded
// gallery lands on the same sequence the server would have returned. Like
// counts are the ones the photos arrived with: ordering by the live count
// would make a tile jump out from under the finger that liked it.
export function comparePhotos(
  sort: SortMode,
): (a: SortablePhoto, b: SortablePhoto) => number {
  return (a, b) => {
    if (sort === "popular" && a.likeCount !== b.likeCount) {
      return b.likeCount - a.likeCount;
    }
    const byTime = Date.parse(b.uploadedAt) - Date.parse(a.uploadedAt);
    if (byTime !== 0) return byTime;
    return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
  };
}

// Below this many likes across the photos an order would rearrange, popular
// and latest come out all but identical and the toggle reads as broken.
const SORT_TOGGLE_MIN_LIKES = 10;

export function sumLikes(photos: { likeCount: number }[]): number {
  return photos.reduce((total, photo) => total + photo.likeCount, 0);
}

export function sortToggleShown(likeTotal: number): boolean {
  return likeTotal >= SORT_TOGGLE_MIN_LIKES;
}
