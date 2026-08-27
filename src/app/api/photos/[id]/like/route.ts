import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/device";
import { jsonError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-server";
import { isUuid } from "@/lib/uploaders";

export async function PUT(
  request: Request,
  context: RouteContext<"/api/photos/[id]/like">,
) {
  const { id } = await context.params;
  if (!isUuid(id)) return jsonError("Photo not found", 404);

  const body = (await request.json().catch(() => null)) as {
    liked?: unknown;
  } | null;
  if (typeof body?.liked !== "boolean") return jsonError("Invalid body", 400);

  const { data: photo, error: photoError } = await supabaseAdmin()
    .from("photos")
    .select("id, deleted_at, uploaded_at")
    .eq("id", id)
    .maybeSingle();
  if (photoError || !photo || photo.deleted_at || !photo.uploaded_at) {
    return jsonError("Photo not found", 404);
  }

  const deviceId = await getOrCreateDeviceId();

  if (body.liked) {
    const { error } = await supabaseAdmin()
      .from("likes")
      .upsert(
        { photo_id: id, device_id: deviceId },
        { onConflict: "photo_id,device_id", ignoreDuplicates: true },
      );
    if (error) return jsonError("Could not save like", 500);
  } else {
    const { error } = await supabaseAdmin()
      .from("likes")
      .delete()
      .match({ photo_id: id, device_id: deviceId });
    if (error) return jsonError("Could not remove like", 500);
  }

  const { data: updated, error: countError } = await supabaseAdmin()
    .from("photos")
    .select("like_count")
    .eq("id", id)
    .maybeSingle();
  if (countError || !updated) return jsonError("Could not load like count", 500);

  return NextResponse.json({ liked: body.liked, likeCount: updated.like_count });
}
