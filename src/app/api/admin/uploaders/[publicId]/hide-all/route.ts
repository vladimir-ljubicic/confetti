import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { PHOTOS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { BULK_MOVE_BATCH, moveRenditions } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isUuid } from "@/lib/uploaders";

// Hides one batch of the guest's public photos per request and reports how
// many remain; the client keeps calling until none do.
export async function POST(
  _request: Request,
  context: RouteContext<"/api/admin/uploaders/[publicId]/hide-all">,
) {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const { publicId } = await context.params;
  if (!isUuid(publicId)) return jsonError("Uploader not found", 404);
  const supabase = supabaseAdmin();

  const { data: uploader, error: uploaderError } = await supabase
    .from("uploaders")
    .select("id")
    .eq("public_id", publicId)
    .maybeSingle();
  if (uploaderError) return jsonError("Could not look up uploader", 500);
  if (!uploader) return jsonError("Uploader not found", 404);

  const { data: batch, error: listError } = await supabase
    .from("photos")
    .select("id")
    .eq("uploader_id", uploader.id)
    .eq("visibility", "public")
    .is("deleted_at", null)
    .order("id")
    .limit(BULK_MOVE_BATCH);
  if (listError) return jsonError("Could not hide photos", 500);

  // Renditions leave the public CDN before the rows flip, and a row flips only
  // once its own renditions have moved: a failure leaves neither a private
  // photo's renditions publicly reachable nor a public photo without its
  // renditions.
  const { moved, failed } = await moveRenditions(supabase, batch, PHOTOS_BUCKET);
  if (moved.length > 0) {
    const { error } = await supabase
      .from("photos")
      .update({ visibility: "private" })
      .in("id", moved)
      .eq("visibility", "public")
      .is("deleted_at", null);
    if (error) return jsonError("Could not hide photos", 500);
  }

  const { count, error: countError } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .eq("uploader_id", uploader.id)
    .eq("visibility", "public")
    .is("deleted_at", null);
  if (countError || count === null) return jsonError("Could not hide photos", 500);

  const progress = { done: moved.length, remaining: count };
  if (failed.length > 0) {
    return NextResponse.json(
      { error: "Could not hide photos", ...progress },
      { status: 500 },
    );
  }
  return NextResponse.json(progress);
}
