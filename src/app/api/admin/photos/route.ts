import { NextResponse } from "next/server";
import { parseAdminFilter } from "@/lib/admin-filter";
import { loadAdminPhotos } from "@/lib/admin-gallery";
import { isAdmin } from "@/lib/admin-session";
import { decodeGalleryCursor } from "@/lib/gallery-cursor";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const params = new URL(request.url).searchParams;
  const cursorParam = params.get("cursor");
  const cursor = cursorParam === null ? null : decodeGalleryCursor(cursorParam);
  if (cursorParam !== null && cursor === null) {
    return jsonError("Invalid cursor", 400);
  }

  const filter = parseAdminFilter({
    uploader: params.get("uploader") ?? undefined,
    filter: params.get("filter") ?? undefined,
  });
  return NextResponse.json(await loadAdminPhotos({ filter, cursor }));
}
