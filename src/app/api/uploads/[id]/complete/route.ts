import { NextResponse } from "next/server";
import { getDeviceId } from "@/lib/device";
import { PHOTOS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-server";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/uploads/[id]/complete">,
) {
  const { id } = await context.params;
  const deviceId = await getDeviceId();
  if (!deviceId) return jsonError("Unknown device", 403);

  const supabase = supabaseAdmin();
  const { data: photo, error } = await supabase
    .from("photos")
    .select("id, uploader_id, storage_path, uploaded_at")
    .eq("id", id)
    .maybeSingle();
  if (error || !photo) return jsonError("Photo not found", 404);
  if (photo.uploader_id !== deviceId) return jsonError("Not your photo", 403);
  if (photo.uploaded_at) return NextResponse.json({ ok: true });

  const { data: object, error: infoError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .info(photo.storage_path);
  if (infoError || !object) return jsonError("Upload not found in storage", 409);

  // The client-reported size feeds the transform/original decision; trust
  // storage, not the client.
  const { error: updateError } = await supabase
    .from("photos")
    .update({
      uploaded_at: new Date().toISOString(),
      ...(typeof object.size === "number" ? { size_bytes: object.size } : {}),
    })
    .eq("id", id)
    .is("uploaded_at", null);
  if (updateError) return jsonError("Could not finish upload", 500);

  return NextResponse.json({ ok: true });
}
