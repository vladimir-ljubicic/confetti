import { NextResponse } from "next/server";
import { getDeviceId } from "@/lib/device";
import { jsonError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-server";
import { parseVisibilityField } from "@/lib/uploader-profile";

// Error response when the photo doesn't belong to this device (or is gone);
// null when the caller may proceed.
async function requireOwnPhoto(id: string): Promise<NextResponse | null> {
  const deviceId = await getDeviceId();
  if (!deviceId) return jsonError("Unknown device", 403);

  const { data: photo, error } = await supabaseAdmin()
    .from("photos")
    .select("uploader_id, deleted_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !photo || photo.deleted_at) return jsonError("Photo not found", 404);
  if (photo.uploader_id !== deviceId) return jsonError("Not your photo", 403);
  return null;
}

export async function PATCH(request: Request, context: RouteContext<"/api/photos/[id]">) {
  const { id } = await context.params;
  const visibility = parseVisibilityField(
    await request.json().catch(() => null),
    "visibility",
  );
  if (!visibility) return jsonError("Invalid visibility", 400);

  const denied = await requireOwnPhoto(id);
  if (denied) return denied;

  const { error } = await supabaseAdmin()
    .from("photos")
    .update({ visibility })
    .eq("id", id);
  if (error) return jsonError("Could not update photo", 500);

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/photos/[id]">) {
  const { id } = await context.params;

  const denied = await requireOwnPhoto(id);
  if (denied) return denied;

  const { error } = await supabaseAdmin()
    .from("photos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return jsonError("Could not delete photo", 500);

  return NextResponse.json({ ok: true });
}
