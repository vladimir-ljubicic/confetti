import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { PHOTOS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { moveRenditions } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isUuid } from "@/lib/uploaders";

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

  const { data: hidden, error: listError } = await supabase
    .from("photos")
    .select("id")
    .eq("uploader_id", uploader.id)
    .eq("visibility", "public")
    .is("deleted_at", null);
  if (listError) return jsonError("Could not hide photos", 500);

  // Renditions leave the public CDN before the rows flip, so a failure never
  // leaves a private photo's renditions publicly reachable.
  const moved = await moveRenditions(supabase, hidden, PHOTOS_BUCKET);
  if (!moved) return jsonError("Could not hide photos", 500);

  const { error } = await supabase
    .from("photos")
    .update({ visibility: "private" })
    .eq("uploader_id", uploader.id)
    .eq("visibility", "public")
    .is("deleted_at", null);
  if (error) return jsonError("Could not hide photos", 500);

  return NextResponse.json({ ok: true });
}
