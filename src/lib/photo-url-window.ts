// How long a signed rendering URL keeps working, and so how long a photo can
// still be rendered after its access was withdrawn.
export const GALLERY_URL_TTL_SECONDS = 60 * 15;

// How long the same signed URL is handed to every request for a photo.
export const GALLERY_URL_WINDOW_SECONDS = 60 * 5;

// How long a browser may reuse the redirect from `/api/photos/[id]/thumb`
// without asking again.
export const THUMB_MAX_AGE_SECONDS = 60 * 5;

// The window `nowMs` falls in. Signing is cached under this rather than by age
// alone, which bounds how old a URL can be when it is handed over: a cache
// entry expiring by age is still served to the request that finds it expired,
// and only replaced for the one after, so age alone bounds nothing. A URL is
// therefore at most a window old on arrival and then sits in a browser's
// redirect cache for up to THUMB_MAX_AGE_SECONDS; both have to fit inside
// GALLERY_URL_TTL_SECONDS, or a browser follows a cached redirect to a token
// that has already expired and the photo does not render.
export function signingWindow(nowMs: number): number {
  return Math.floor(nowMs / (GALLERY_URL_WINDOW_SECONDS * 1000));
}
