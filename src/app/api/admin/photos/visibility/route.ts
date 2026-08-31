import { isAdmin } from "@/lib/admin-session";
import { jsonError } from "@/lib/http";
import { visibilitySelectionResponse } from "@/lib/selection-endpoint";

export async function POST(request: Request) {
  if (!(await isAdmin())) return jsonError("Admin only", 403);
  return visibilitySelectionResponse(request, { uploaderId: null });
}
