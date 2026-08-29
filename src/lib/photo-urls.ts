import { unstable_cache } from "next/cache";
import { PHOTOS_BUCKET } from "./env";
import { supabaseAdmin } from "./supabase-server";

// A rendering URL reaches the browser inside a redirect the browser may cache
// for THUMB_MAX_AGE_SECONDS, and may itself be up to GALLERY_URL_CACHE_SECONDS
// old when that redirect is served. The TTL has to cover both, or a browser
// follows a cached redirect to a token that has already expired. It also bounds
// how long a signed URL keeps working after a photo is deleted or hidden.
const GALLERY_URL_TTL_SECONDS = 60 * 15;
const GALLERY_URL_CACHE_SECONDS = 60 * 5;

// How long a browser may reuse the redirect from `/api/photos/[id]/thumb`
// without asking again, and so how long a viewer can keep rendering a photo
// whose access was withdrawn.
export const THUMB_MAX_AGE_SECONDS = 60 * 5;

export type PhotoForUrl = {
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string;
};

type SignOptions = Parameters<
  ReturnType<ReturnType<typeof supabaseAdmin>["storage"]["from"]>["createSignedUrl"]
>[2];

async function signedUrl(path: string, options?: SignOptions): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .storage.from(PHOTOS_BUCKET)
    .createSignedUrl(path, GALLERY_URL_TTL_SECONDS, options);
  return error ? null : data.signedUrl;
}

// Re-signing mints a different token for the same photo, and a changed URL
// makes browsers re-download an image they already have. Caching keeps the
// URL byte-identical across requests within the cache window. Signing
// failures throw so they are never cached; callers map them back to null.
const cachedSignedUrl = unstable_cache(
  async (path: string, options?: SignOptions): Promise<string> => {
    const url = await signedUrl(path, options);
    if (url === null) throw new Error(`Signing ${path} failed`);
    return url;
  },
  ["gallery-signed-url"],
  { revalidate: GALLERY_URL_CACHE_SECONDS },
);

async function stableSignedUrl(
  path: string,
  options?: SignOptions,
): Promise<string | null> {
  try {
    return await cachedSignedUrl(path, options);
  } catch {
    return null;
  }
}

// Signed rendering URLs for a batch of photos, in input order. Photos render
// from the thumbnail their uploader's browser generated; the original stands in
// only when that failed, and browsers that cannot decode it will show nothing.
export async function galleryImageUrls(
  photos: PhotoForUrl[],
): Promise<(string | null)[]> {
  return Promise.all(
    photos.map((photo) => stableSignedUrl(photo.thumbnail_path ?? photo.storage_path)),
  );
}

// Signed URL that downloads the untouched original (EXIF intact). Signed
// fresh per request: downloads are one-shot, so URL stability buys nothing.
export async function originalDownloadUrl(photo: PhotoForUrl): Promise<string | null> {
  return signedUrl(photo.storage_path, { download: photo.original_filename });
}
