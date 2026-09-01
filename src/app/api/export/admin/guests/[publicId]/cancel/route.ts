import { isAdmin } from "@/lib/admin-session";
import { cancelExportResponse } from "@/lib/export-endpoint";
import { jsonError } from "@/lib/http";
import { guestExportTarget } from "../target";

export async function POST(
  _request: Request,
  context: RouteContext<"/api/export/admin/guests/[publicId]/cancel">,
) {
  if (!(await isAdmin())) return jsonError("Admin only", 401);
  const target = await guestExportTarget((await context.params).publicId);
  if (!target) return jsonError("Guest not found", 404);
  return cancelExportResponse(target);
}
