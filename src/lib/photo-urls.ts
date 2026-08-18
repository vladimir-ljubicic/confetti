import { env, PHOTOS_BUCKET } from "./env";
import { imageSource } from "./image-source";
import { supabaseAdmin } from "./supabase-server";

const GALLERY_URL_TTL_SECONDS = 60 * 60;

export type PhotoForUrl = {
  storage_path: string;
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

// Signed URL for rendering in the gallery: an image transform (JPEG/WebP out,
// required for HEIC to render in Chrome/Firefox) when enabled, the signed
// original otherwise.
export async function galleryImageUrl(photo: PhotoForUrl): Promise<string | null> {
  const source = imageSource({
    sizeBytes: photo.size_bytes,
    transformsEnabled: env.imageTransformsEnabled(),
  });
  return signedUrl(
    photo.storage_path,
    source.kind === "transform"
      ? { transform: { width: 800, resize: "contain" } }
      : undefined,
  );
}

// Signed URL that downloads the untouched original (EXIF intact).
export async function originalDownloadUrl(photo: PhotoForUrl): Promise<string | null> {
  return signedUrl(photo.storage_path, { download: photo.original_filename });
}
