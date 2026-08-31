import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { jsonError } from "@/lib/http";
import { moveRenditions, renditionsBucket } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/admin/photos/[id]/restore">,
) {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const { id } = await context.params;
  const supabase = supabaseAdmin();
  const { data: photo, error: lookupError } = await supabase
    .from("photos")
    .select("id, visibility, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (lookupError) return jsonError("Could not restore photo", 500);
  if (!photo || !photo.deleted_at) return jsonError("Photo not in the recycle bin", 404);

  // Renditions return to the bucket a live photo of this visibility serves
  // from before the row comes back, so a failure leaves the photo in the bin
  // and restoring again picks up where the move stopped.
  const { failed } = await moveRenditions(
    supabase,
    [photo],
    renditionsBucket({ visibility: photo.visibility, deleted_at: null }),
  );
  if (failed.length > 0) return jsonError("Could not restore photo", 500);

  const { error } = await supabase
    .from("photos")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null);
  if (error) return jsonError("Could not restore photo", 500);

  return NextResponse.json({ ok: true });
}
