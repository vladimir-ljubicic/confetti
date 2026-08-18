import "server-only";
import { galleryImageUrl, originalDownloadUrl } from "./photo-urls";
import type { SortMode } from "./sort-mode";
import { supabaseAdmin } from "./supabase-server";

const GALLERY_PAGE_SIZE = 200;

type PublicPhotoRow = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  size_bytes: number;
  uploaded_at: string;
  uploaders: { display_name: string | null; public_id: string } | null;
};

export type PublicPhoto = {
  id: string;
  uploadedAt: string;
  imageUrl: string | null;
  downloadUrl: string | null;
  uploader: { displayName: string; publicId: string } | null;
};

export async function loadPublicPhotos({
  sort,
  uploaderId,
}: {
  sort: SortMode;
  uploaderId?: string;
}): Promise<PublicPhoto[]> {
  let query = supabaseAdmin()
    .from("photos")
    .select(
      "id, storage_path, thumbnail_path, original_filename, size_bytes, uploaded_at, uploaders (display_name, public_id)",
    )
    .eq("visibility", "public")
    .not("uploaded_at", "is", null)
    .is("deleted_at", null);
  if (uploaderId) query = query.eq("uploader_id", uploaderId);
  query =
    sort === "chrono"
      ? query.order("effective_taken_at", { ascending: true })
      : query.order("uploaded_at", { ascending: false });
  const { data, error } = await query.limit(GALLERY_PAGE_SIZE);
  if (error) throw new Error(`Loading gallery failed: ${error.message}`);
  return Promise.all(
    (data as unknown as PublicPhotoRow[]).map(async (photo) => ({
      id: photo.id,
      uploadedAt: photo.uploaded_at,
      imageUrl: await galleryImageUrl(photo),
      downloadUrl: await originalDownloadUrl(photo),
      uploader: photo.uploaders?.display_name
        ? {
            displayName: photo.uploaders.display_name,
            publicId: photo.uploaders.public_id,
          }
        : null,
    })),
  );
}
