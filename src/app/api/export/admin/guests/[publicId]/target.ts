import "server-only";
import { uploaderExport, type ExportTarget } from "@/lib/export";
import { getUploaderByPublicId } from "@/lib/uploaders";

// One guest's zip as the admin addresses it: the guest is named by their
// public id, while the job behind it is keyed by the uploader row — the same
// zip that guest prepares from their own page.
export async function guestExportTarget(publicId: string): Promise<ExportTarget | null> {
  const uploader = await getUploaderByPublicId(publicId);
  return uploader ? uploaderExport(uploader.uploaderId) : null;
}
