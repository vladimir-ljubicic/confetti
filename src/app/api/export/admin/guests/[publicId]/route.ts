import { isAdmin } from "@/lib/admin-session";
import { exportResponse, prepareExportResponse } from "@/lib/export-endpoint";
import { jsonError } from "@/lib/http";
import { guestExportTarget } from "./target";

export async function GET(
  request: Request,
  context: RouteContext<"/api/export/admin/guests/[publicId]">,
) {
  if (!(await isAdmin())) return jsonError("Admin only", 401);
  const target = await guestExportTarget((await context.params).publicId);
  if (!target) return jsonError("Guest not found", 404);
  return exportResponse(target, request);
}

export async function POST(
  request: Request,
  context: RouteContext<"/api/export/admin/guests/[publicId]">,
) {
  if (!(await isAdmin())) return jsonError("Admin only", 401);
  const target = await guestExportTarget((await context.params).publicId);
  if (!target) return jsonError("Guest not found", 404);
  return prepareExportResponse(target, request);
}
