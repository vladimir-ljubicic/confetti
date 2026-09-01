import { exportResponse, prepareExportResponse } from "@/lib/export-endpoint";
import { jsonError } from "@/lib/http";
import { ownExportTarget } from "./target";

export async function GET(request: Request) {
  const target = await ownExportTarget();
  if (!target) return jsonError("Not your photos", 403);
  return exportResponse(target, request);
}

export async function POST(request: Request) {
  const target = await ownExportTarget();
  if (!target) return jsonError("Not your photos", 403);
  return prepareExportResponse(target, request);
}
