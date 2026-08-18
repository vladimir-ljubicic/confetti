import { NextResponse } from "next/server";
import { getDeviceId } from "@/lib/device";
import { env, PHOTOS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { needsThumbnail } from "@/lib/image-source";
import { storagePath, thumbnailPath } from "@/lib/storage-path";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { UploadTicket } from "@/lib/upload-ticket";
import { getUploaderProfile } from "@/lib/uploaders";

type UploadRequest = {
  filename: string;
  contentType: string;
  size: number;
  takenAt: string | null;
};

function parseTakenAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseBody(body: unknown): UploadRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { filename, contentType, size, takenAt } = body as Record<string, unknown>;
  if (typeof filename !== "string" || filename.length === 0) return null;
  if (typeof contentType !== "string" || contentType.length === 0) return null;
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return null;
  return { filename, contentType, size, takenAt: parseTakenAt(takenAt) };
}

export async function POST(request: Request) {
  const body = parseBody(await request.json().catch(() => null));
  if (!body) return jsonError("Invalid upload request", 400);

  const deviceId = await getDeviceId();
  if (!deviceId) return jsonError("Profile required", 409);
  const supabase = supabaseAdmin();

  const uploader = await getUploaderProfile(deviceId).catch(() => undefined);
  if (uploader === undefined) return jsonError("Could not look up device", 500);
  if (uploader === null) return jsonError("Profile required", 409);

  const photoId = crypto.randomUUID();
  const path = storagePath(deviceId, photoId, body.filename, body.contentType);

  const { data: signed, error: signError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUploadUrl(path);
  if (signError || !signed) return jsonError("Could not authorize upload", 500);

  // Files too large for image transforms render from a client-generated
  // thumbnail instead; sign a second upload slot for it.
  const thumbPath = needsThumbnail(body.size) ? thumbnailPath(deviceId, photoId) : null;
  let thumbnailUploadUrl: string | null = null;
  if (thumbPath) {
    const { data: signedThumb, error: thumbError } = await supabase.storage
      .from(PHOTOS_BUCKET)
      .createSignedUploadUrl(thumbPath);
    if (thumbError || !signedThumb) return jsonError("Could not authorize upload", 500);
    thumbnailUploadUrl = signedThumb.signedUrl;
  }

  const { error: insertError } = await supabase.from("photos").insert({
    id: photoId,
    uploader_id: deviceId,
    storage_path: path,
    original_filename: body.filename,
    content_type: body.contentType,
    size_bytes: Math.round(body.size),
    visibility: uploader.defaultVisibility,
    taken_at: body.takenAt,
    thumbnail_path: thumbPath,
  });
  if (insertError) return jsonError("Could not record photo", 500);

  const ticket: UploadTicket = {
    photoId,
    path,
    token: signed.token,
    storageUrl: env.supabaseUrl(),
    thumbnailUploadUrl,
  };
  return NextResponse.json(ticket);
}
