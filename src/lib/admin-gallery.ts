import "server-only";
import type { AdminFilter } from "./admin-filter";
import {
  encodeGalleryCursor,
  galleryCursorFilter,
  type GalleryCursor,
} from "./gallery-cursor";
import { galleryImageUrls } from "./photo-urls";
import { loadPublicUploaderStats, type PublicPhoto } from "./public-photos";
import { supabaseAdmin } from "./supabase-server";
import type { Visibility } from "./uploader-profile";
import { isUuid } from "./uploaders";

const ADMIN_PAGE_SIZE = 30;

export type AdminPhoto = PublicPhoto & { visibility: Visibility };

export type AdminPhotoPage = {
  photos: AdminPhoto[];
  nextCursor: string | null;
};

type AdminPhotoRow = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  visibility: Visibility;
  like_count: number;
  uploaded_at: string;
  uploader_id: string;
  uploaders: { display_name: string | null; public_id: string } | null;
};

const EMPTY_PAGE: AdminPhotoPage = { photos: [], nextCursor: null };

export async function loadAdminPhotos({
  filter,
  cursor = null,
}: {
  filter: AdminFilter;
  cursor?: GalleryCursor | null;
}): Promise<AdminPhotoPage> {
  if (filter.kind === "uploader" && !isUuid(filter.publicId)) return EMPTY_PAGE;

  let query = supabaseAdmin()
    .from("photos")
    // The join is inner so that filtering on the uploader narrows the photos
    // rather than blanking the embedded row.
    .select(
      "id, storage_path, thumbnail_path, original_filename, visibility, like_count, uploaded_at, uploader_id, uploaders!inner (display_name, public_id)",
    )
    .not("uploaded_at", "is", null)
    .is("deleted_at", null);
  if (filter.kind === "private") query = query.eq("visibility", "private");
  if (filter.kind === "uploader") {
    query = query.eq("uploaders.public_id", filter.publicId);
  }
  if (cursor) query = query.or(galleryCursorFilter("latest", cursor));
  const { data, error } = await query
    .order("uploaded_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(ADMIN_PAGE_SIZE);
  if (error) throw new Error(`Loading photos failed: ${error.message}`);

  const rows = data as unknown as AdminPhotoRow[];
  // The viewer's uploader pill shows the guest's public photo count, matching
  // their public gallery page.
  const [publicStats, imageUrls] = await Promise.all([
    loadPublicUploaderStats([...new Set(rows.map((row) => row.uploader_id))]),
    galleryImageUrls(rows),
  ]);
  const last = rows.at(-1);
  return {
    photos: rows.map((photo, index) => ({
      id: photo.id,
      uploadedAt: photo.uploaded_at,
      imageUrl: imageUrls[index],
      originalFilename: photo.original_filename,
      likeCount: photo.like_count,
      likedByViewer: false,
      ownedByViewer: false,
      visibility: photo.visibility,
      uploader: photo.uploaders?.display_name
        ? {
            displayName: photo.uploaders.display_name,
            publicId: photo.uploaders.public_id,
            photoCount: publicStats.get(photo.uploader_id)?.photoCount ?? 0,
          }
        : null,
    })),
    nextCursor:
      last && rows.length === ADMIN_PAGE_SIZE
        ? encodeGalleryCursor({
            likeCount: last.like_count,
            uploadedAt: last.uploaded_at,
            id: last.id,
          })
        : null,
  };
}

export type AdminUploaderSummary = {
  publicId: string;
  displayName: string;
  photoCount: number;
  privateCount: number;
};

export type AdminPhotoCounts = { photoCount: number; privateCount: number };

export type AdminSummary = {
  totalCount: number;
  privateCount: number;
  binCount: number;
  totalBytes: number;
  uploaders: AdminUploaderSummary[];
  // Photos whose guest never gave a name, as one bucket; null when there are
  // none.
  unnamed: AdminPhotoCounts | null;
};

type SummaryRow = {
  total_count: number;
  private_count: number;
  bin_count: number;
  total_bytes: number;
  uploaders: {
    public_id: string | null;
    display_name: string | null;
    photo_count: number;
    private_count: number;
  }[];
};

// Every number the admin header, filter chips, guest list and download row
// show, counted in the database rather than over a table's worth of rows.
export async function loadAdminSummary(): Promise<AdminSummary> {
  const { data, error } = await supabaseAdmin().rpc("admin_gallery_summary");
  if (error) throw new Error(`Loading admin summary failed: ${error.message}`);
  const row = data as SummaryRow;

  const uploaders: AdminUploaderSummary[] = [];
  let unnamedPhotos = 0;
  let unnamedPrivates = 0;
  for (const entry of row.uploaders) {
    if (entry.public_id === null || entry.display_name === null) {
      unnamedPhotos += Number(entry.photo_count);
      unnamedPrivates += Number(entry.private_count);
      continue;
    }
    uploaders.push({
      publicId: entry.public_id,
      displayName: entry.display_name,
      photoCount: Number(entry.photo_count),
      privateCount: Number(entry.private_count),
    });
  }
  uploaders.sort((a, b) => a.displayName.localeCompare(b.displayName));

  return {
    totalCount: Number(row.total_count),
    privateCount: Number(row.private_count),
    binCount: Number(row.bin_count),
    totalBytes: Number(row.total_bytes),
    uploaders,
    unnamed:
      unnamedPhotos > 0
        ? { photoCount: unnamedPhotos, privateCount: unnamedPrivates }
        : null,
  };
}
