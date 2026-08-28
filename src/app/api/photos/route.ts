import { NextResponse } from "next/server";
import { getDeviceId } from "@/lib/device";
import { decodeGalleryCursor } from "@/lib/gallery-cursor";
import { jsonError } from "@/lib/http";
import { loadPublicPhotos } from "@/lib/public-photos";
import { resolveSortMode } from "@/lib/sort-mode";
import { getUploaderByPublicId } from "@/lib/uploaders";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const sort = resolveSortMode(params.get("sort") ?? undefined);

  const cursorParam = params.get("cursor");
  const cursor = cursorParam === null ? null : decodeGalleryCursor(cursorParam);
  if (cursorParam !== null && cursor === null) {
    return jsonError("Invalid cursor", 400);
  }

  const publicId = params.get("uploader");
  let uploaderId: string | undefined;
  if (publicId !== null) {
    const uploader = await getUploaderByPublicId(publicId);
    if (!uploader) return jsonError("Uploader not found", 404);
    uploaderId = uploader.uploaderId;
  }

  const page = await loadPublicPhotos({
    sort,
    uploaderId,
    viewerDeviceId: await getDeviceId(),
    cursor,
  });
  return NextResponse.json(page);
}
