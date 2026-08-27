import { isAdmin } from "@/lib/admin-session";
import { exportResponse } from "@/lib/export-endpoint";
import { jsonError } from "@/lib/http";

export async function GET(request: Request) {
  if (!(await isAdmin())) return jsonError("Admin only", 401);
  return exportResponse("admin", request);
}
