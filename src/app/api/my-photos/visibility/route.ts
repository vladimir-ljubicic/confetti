import { getDeviceId } from "@/lib/device";
import { jsonError } from "@/lib/http";
import { visibilitySelectionResponse } from "@/lib/selection-endpoint";

export async function POST(request: Request) {
  const deviceId = await getDeviceId();
  if (!deviceId) return jsonError("Not your photos", 403);
  return visibilitySelectionResponse(request, { uploaderId: deviceId });
}
