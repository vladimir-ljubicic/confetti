import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { getDeviceId } from "@/lib/device";
import { PHOTOS_BUCKET, RENDITIONS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { moveRenditions } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";
import { parseVisibilityField } from "@/lib/uploader-profile";

type ManageablePhoto = { thumbnail_path: string | null };

// The photo when the caller may manage it; an error response when it is gone
// or the caller may not (neither the uploading device nor an admin).
async function requireManageablePhoto(
  id: string,
): Promise<{ photo: ManageablePhoto } | { denied: NextResponse }> {
  const { data: photo, error } = await supabaseAdmin()
    .from("photos")
    .select("uploader_id, deleted_at, thumbnail_path")
    .eq("id", id)
    .maybeSingle();
  if (error || !photo || photo.deleted_at) {
    return { denied: jsonError("Photo not found", 404) };
  }
  if (await isAdmin()) return { photo };

  const deviceId = await getDeviceId();
  if (!deviceId || photo.uploader_id !== deviceId) {
    return { denied: jsonError("Not your photo", 403) };
  }
  return { photo };
}

export async function PATCH(request: Request, context: RouteContext<"/api/photos/[id]">) {
  const { id } = await context.params;
  const visibility = parseVisibilityField(
    await request.json().catch(() => null),
    "visibility",
  );
  if (!visibility) return jsonError("Invalid visibility", 400);

  const result = await requireManageablePhoto(id);
  if ("denied" in result) return result.denied;

  const supabase = supabaseAdmin();
  // Renditions cross buckets on the private side of the row update, so a
  // failure never leaves a private photo's renditions on the public CDN.
  if (visibility === "private") {
    const moved = await moveRenditions(supabase, [result.photo], PHOTOS_BUCKET);
    if (!moved) return jsonError("Could not update photo", 500);
  }

  const { error } = await supabase
    .from("photos")
    .update({ visibility })
    .eq("id", id);
  if (error) return jsonError("Could not update photo", 500);

  if (visibility === "public") {
    const moved = await moveRenditions(supabase, [result.photo], RENDITIONS_BUCKET);
    if (!moved) return jsonError("Could not update photo", 500);
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE(_request: Request, context: RouteContext<"/api/photos/[id]">) {
  const { id } = await context.params;

  const result = await requireManageablePhoto(id);
  if ("denied" in result) return result.denied;

  const supabase = supabaseAdmin();
  // Deleted photos render only through the signed proxy; renditions leave the
  // public CDN before the row marks the photo deleted.
  const moved = await moveRenditions(supabase, [result.photo], PHOTOS_BUCKET);
  if (!moved) return jsonError("Could not delete photo", 500);

  const { error } = await supabase
    .from("photos")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null);
  if (error) return jsonError("Could not delete photo", 500);

  return NextResponse.json({ ok: true });
}
