import { exportResponse } from "@/lib/export-endpoint";

export async function GET(request: Request) {
  return exportResponse("public", request);
}
