import { isAdmin } from "@/lib/admin-session";
import { ADMIN_EXPORT } from "@/lib/export";
import { exportResponse, prepareExportResponse } from "@/lib/export-endpoint";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  if (!(await isAdmin())) return jsonError("Admin only", 401);
  return exportResponse(ADMIN_EXPORT, request);
}

export async function POST(request: Request) {
  if (!(await isAdmin())) return jsonError("Admin only", 401);
  return prepareExportResponse(ADMIN_EXPORT, request);
}
