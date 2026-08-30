import "server-only";
import { galleryCursorFilter, type GalleryCursor } from "./gallery-cursor";
import { GALLERY_HEAD_PHOTOS } from "./grid-window";
import type { SortMode } from "./sort-mode";
import { supabaseAdmin } from "./supabase-server";

// A safety valve, not a design ceiling: the client is built to hold the whole
// gallery, and this only stops a runaway one from taking the page down. A
// gallery near this size would need a different design.
const GALLERY_MAX_PHOTOS = 10_000;

// Rows per database round trip. PostgREST caps a single response, so the full
// gallery is walked by cursor in pages that stay under any such cap.
const GALLERY_PAGE = 1000;

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
// free. Paged so no response cap can silently truncate below the gallery cap,
// above which no id can be asked for.
export async function loadViewerLikes(
  viewerDeviceId: string | null,
): Promise<Set<string>> {
  if (!viewerDeviceId) return new Set();
  const ids = new Set<string>();
  for (let from = 0; ids.size < GALLERY_MAX_PHOTOS; from += GALLERY_PAGE) {
    const { data, error } = await supabaseAdmin()
      .from("likes")
      .select("photo_id")
      .eq("device_id", viewerDeviceId)
      .order("photo_id")
      .range(from, from + GALLERY_PAGE - 1);
    if (error) throw new Error(`Loading likes failed: ${error.message}`);
    const rows = data as { photo_id: string }[];
    for (const row of rows) ids.add(row.photo_id);
    if (rows.length < GALLERY_PAGE) break;
  }
  return ids;
}

// Whether the gallery holds any public photo at all. A guest-scoped load that
// comes back empty cannot tell an empty guest from an empty gallery, and the
// two get different screens.
export async function hasPublicPhotos(): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select("id")
    .eq("visibility", "public")
    .not("uploaded_at", "is", null)
    .is("deleted_at", null)
    .limit(1);
  if (error) throw new Error(`Loading gallery failed: ${error.message}`);
  return (data as unknown[]).length > 0;
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

async function fetchPublicRows(
  sort: SortMode,
  limit: number,
  after: GalleryCursor | null,
  uploaderId: string | null,
): Promise<PublicPhotoRow[]> {
  let query = supabaseAdmin()
    .from("photos")
    .select(
      "id, original_filename, uploaded_at, like_count, image_width, image_height, uploader_id, uploaders (display_name, public_id)",
    )
    .eq("visibility", "public")
    .not("uploaded_at", "is", null)
    .is("deleted_at", null);
  if (uploaderId !== null) query = query.eq("uploader_id", uploaderId);
  if (after !== null) query = query.or(galleryCursorFilter(sort, after));
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
  const { data, error } = await query.limit(limit);
  if (error) throw new Error(`Loading gallery failed: ${error.message}`);
  return data as unknown as PublicPhotoRow[];
}

async function fetchAllPublicRows(
  sort: SortMode,
  uploaderId: string | null,
): Promise<PublicPhotoRow[]> {
  const rows: PublicPhotoRow[] = [];
  let after: GalleryCursor | null = null;
  while (rows.length < GALLERY_MAX_PHOTOS) {
    const size = Math.min(GALLERY_PAGE, GALLERY_MAX_PHOTOS - rows.length);
    const page = await fetchPublicRows(sort, size, after, uploaderId);
    rows.push(...page);
    if (page.length < size) break;
    const last = page[page.length - 1];
    after = {
      likeCount: last.like_count,
      uploadedAt: last.uploaded_at,
      id: last.id,
    };
  }
  return rows;
}

export async function loadPublicPhotos({
  sort,
  viewerDeviceId = null,
  head = false,
  uploaderId = null,
}: {
  // The order the rows come back in. The client re-sorts from here without
  // asking again, so this only has to be right for the first paint.
  sort: SortMode;
  viewerDeviceId?: string | null;
  // First screen only: the tiles the server renders before the client fetches
  // the whole gallery in the background.
  head?: boolean;
  // One guest's gallery instead of the whole one. A guest's public set is
  // small, so it comes back complete — `head` does not apply.
  uploaderId?: string | null;
}): Promise<PublicPhoto[]> {
  const rows =
    uploaderId !== null
      ? await fetchAllPublicRows(sort, uploaderId)
      : head
        ? await fetchPublicRows(sort, GALLERY_HEAD_PHOTOS, null, null)
        : await fetchAllPublicRows(sort, null);
  const [viewerLikes, uploaderStats] = await Promise.all([
    loadViewerLikes(viewerDeviceId),
    loadPublicUploaderStats([
      ...new Set(rows.flatMap((row) => row.uploader_id ?? [])),
    ]),
  ]);
  return rows.map((photo) => ({
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
  }));
}
