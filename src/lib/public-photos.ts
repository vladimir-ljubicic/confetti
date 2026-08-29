import "server-only";
import type { SortMode } from "./sort-mode";
import { supabaseAdmin } from "./supabase-server";

// The gallery is handed over whole so that ordering and per-guest filtering
// happen on the client, with no round trip. A gallery this far past a wedding's
// worth of photos would need a different design; the cap only stops one from
// taking the page down while it gets one.
const GALLERY_MAX_PHOTOS = 2000;

type PublicPhotoRow = {
  id: string;
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
  // Public photos in the gallery, which exceeds the photos handed over only
  // once the cap is hit. It rides along with the rows at no extra round trip.
  totalCount: number;
};

export type PublicPhoto = {
  id: string;
  uploadedAt: string;
  // Pixel size of the rendered image, so a tile can reserve its height before
  // the image arrives; null when it was never recorded.
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

// Every photo this device has liked, not just the ones on screen. Narrowing to
// the screen's ids would put them all in the request URL, which stops working
// a few hundred ids in; the caller only asks `has(id)`, so the extra ids are
// free. The limit matches the gallery cap, above which no id can be asked for.
export async function loadViewerLikes(
  viewerDeviceId: string | null,
): Promise<Set<string>> {
  if (!viewerDeviceId) return new Set();
  const { data, error } = await supabaseAdmin()
    .from("likes")
    .select("photo_id")
    .eq("device_id", viewerDeviceId)
    .limit(GALLERY_MAX_PHOTOS);
  if (error) throw new Error(`Loading likes failed: ${error.message}`);
  return new Set((data as { photo_id: string }[]).map((row) => row.photo_id));
}

export type PublicPhotoStats = { photoCount: number; likeTotal: number };

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

export async function loadPublicPhotos({
  sort,
  viewerDeviceId = null,
}: {
  // The order the gallery is handed over in. The client re-sorts from here
  // without asking again, so this only has to be right for the first paint.
  sort: SortMode;
  viewerDeviceId?: string | null;
}): Promise<PublicPhotoPage> {
  let query = supabaseAdmin()
    .from("photos")
    .select(
      "id, original_filename, uploaded_at, like_count, image_width, image_height, uploader_id, uploaders (display_name, public_id)",
      { count: "exact" },
    )
    .eq("visibility", "public")
    .not("uploaded_at", "is", null)
    .is("deleted_at", null);
  // Every sort ends on the id so its key is unique, matching `comparePhotos`.
  query =
    sort === "popular"
      ? query
          .order("like_count", { ascending: false })
          .order("uploaded_at", { ascending: false })
          .order("id", { ascending: false })
      : query
          .order("uploaded_at", { ascending: false })
          .order("id", { ascending: false });
  const { data, count, error } = await query.limit(GALLERY_MAX_PHOTOS);
  if (error) throw new Error(`Loading gallery failed: ${error.message}`);
  const rows = data as unknown as PublicPhotoRow[];
  const [viewerLikes, uploaderStats] = await Promise.all([
    loadViewerLikes(viewerDeviceId),
    loadPublicUploaderStats([
      ...new Set(rows.flatMap((row) => row.uploader_id ?? [])),
    ]),
  ]);
  return {
    photos: rows.map((photo) => ({
      id: photo.id,
      uploadedAt: photo.uploaded_at,
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
    totalCount: count ?? rows.length,
  };
}
