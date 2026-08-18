import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/device";
import { env, PHOTOS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { storagePath } from "@/lib/storage-path";
import { supabaseAdmin } from "@/lib/supabase-server";

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

  const deviceId = await getOrCreateDeviceId();
  const supabase = supabaseAdmin();

  const { error: uploaderError } = await supabase
    .from("uploaders")
    .upsert({ id: deviceId }, { onConflict: "id", ignoreDuplicates: true });
  if (uploaderError) return jsonError("Could not register device", 500);

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
  });
  if (insertError) return jsonError("Could not record photo", 500);

  return NextResponse.json({
    photoId,
    path,
    bucket: PHOTOS_BUCKET,
    token: signed.token,
    storageUrl: env.supabaseUrl(),
  });
}
