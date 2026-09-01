import "server-only";
import { getDeviceId } from "@/lib/device";
import { uploaderExport, type ExportTarget } from "@/lib/export";
import { getUploaderProfile } from "@/lib/uploaders";

// The guest's own zip: every photo this device uploaded, private ones
// included. The device cookie is the whole of the authorisation, so the link
// only answers on the device that prepared it.
export async function ownExportTarget(): Promise<ExportTarget | null> {
  const deviceId = await getDeviceId();
  if (!deviceId || !(await getUploaderProfile(deviceId))) return null;
  return uploaderExport(deviceId);
}
