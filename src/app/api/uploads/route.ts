import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { getDeviceId } from "@/lib/device";
import { env, PHOTOS_BUCKET } from "@/lib/env";
import { areUploadsFrozen } from "@/lib/event-settings";
import { jsonError } from "@/lib/http";
import { storagePath, thumbnailPath } from "@/lib/storage-path";
import { supabaseAdmin } from "@/lib/supabase-server";
import { UPLOADS_FROZEN_STATUS } from "@/lib/upload-freeze";
import {
  evaluateUpload,
  FILE_TOO_LARGE_STATUS,
  RATE_LIMITED_STATUS,
} from "@/lib/upload-limits";
import type { UploadTicket } from "@/lib/upload-ticket";
import { getUploaderProfile } from "@/lib/uploaders";

type UploadRequest = {
  filename: string;
  contentType: string;
  size: number;
  batchSize: number;
  takenAt: string | null;
};

function parseTakenAt(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseBody(body: unknown): UploadRequest | null {
  if (typeof body !== "object" || body === null) return null;
  const { filename, contentType, size, batchSize, takenAt } = body as Record<
    string,
    unknown
  >;
  if (typeof filename !== "string" || filename.length === 0) return null;
  if (typeof contentType !== "string" || contentType.length === 0) return null;
  if (typeof size !== "number" || !Number.isFinite(size) || size <= 0) return null;
  if (typeof batchSize !== "number" || !Number.isInteger(batchSize) || batchSize < 1) {
    return null;
  }
  return { filename, contentType, size, batchSize, takenAt: parseTakenAt(takenAt) };
}

export async function POST(request: Request) {
  const body = parseBody(await request.json().catch(() => null));
  if (!body) return jsonError("Invalid upload request", 400);

  const frozen = await areUploadsFrozen().catch(() => null);
  if (frozen === null) return jsonError("Could not check settings", 500);
  if (frozen) return jsonError("Uploads are frozen", UPLOADS_FROZEN_STATUS);

  const deviceId = await getDeviceId();
  if (!deviceId) return jsonError("Profile required", 409);
  const supabase = supabaseAdmin();

  const uploader = await getUploaderProfile(deviceId).catch(() => undefined);
  if (uploader === undefined) return jsonError("Could not look up device", 500);
  if (uploader === null) return jsonError("Profile required", 409);
  if (uploader.uploadsBlocked) return jsonError("Uploads are blocked", 403);

  if (!(await isAdmin())) {
    const limits = env.uploadLimits();
    const windowStart = new Date(
      Date.now() - limits.windowMinutes * 60 * 1000,
    ).toISOString();
    const { count, error: countError } = await supabase
      .from("photos")
      .select("id", { count: "exact", head: true })
      .eq("uploader_id", deviceId)
      .gte("created_at", windowStart);
    if (countError || count === null) return jsonError("Could not check limits", 500);

    const verdict = evaluateUpload(
      { fileBytes: body.size, batchSize: body.batchSize, recentCount: count },
      limits,
    );
    if (!verdict.ok) {
      if (verdict.reason === "file-size") {
        return jsonError("File is too large", FILE_TOO_LARGE_STATUS);
      }
      return NextResponse.json(
        { error: "Upload limit reached", reason: verdict.reason },
        { status: RATE_LIMITED_STATUS },
      );
    }
  }

  const photoId = crypto.randomUUID();
  const path = storagePath(deviceId, photoId, body.filename, body.contentType);

  const { data: signed, error: signError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUploadUrl(path);
  if (signError || !signed) return jsonError("Could not authorize upload", 500);

  // Galleries render from a client-generated thumbnail, never the original;
  // sign a second upload slot for it.
  const thumbPath = thumbnailPath(deviceId, photoId);
  const { data: signedThumb, error: thumbError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .createSignedUploadUrl(thumbPath);
  if (thumbError || !signedThumb) return jsonError("Could not authorize upload", 500);

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
    thumbnailUploadUrl: signedThumb.signedUrl,
  };
  return NextResponse.json(ticket);
}
