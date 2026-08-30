import { NextResponse } from "next/server";
import { getDeviceId } from "@/lib/device";
import { PHOTOS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { moveRenditions, renditionsBucket } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";

type ImageSize = { width: number; height: number };

function parseThumbnailSize(body: unknown): ImageSize | null {
  if (typeof body !== "object" || body === null) return null;
  const { thumbnail } = body as Record<string, unknown>;
  if (typeof thumbnail !== "object" || thumbnail === null) return null;
  const { width, height } = thumbnail as Record<string, unknown>;
  if (!Number.isInteger(width) || !Number.isInteger(height)) return null;
  if ((width as number) < 1 || (height as number) < 1) return null;
  return { width: width as number, height: height as number };
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/uploads/[id]/complete">,
) {
  const { id } = await context.params;
  const deviceId = await getDeviceId();
  if (!deviceId) return jsonError("Unknown device", 403);
  const thumbnailSize = parseThumbnailSize(await request.json().catch(() => null));

  const supabase = supabaseAdmin();
  const { data: photo, error } = await supabase
    .from("photos")
    .select(
      "id, uploader_id, storage_path, thumbnail_path, visibility, deleted_at, uploaded_at",
    )
    .eq("id", id)
    .maybeSingle();
  if (error || !photo) return jsonError("Photo not found", 404);
  if (photo.uploader_id !== deviceId) return jsonError("Not your photo", 403);
  if (photo.uploaded_at) return NextResponse.json({ ok: true });

  const { data: object, error: infoError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .info(photo.storage_path);
  if (infoError || !object) return jsonError("Upload not found in storage", 409);

  // Thumbnail generation/upload is best-effort on the client; keep the path
  // only if the object actually landed.
  let thumbnailPath = photo.thumbnail_path;
  if (thumbnailPath) {
    const home = renditionsBucket(photo);
    let { data: thumb } = await supabase.storage.from(home).info(thumbnailPath);
    if (!thumb) {
      // The upload slot was signed for the bucket the photo's visibility
      // called for at ticket time; a flip since then leaves the thumbnail in
      // the other bucket, publicly reachable when the photo no longer is.
      await moveRenditions(supabase, [photo], home);
      ({ data: thumb } = await supabase.storage.from(home).info(thumbnailPath));
    }
    if (!thumb) thumbnailPath = null;
  }

  const { error: updateError } = await supabase
    .from("photos")
    .update({
      uploaded_at: new Date().toISOString(),
      thumbnail_path: thumbnailPath,
      // The size describes the thumbnail; without one the gallery falls back to
      // the original, whose size the client never measured.
      image_width: thumbnailPath ? (thumbnailSize?.width ?? null) : null,
      image_height: thumbnailPath ? (thumbnailSize?.height ?? null) : null,
      ...(typeof object.size === "number" ? { size_bytes: object.size } : {}),
    })
    .eq("id", id)
    .is("uploaded_at", null);
  if (updateError) return jsonError("Could not finish upload", 500);

  return NextResponse.json({ ok: true });
}
