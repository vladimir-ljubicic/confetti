import { unstable_cache } from "next/cache";
import { PHOTOS_BUCKET } from "./env";
import { supabaseAdmin } from "./supabase-server";

// URLs are cached for half their signed lifetime, so a served URL always has
// at least half the TTL left. The TTL also bounds how long a signed URL keeps
// working after a photo is deleted or hidden.
const GALLERY_URL_TTL_SECONDS = 60 * 60 * 2;
const GALLERY_URL_CACHE_SECONDS = GALLERY_URL_TTL_SECONDS / 2;

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

// Signing costs one request per call, and a page of tiles asks for a whole
// grid's worth at once. Paths raised in the same tick are signed together;
// paths already in the cache below never get here.
type PendingSign = { path: string; settle: (url: string | null) => void };

let pendingSigns: PendingSign[] = [];

async function flushSigns(): Promise<void> {
  const batch = pendingSigns;
  pendingSigns = [];
  try {
    const { data, error } = await supabaseAdmin()
      .storage.from(PHOTOS_BUCKET)
      .createSignedUrls(
        batch.map((sign) => sign.path),
        GALLERY_URL_TTL_SECONDS,
      );
    if (error) throw error;
    const urls = new Map(
      data.map((row) => [row.path, row.error ? null : row.signedUrl]),
    );
    for (const sign of batch) sign.settle(urls.get(sign.path) ?? null);
  } catch {
    for (const sign of batch) sign.settle(null);
  }
}

function batchSignedUrl(path: string): Promise<string | null> {
  return new Promise((settle) => {
    if (pendingSigns.length === 0) setTimeout(() => void flushSigns(), 0);
    pendingSigns.push({ path, settle });
  });
}

// Re-signing mints a different token for the same photo, and a changed URL
// makes browsers re-download an image they already have. Caching keeps the
// URL byte-identical across renders within the cache window. Signing
// failures throw so they are never cached; callers map them back to null.
const cachedSignedUrl = unstable_cache(
  async (path: string, options?: SignOptions): Promise<string> => {
    const url = options ? await signedUrl(path, options) : await batchSignedUrl(path);
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
