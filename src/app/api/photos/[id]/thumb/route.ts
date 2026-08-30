import { NextResponse } from "next/server";
import { publicRenditionUrl } from "@/app/photo-image";
import { isAdmin } from "@/lib/admin-session";
import { getDeviceId } from "@/lib/device";
import { RENDITIONS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { THUMB_MAX_AGE_SECONDS } from "@/lib/photo-url-window";
import { galleryImageUrls, viewerImageUrl, type PhotoForUrl } from "@/lib/photo-urls";
import { renditionsBucket } from "@/lib/renditions";
import { viewerPath } from "@/lib/storage-path";
import { supabaseAdmin } from "@/lib/supabase-server";

type ThumbRow = PhotoForUrl & {
  visibility: string;
  uploader_id: string | null;
  uploaded_at: string | null;
  deleted_at: string | null;
};

// `private` on the signed redirects: they are authorized for one viewer, so a
// shared cache holding one would hand that viewer's authorization to somebody
// else.
function redirectTo(url: string, cacheability: "public" | "private") {
  return NextResponse.redirect(url, {
    status: 302,
    headers: {
      "cache-control": `${cacheability}, max-age=${THUMB_MAX_AGE_SECONDS}`,
    },
  });
}

// Private and deleted photos render through here, so pages carry no signed
// URL and access is decided per request rather than frozen into a token
// handed out with the page. `?size=viewer` serves the wider viewer rendition
// instead of the thumb.
export async function GET(
  request: Request,
  context: RouteContext<"/api/photos/[id]/thumb">,
) {
  const { id } = await context.params;
  const wantsViewer = new URL(request.url).searchParams.get("size") === "viewer";
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select(
      "storage_path, thumbnail_path, original_filename, visibility, uploader_id, uploaded_at, deleted_at",
    )
    .eq("id", id)
    .maybeSingle();
  const photo = data as ThumbRow | null;
  if (error || !photo || !photo.uploaded_at)
    return jsonError("Photo not found", 404);

  if (photo.deleted_at) {
    // The recycle bin renders deleted photos, so an admin still gets them.
    if (!(await isAdmin())) return jsonError("Photo not found", 404);
  } else if (photo.visibility !== "public") {
    const deviceId = await getDeviceId();
    const owned = deviceId !== null && photo.uploader_id === deviceId;
    if (!owned && !(await isAdmin())) return jsonError("Photo not found", 404);
  }

  if (wantsViewer) {
    if (renditionsBucket(photo) === RENDITIONS_BUCKET) {
      return redirectTo(publicRenditionUrl(viewerPath(id)), "public");
    }
    const viewerUrl = await viewerImageUrl(id);
    // An absent rendition is expected — not every photo has one.
    if (viewerUrl === null) return jsonError("No viewer rendition", 404);
    return redirectTo(viewerUrl, "private");
  }

  // A public photo's thumbnail sits in the public renditions bucket, where
  // there is nothing to sign; only private and deleted photos (and public
  // ones with no thumbnail, rendered from their original) need a signed URL
  // into the private bucket.
  if (renditionsBucket(photo) === RENDITIONS_BUCKET && photo.thumbnail_path) {
    return redirectTo(publicRenditionUrl(photo.thumbnail_path), "public");
  }

  const [url] = await galleryImageUrls([photo]);
  if (url === null) return jsonError("Could not sign photo", 500);
  return redirectTo(url, "private");
}
