import type { SyntheticEvent } from "react";

export function thumbSrc(photoId: string): string {
  return `/api/photos/${photoId}/thumb`;
}

// A photo can stop being viewable while the page holding it stays open — it is
// deleted, or made private — and the route then 404s. Hiding the element leaves
// the tile's own background instead of a broken-image glyph.
export function hideBrokenImage(event: SyntheticEvent<HTMLImageElement>): void {
  event.currentTarget.style.visibility = "hidden";
}
