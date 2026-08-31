import { NextResponse } from "next/server";
import { parseAdminFilter } from "@/lib/admin-filter";
import { loadAdminSelection } from "@/lib/admin-gallery";
import { isAdmin } from "@/lib/admin-session";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const params = new URL(request.url).searchParams;
  const filter = parseAdminFilter({
    uploader: params.get("uploader") ?? undefined,
    filter: params.get("filter") ?? undefined,
  });
  return NextResponse.json({ photos: await loadAdminSelection(filter) });
}
