import { getDeviceId } from "@/lib/device";
import { jsonError } from "@/lib/http";
import { deleteSelectionResponse } from "@/lib/selection-endpoint";

export async function POST(request: Request) {
  const deviceId = await getDeviceId();
  if (!deviceId) return jsonError("Not your photos", 403);
  return deleteSelectionResponse(request, { uploaderId: deviceId });
}
