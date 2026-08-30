import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { RENDITIONS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { moveRenditions } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/admin/photos/[id]/restore">,
) {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const { id } = await context.params;
  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("photos")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id, visibility")
    .maybeSingle();
  if (error) return jsonError("Could not restore photo", 500);
  if (!data) return jsonError("Photo not in the recycle bin", 404);

  if (data.visibility === "public") {
    const moved = await moveRenditions(supabase, [data], RENDITIONS_BUCKET);
    if (!moved) return jsonError("Could not restore photo", 500);
  }

  return NextResponse.json({ ok: true });
}
