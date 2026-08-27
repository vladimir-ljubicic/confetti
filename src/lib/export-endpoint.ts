import "server-only";
import { after, NextResponse } from "next/server";
import { areUploadsFrozen } from "./event-settings";
import { EXPORT_PACKING_STATUS } from "./export";
import {
  exportJobStale,
  exportJobStatus,
  getExportJob,
  kickExportBuild,
  signedZipUrl,
  type ExportKind,
} from "./export-jobs";

// The stable export endpoint: JSON status for clients that ask for it, a 302
// to a fresh short-lived signed URL for everyone else once the zip is ready,
// 202 while packing — never 404, so forwarded links keep working.
export async function exportResponse(
  kind: ExportKind,
  request: Request,
): Promise<NextResponse> {
  const job = await getExportJob(kind);
  const status = exportJobStatus(job);

  // Self-healing: traffic kicks a build that never started or lost its worker.
  const shouldKick = job
    ? exportJobStale(job, new Date())
    : await areUploadsFrozen().catch(() => false);
  if (shouldKick) {
    const origin = new URL(request.url).origin;
    after(() => kickExportBuild(origin, kind));
  }

  if (status.state === "failed") return NextResponse.json(status, { status: 500 });
  if (status.state === "packing" || !job) {
    return NextResponse.json(status, { status: EXPORT_PACKING_STATUS });
  }
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json(status);
  }
  const url = await signedZipUrl(job);
  if (!url) return NextResponse.json({ error: "Could not sign download" }, { status: 500 });
  return NextResponse.redirect(url, 302);
}
