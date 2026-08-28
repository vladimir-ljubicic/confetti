import { unstable_cache } from "next/cache";
import { env, PHOTOS_BUCKET } from "./env";
import { GALLERY_IMAGE_WIDTH, imageSource } from "./image-source";
import { supabaseAdmin } from "./supabase-server";

// URLs are cached for half their signed lifetime, so a served URL always has
// at least half the TTL left. The TTL also bounds how long a signed URL keeps
// working after a photo is deleted or hidden.
const GALLERY_URL_TTL_SECONDS = 60 * 60 * 2;
const GALLERY_URL_CACHE_SECONDS = GALLERY_URL_TTL_SECONDS / 2;

export type PhotoForUrl = {
  storage_path: string;
  thumbnail_path: string | null;
  size_bytes: number;
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
// URL byte-identical across renders within the cache window. Signing
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

// The rendering source for a photo: an image transform (JPEG/WebP out,
// required for HEIC to render in Chrome/Firefox) when enabled, the
// client-generated thumbnail for files above the transform source limit, the
// signed original otherwise.
function gallerySource(photo: PhotoForUrl) {
  return imageSource({
    sizeBytes: photo.size_bytes,
    transformsEnabled: env.imageTransformsEnabled(),
    hasThumbnail: photo.thumbnail_path !== null,
  });
}

function galleryPath(photo: PhotoForUrl): string {
  return gallerySource(photo).kind === "thumbnail" && photo.thumbnail_path
    ? photo.thumbnail_path
    : photo.storage_path;
}

// Signed rendering URLs for a batch of photos, in input order.
export async function galleryImageUrls(
  photos: PhotoForUrl[],
): Promise<(string | null)[]> {
  return Promise.all(
    photos.map((photo) =>
      gallerySource(photo).kind === "transform"
        ? stableSignedUrl(photo.storage_path, {
            transform: { width: GALLERY_IMAGE_WIDTH, resize: "contain" },
          })
        : stableSignedUrl(galleryPath(photo)),
    ),
  );
}

// Signed URL that downloads the untouched original (EXIF intact). Signed
// fresh per request: downloads are one-shot, so URL stability buys nothing.
export async function originalDownloadUrl(photo: PhotoForUrl): Promise<string | null> {
  return signedUrl(photo.storage_path, { download: photo.original_filename });
}
