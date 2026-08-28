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
  like_count: number;
  uploader_id: string | null;
  uploaders: { display_name: string | null; public_id: string } | null;
};

export type PublicPhoto = {
  id: string;
  uploadedAt: string;
  imageUrl: string | null;
  downloadUrl: string | null;
  likeCount: number;
  likedByViewer: boolean;
  ownedByViewer: boolean;
  uploader: { displayName: string; publicId: string } | null;
};

export async function loadViewerLikes(
  viewerDeviceId: string | null,
  photoIds: string[],
): Promise<Set<string>> {
  if (!viewerDeviceId || photoIds.length === 0) return new Set();
  const { data, error } = await supabaseAdmin()
    .from("likes")
    .select("photo_id")
    .eq("device_id", viewerDeviceId)
    .in("photo_id", photoIds);
  if (error) throw new Error(`Loading likes failed: ${error.message}`);
  return new Set((data as { photo_id: string }[]).map((row) => row.photo_id));
}

export type PublicPhotoStats = { photoCount: number; likeTotal: number };

export async function loadPublicPhotoStats(
  uploaderId: string,
): Promise<PublicPhotoStats> {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select("like_count")
    .eq("visibility", "public")
    .eq("uploader_id", uploaderId)
    .not("uploaded_at", "is", null)
    .is("deleted_at", null);
  if (error) throw new Error(`Loading uploader stats failed: ${error.message}`);
  const rows = data as { like_count: number }[];
  return {
    photoCount: rows.length,
    likeTotal: rows.reduce((sum, row) => sum + row.like_count, 0),
  };
}

export async function loadPublicPhotos({
  sort,
  uploaderId,
  viewerDeviceId = null,
}: {
  sort: SortMode;
  uploaderId?: string;
  viewerDeviceId?: string | null;
}): Promise<PublicPhoto[]> {
  let query = supabaseAdmin()
    .from("photos")
    .select(
      "id, storage_path, thumbnail_path, original_filename, size_bytes, uploaded_at, like_count, uploader_id, uploaders (display_name, public_id)",
    )
    .eq("visibility", "public")
    .not("uploaded_at", "is", null)
    .is("deleted_at", null);
  if (uploaderId) query = query.eq("uploader_id", uploaderId);
  query =
    sort === "popular"
      ? query
          .order("like_count", { ascending: false })
          .order("uploaded_at", { ascending: false })
      : query.order("uploaded_at", { ascending: false });
  const { data, error } = await query.limit(GALLERY_PAGE_SIZE);
  if (error) throw new Error(`Loading gallery failed: ${error.message}`);
  const rows = data as unknown as PublicPhotoRow[];
  const viewerLikes = await loadViewerLikes(
    viewerDeviceId,
    rows.map((row) => row.id),
  );
  return Promise.all(
    rows.map(async (photo) => ({
      id: photo.id,
      uploadedAt: photo.uploaded_at,
      imageUrl: await galleryImageUrl(photo),
      downloadUrl: await originalDownloadUrl(photo),
      likeCount: photo.like_count,
      likedByViewer: viewerLikes.has(photo.id),
      ownedByViewer:
        viewerDeviceId !== null && photo.uploader_id === viewerDeviceId,
      uploader: photo.uploaders?.display_name
        ? {
            displayName: photo.uploaders.display_name,
            publicId: photo.uploaders.public_id,
          }
        : null,
    })),
  );
}
