import { env, PHOTOS_BUCKET } from "./env";
import { GALLERY_IMAGE_WIDTH, imageSource } from "./image-source";
import { supabaseAdmin } from "./supabase-server";

const GALLERY_URL_TTL_SECONDS = 60 * 60;

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

// Signed rendering URLs for a batch of photos, in input order. Plain paths
// are signed in a single storage request; transform URLs cannot be batched
// and are signed per photo.
export async function galleryImageUrls(
  photos: PhotoForUrl[],
): Promise<(string | null)[]> {
  const plainPaths = photos
    .filter((photo) => gallerySource(photo).kind !== "transform")
    .map(galleryPath);
  const signedByPath = new Map<string, string>();
  if (plainPaths.length > 0) {
    const { data, error } = await supabaseAdmin()
      .storage.from(PHOTOS_BUCKET)
      .createSignedUrls(plainPaths, GALLERY_URL_TTL_SECONDS);
    if (error) throw new Error(`Signing gallery URLs failed: ${error.message}`);
    for (const entry of data) {
      if (entry.signedUrl && entry.path) signedByPath.set(entry.path, entry.signedUrl);
    }
  }
  return Promise.all(
    photos.map(async (photo) =>
      gallerySource(photo).kind === "transform"
        ? signedUrl(photo.storage_path, {
            transform: { width: GALLERY_IMAGE_WIDTH, resize: "contain" },
          })
        : (signedByPath.get(galleryPath(photo)) ?? null),
    ),
  );
}

// Signed URL that downloads the untouched original (EXIF intact).
export async function originalDownloadUrl(photo: PhotoForUrl): Promise<string | null> {
  return signedUrl(photo.storage_path, { download: photo.original_filename });
}
