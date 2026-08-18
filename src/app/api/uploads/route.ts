import { NextResponse } from "next/server";
import { getDeviceId } from "@/lib/device";
import { env, PHOTOS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { storagePath } from "@/lib/storage-path";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { UploadTicket } from "@/lib/upload-ticket";
import { getUploaderProfile } from "@/lib/uploaders";

type UploadRequest = {
  filename: string;
  contentType: string;
  size: number;
};

function parseBody(body: unknown): UploadRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { filename, contentType, size } = body as Record<string, unknown>;
  if (typeof filename !== "string" || filename.length === 0) return null;
  if (typeof contentType !== "string" || contentType.length === 0) return null;
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return null;
  return { filename, contentType, size };
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

  const { error: insertError } = await supabase.from("photos").insert({
    id: photoId,
    uploader_id: deviceId,
    storage_path: path,
    original_filename: body.filename,
    content_type: body.contentType,
    size_bytes: Math.round(body.size),
    visibility: uploader.defaultVisibility,
  });
  if (insertError) return jsonError("Could not record photo", 500);

  const ticket: UploadTicket = {
    photoId,
    path,
    token: signed.token,
    storageUrl: env.supabaseUrl(),
  };
  return NextResponse.json(ticket);
}
