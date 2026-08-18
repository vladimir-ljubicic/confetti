import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { jsonError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-server";
import { parseDisplayNameField } from "@/lib/uploader-profile";
import { isUuid } from "@/lib/uploaders";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/uploaders/[publicId]">,
) {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const displayName = parseDisplayNameField(await request.json().catch(() => null));
  if (!displayName) return jsonError("Invalid name", 400);

  const { publicId } = await context.params;
  if (!isUuid(publicId)) return jsonError("Uploader not found", 404);

  const { data, error } = await supabaseAdmin()
    .from("uploaders")
    .update({ display_name: displayName })
    .eq("public_id", publicId)
    .select("id")
    .maybeSingle();
  if (error) return jsonError("Could not rename uploader", 500);
  if (!data) return jsonError("Uploader not found", 404);

  return NextResponse.json({ ok: true });
}
