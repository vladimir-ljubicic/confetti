import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { getDeviceId } from "@/lib/device";
import { jsonError } from "@/lib/http";
import { originalDownloadUrl } from "@/lib/photo-urls";
import { supabaseAdmin } from "@/lib/supabase-server";

// Redirects to a short-lived signed URL for the untouched original. Signing
// happens here, on click, so gallery renders don't sign a download URL for
// every photo up front.
export async function GET(
  _request: Request,
  context: RouteContext<"/api/photos/[id]/download">,
) {
  const { id } = await context.params;
  const { data: photo, error } = await supabaseAdmin()
    .from("photos")
    .select(
      "storage_path, thumbnail_path, original_filename, size_bytes, visibility, uploader_id, deleted_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !photo || photo.deleted_at) return jsonError("Photo not found", 404);

  if (photo.visibility !== "public") {
    const deviceId = await getDeviceId();
    const allowed =
      (deviceId !== null && photo.uploader_id === deviceId) || (await isAdmin());
    if (!allowed) return jsonError("Photo not found", 404);
  }

  const url = await originalDownloadUrl(photo);
  if (!url) return jsonError("Could not sign download", 500);
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "cache-control": "no-store" },
  });
}
