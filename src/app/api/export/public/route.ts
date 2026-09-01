import { PUBLIC_EXPORT } from "@/lib/export";
import { exportResponse, prepareExportResponse } from "@/lib/export-endpoint";

export async function GET(request: Request) {
  return exportResponse(PUBLIC_EXPORT, request);
}

export async function POST(request: Request) {
  return prepareExportResponse(PUBLIC_EXPORT, request);
}
