import type { SyntheticEvent } from "react";
import { RENDITIONS_BUCKET } from "@/lib/env";
import { thumbnailPath } from "@/lib/storage-path";

export function thumbSrc(photoId: string): string {
  return `/api/photos/${photoId}/thumb`;
}

// Objects in the renditions bucket serve straight from the storage CDN.
export function publicRenditionUrl(path: string): string {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${RENDITIONS_BUCKET}/${path}`;
}

// Public photos render straight from the storage CDN: the URL derives from
// the photo id alone, so no request touches our API.
export function publicThumbSrc(photoId: string): string {
  return publicRenditionUrl(thumbnailPath(photoId));
}

// A photo can stop being viewable while the page holding it stays open — it is
// deleted, or made private — and the route then 404s. Hiding the element leaves
// the tile's own background instead of a broken-image glyph.
export function hideBrokenImage(event: SyntheticEvent<HTMLImageElement>): void {
  event.currentTarget.style.visibility = "hidden";
}
