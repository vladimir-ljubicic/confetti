import "server-only";
import { galleryImageUrls } from "./photo-urls";
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
  likeCount: number;
  likedByViewer: boolean;
  ownedByViewer: boolean;
  uploader: { displayName: string; publicId: string; photoCount: number } | null;
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

// Public photo count per uploader id, across the whole gallery (not just the
// current page of rows).
export async function loadPublicUploaderPhotoCounts(): Promise<
  Map<string, number>
> {
  const { data, error } = await supabaseAdmin().rpc(
    "public_uploader_photo_counts",
  );
  if (error)
    throw new Error(`Counting uploader photos failed: ${error.message}`);
  const rows = data as { uploader_id: string; photo_count: number }[];
  return new Map(rows.map((row) => [row.uploader_id, Number(row.photo_count)]));
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
  const [viewerLikes, uploaderCounts, imageUrls] = await Promise.all([
    loadViewerLikes(
      viewerDeviceId,
      rows.map((row) => row.id),
    ),
    loadPublicUploaderPhotoCounts(),
    galleryImageUrls(rows),
  ]);
  return rows.map((photo, index) => ({
    id: photo.id,
    uploadedAt: photo.uploaded_at,
    imageUrl: imageUrls[index],
    likeCount: photo.like_count,
    likedByViewer: viewerLikes.has(photo.id),
    ownedByViewer:
      viewerDeviceId !== null && photo.uploader_id === viewerDeviceId,
    uploader: photo.uploaders?.display_name
      ? {
          displayName: photo.uploaders.display_name,
          publicId: photo.uploaders.public_id,
          photoCount: uploaderCounts.get(photo.uploader_id ?? "") ?? 0,
        }
      : null,
  }));
}
