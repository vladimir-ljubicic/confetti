import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { RENDITIONS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { moveRenditions } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST() {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const supabase = supabaseAdmin();
  const { data, error } = await supabase
    .from("photos")
    .update({ deleted_at: null })
    .not("deleted_at", "is", null)
    .select("id, visibility");
  if (error) return jsonError("Could not restore photos", 500);

  const restoredPublic = data.filter((photo) => photo.visibility === "public");
  const moved = await moveRenditions(supabase, restoredPublic, RENDITIONS_BUCKET);
  if (!moved) return jsonError("Could not restore photos", 500);

  return NextResponse.json({ restored: data.length });
}
