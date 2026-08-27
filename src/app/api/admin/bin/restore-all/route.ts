import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { jsonError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST() {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const { data, error } = await supabaseAdmin()
    .from("photos")
    .update({ deleted_at: null })
    .not("deleted_at", "is", null)
    .select("id");
  if (error) return jsonError("Could not restore photos", 500);

  return NextResponse.json({ restored: data.length });
}
