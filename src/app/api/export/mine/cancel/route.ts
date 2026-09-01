import { cancelExportResponse } from "@/lib/export-endpoint";
import { jsonError } from "@/lib/http";
import { ownExportTarget } from "../target";

export async function POST() {
  const target = await ownExportTarget();
  if (!target) return jsonError("Not your photos", 403);
  return cancelExportResponse(target);
}
