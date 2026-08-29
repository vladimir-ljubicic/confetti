import "server-only";
import {
  encodeGalleryCursor,
  galleryCursorFilter,
  type GalleryCursor,
} from "./gallery-cursor";
import { galleryImageUrls } from "./photo-urls";
import type { SortMode } from "./sort-mode";
import { supabaseAdmin } from "./supabase-server";

const GALLERY_PAGE_SIZE = 30;

type PublicPhotoRow = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  uploaded_at: string;
  like_count: number;
  image_width: number | null;
  image_height: number | null;
  uploader_id: string | null;
  uploaders: { display_name: string | null; public_id: string } | null;
};

export type PublicPhotoPage = {
  photos: PublicPhoto[];
  // Opaque key for the next page; null once the gallery is exhausted.
  nextCursor: string | null;
  // Photos matching the query, ignoring the page limit. Only the first page
  // carries it; it rides along with the rows at no extra round trip.
  totalCount: number | null;
  // Totals for the uploader a page is scoped to; null for the whole gallery.
  uploaderStats: PublicPhotoStats | null;
};

export type PublicPhoto = {
  id: string;
  uploadedAt: string;
  imageUrl: string | null;
  // Pixel size of the image at `imageUrl`, so a tile can reserve its height
  // before the image arrives; null when it was never recorded.
  width: number | null;
  height: number | null;
  originalFilename: string;
  likeCount: number;
  likedByViewer: boolean;
  ownedByViewer: boolean;
  uploader: {
    displayName: string;
    publicId: string;
    photoCount: number;
  } | null;
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

const NO_STATS: PublicPhotoStats = { photoCount: 0, likeTotal: 0 };

// Gallery-wide totals for the given uploaders, keyed by uploader id. Aggregated
// in the database and scoped to the ids asked for, so the cost follows the page
// on screen rather than the size of the gallery.
export async function loadPublicUploaderStats(
  uploaderIds: string[],
): Promise<Map<string, PublicPhotoStats>> {
  if (uploaderIds.length === 0) return new Map();
  const { data, error } = await supabaseAdmin().rpc("public_uploader_stats", {
    uploader_ids: uploaderIds,
  });
  if (error) throw new Error(`Loading uploader stats failed: ${error.message}`);
  const rows = data as {
    uploader_id: string;
    photo_count: number;
    like_total: number;
  }[];
  return new Map(
    rows.map((row) => [
      row.uploader_id,
      { photoCount: Number(row.photo_count), likeTotal: Number(row.like_total) },
    ]),
  );
}

export async function loadPublicPhotoStats(
  uploaderId: string,
): Promise<PublicPhotoStats> {
  const stats = await loadPublicUploaderStats([uploaderId]);
  return stats.get(uploaderId) ?? NO_STATS;
}

export async function loadPublicPhotos({
  sort,
  uploaderId,
  viewerDeviceId = null,
  cursor = null,
}: {
  sort: SortMode;
  uploaderId?: string;
  viewerDeviceId?: string | null;
  cursor?: GalleryCursor | null;
}): Promise<PublicPhotoPage> {
  // A cursor page counts only what is left below it, and the count is shown
  // once, on the first page. Scoped to an uploader their stats already carry it.
  const wantsCount = cursor === null && uploaderId === undefined;
  let query = supabaseAdmin()
    .from("photos")
    .select(
      "id, storage_path, thumbnail_path, original_filename, uploaded_at, like_count, image_width, image_height, uploader_id, uploaders (display_name, public_id)",
      wantsCount ? ({ count: "exact" } as const) : undefined,
    )
    .eq("visibility", "public")
    .not("uploaded_at", "is", null)
    .is("deleted_at", null);
  if (uploaderId) query = query.eq("uploader_id", uploaderId);
  if (cursor) query = query.or(galleryCursorFilter(sort, cursor));
  // Every sort ends on the id so its key is unique: without it, rows sharing a
  // timestamp or a like count could straddle a page boundary and be skipped.
  query =
    sort === "popular"
      ? query
          .order("like_count", { ascending: false })
          .order("uploaded_at", { ascending: false })
          .order("id", { ascending: false })
      : query
          .order("uploaded_at", { ascending: false })
          .order("id", { ascending: false });
  const { data, count, error } = await query.limit(GALLERY_PAGE_SIZE);
  if (error) throw new Error(`Loading gallery failed: ${error.message}`);
  const rows = data as unknown as PublicPhotoRow[];
  // Scoped to one uploader every row is theirs, so their stats stand in for
  // the per-uploader lookup and are what the page header shows.
  const statsIds = uploaderId
    ? [uploaderId]
    : [...new Set(rows.flatMap((row) => row.uploader_id ?? []))];
  const [viewerLikes, uploaderStats, imageUrls] = await Promise.all([
    loadViewerLikes(
      viewerDeviceId,
      rows.map((row) => row.id),
    ),
    loadPublicUploaderStats(statsIds),
    galleryImageUrls(rows),
  ]);
  const last = rows.at(-1);
  return {
    photos: rows.map((photo, index) => ({
      id: photo.id,
      uploadedAt: photo.uploaded_at,
      imageUrl: imageUrls[index],
      width: photo.image_width,
      height: photo.image_height,
      originalFilename: photo.original_filename,
      likeCount: photo.like_count,
      likedByViewer: viewerLikes.has(photo.id),
      ownedByViewer:
        viewerDeviceId !== null && photo.uploader_id === viewerDeviceId,
      uploader: photo.uploaders?.display_name
        ? {
            displayName: photo.uploaders.display_name,
            publicId: photo.uploaders.public_id,
            photoCount:
              uploaderStats.get(photo.uploader_id ?? "")?.photoCount ?? 0,
          }
        : null,
    })),
    nextCursor:
      last && rows.length === GALLERY_PAGE_SIZE
        ? encodeGalleryCursor({
            likeCount: last.like_count,
            uploadedAt: last.uploaded_at,
            id: last.id,
          })
        : null,
    totalCount: count ?? null,
    uploaderStats: uploaderId
      ? (uploaderStats.get(uploaderId) ?? NO_STATS)
      : null,
  };
}
