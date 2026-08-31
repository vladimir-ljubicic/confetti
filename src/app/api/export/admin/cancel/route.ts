import { isAdmin } from "@/lib/admin-session";
import { cancelExportResponse } from "@/lib/export-endpoint";
import { jsonError } from "@/lib/http";

export async function POST() {
  if (!(await isAdmin())) return jsonError("Admin only", 401);
  return cancelExportResponse("admin");
}
