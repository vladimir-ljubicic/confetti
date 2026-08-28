import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { getDeviceId } from "@/lib/device";
import { jsonError } from "@/lib/http";
import { galleryImageUrls, type PhotoForUrl } from "@/lib/photo-urls";
import { supabaseAdmin } from "@/lib/supabase-server";

type ImageRow = PhotoForUrl & {
  visibility: string;
  uploader_id: string | null;
  uploaded_at: string | null;
  deleted_at: string | null;
};

// A signed rendering URL outlives its token while the page holding it stays
// open, so a browser whose image failed to load asks here for a fresh one.
export async function GET(
  _request: Request,
  context: RouteContext<"/api/photos/[id]/image-url">,
) {
  const { id } = await context.params;
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select(
      "storage_path, thumbnail_path, original_filename, visibility, uploader_id, uploaded_at, deleted_at",
    )
    .eq("id", id)
    .maybeSingle();
  const photo = data as ImageRow | null;
  if (error || !photo || !photo.uploaded_at || photo.deleted_at) {
    return jsonError("Photo not found", 404);
  }
  if (photo.visibility !== "public") {
    const deviceId = await getDeviceId();
    const owned = deviceId !== null && photo.uploader_id === deviceId;
    if (!owned && !(await isAdmin())) return jsonError("Photo not found", 404);
  }

  const [url] = await galleryImageUrls([photo]);
  if (url === null) return jsonError("Could not sign photo", 500);
  return NextResponse.json({ url });
}
