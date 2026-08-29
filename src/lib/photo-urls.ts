import { unstable_cache } from "next/cache";
import { PHOTOS_BUCKET } from "./env";
import {
  GALLERY_URL_TTL_SECONDS,
  GALLERY_URL_WINDOW_SECONDS,
  signingWindow,
} from "./photo-url-window";
import { supabaseAdmin } from "./supabase-server";

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
// URL byte-identical across requests within one signing window. Signing
// failures throw so they are never cached; callers map them back to null.
const cachedSignedUrl = unstable_cache(
  // The window is never read: it is an argument so that it lands in the cache
  // key, which `unstable_cache` builds from the arguments. See `signingWindow`.
  async (path: string, _window: number, options?: SignOptions): Promise<string> => {
    const url = await signedUrl(path, options);
    if (url === null) throw new Error(`Signing ${path} failed`);
    return url;
  },
  ["gallery-signed-url"],
  { revalidate: GALLERY_URL_WINDOW_SECONDS },
);

async function stableSignedUrl(
  path: string,
  options?: SignOptions,
): Promise<string | null> {
  try {
    return await cachedSignedUrl(path, signingWindow(Date.now()), options);
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
