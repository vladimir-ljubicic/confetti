import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { jsonError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-server";
import { parseUploaderPatch } from "@/lib/uploader-profile";
import { isUuid } from "@/lib/uploaders";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/admin/uploaders/[publicId]">,
) {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const patch = parseUploaderPatch(await request.json().catch(() => null));
  if (!patch) return jsonError("Invalid uploader patch", 400);

  const { publicId } = await context.params;
  if (!isUuid(publicId)) return jsonError("Uploader not found", 404);

  const { data, error } = await supabaseAdmin()
    .from("uploaders")
    .update({
      ...(patch.displayName !== undefined && { display_name: patch.displayName }),
      ...(patch.uploadsBlocked !== undefined && {
        uploads_blocked: patch.uploadsBlocked,
      }),
    })
    .eq("public_id", publicId)
    .select("id")
    .maybeSingle();
  if (error) return jsonError("Could not update uploader", 500);
  if (!data) return jsonError("Uploader not found", 404);

  return NextResponse.json({ ok: true });
}
