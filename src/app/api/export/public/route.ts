import { exportResponse, prepareExportResponse } from "@/lib/export-endpoint";

export async function GET(request: Request) {
  return exportResponse("public", request);
}

export async function POST(request: Request) {
  return prepareExportResponse("public", request);
}
