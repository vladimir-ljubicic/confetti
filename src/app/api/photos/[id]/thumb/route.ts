import { NextResponse } from "next/server";
import { publicRenditionUrl } from "@/app/photo-image";
import { isAdmin } from "@/lib/admin-session";
import { getDeviceId } from "@/lib/device";
import { RENDITIONS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { THUMB_MAX_AGE_SECONDS } from "@/lib/photo-url-window";
import { galleryImageUrls, type PhotoForUrl } from "@/lib/photo-urls";
import { renditionsBucket } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";

type ThumbRow = PhotoForUrl & {
  visibility: string;
  uploader_id: string | null;
  uploaded_at: string | null;
  deleted_at: string | null;
};

// Private and deleted photos render through here, so pages carry no signed
// URL and access is decided per request rather than frozen into a token
// handed out with the page.
export async function GET(
  _request: Request,
  context: RouteContext<"/api/photos/[id]/thumb">,
) {
  const { id } = await context.params;
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

  // A public photo's thumbnail sits in the public renditions bucket, where
  // there is nothing to sign; only private and deleted photos (and public
  // ones with no thumbnail, rendered from their original) need a signed URL
  // into the private bucket.
  if (renditionsBucket(photo) === RENDITIONS_BUCKET && photo.thumbnail_path) {
    return NextResponse.redirect(publicRenditionUrl(photo.thumbnail_path), {
      status: 302,
      headers: {
        "cache-control": `public, max-age=${THUMB_MAX_AGE_SECONDS}`,
      },
    });
  }

  const [url] = await galleryImageUrls([photo]);
  if (url === null) return jsonError("Could not sign photo", 500);
  return NextResponse.redirect(url, {
    status: 302,
    headers: {
      // Authorized for one viewer, so a shared cache holding this redirect
      // would hand that viewer's authorization to somebody else.
      "cache-control": `private, max-age=${THUMB_MAX_AGE_SECONDS}`,
    },
  });
}
