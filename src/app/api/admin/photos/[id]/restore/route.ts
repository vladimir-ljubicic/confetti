import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { jsonError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/admin/photos/[id]/restore">,
) {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const { id } = await context.params;
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .update({ deleted_at: null })
    .eq("id", id)
    .not("deleted_at", "is", null)
    .select("id")
    .maybeSingle();
  if (error) return jsonError("Could not restore photo", 500);
  if (!data) return jsonError("Photo not in the recycle bin", 404);

  return NextResponse.json({ ok: true });
}
