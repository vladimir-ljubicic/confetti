import type { SyntheticEvent } from "react";
import { RENDITIONS_BUCKET } from "@/lib/env";
import { thumbnailPath, viewerPath } from "@/lib/storage-path";

export function thumbSrc(photoId: string): string {
  return `/api/photos/${photoId}/thumb`;
}

// The 1600px viewer rendition through the signed proxy, for photos that are
// not publicly reachable.
export function viewerSrc(photoId: string): string {
  return `/api/photos/${photoId}/thumb?size=viewer`;
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

export function publicViewerSrc(photoId: string): string {
  return publicRenditionUrl(viewerPath(photoId));
}

// Where a photo's renditions load from: straight from the CDN when they are
// publicly served, else through the signed proxy. A photo with no thumbnail
// (width unset) also goes through the proxy, which falls back to signing its
// original.
export function renditionSrcs(photo: {
  id: string;
  width: number | null;
  visibility?: string;
}): { thumb: string; viewer: string } {
  const fromCdn =
    (photo.visibility ?? "public") === "public" && photo.width !== null;
  return fromCdn
    ? { thumb: publicThumbSrc(photo.id), viewer: publicViewerSrc(photo.id) }
    : { thumb: thumbSrc(photo.id), viewer: viewerSrc(photo.id) };
}

// A photo can stop being viewable while the page holding it stays open — it is
// deleted, or made private — and the route then 404s. Hiding the element leaves
// the tile's own background instead of a broken-image glyph.
export function hideBrokenImage(event: SyntheticEvent<HTMLImageElement>): void {
  event.currentTarget.style.visibility = "hidden";
}
