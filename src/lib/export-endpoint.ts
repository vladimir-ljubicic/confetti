import "server-only";
import { after, NextResponse } from "next/server";
import { areUploadsFrozen } from "./event-settings";
import {
  EXPORT_EXPIRED_STATUS,
  EXPORT_PACKING_STATUS,
  parsePrepareRequest,
  type ExportStatus,
} from "./export";
import {
  cancelExportJob,
  exportJobStale,
  exportJobStatus,
  getExportJob,
  kickExportBuild,
  prepareExportJob,
  signedZipUrl,
  type ExportKind,
} from "./export-jobs";
import { jsonError } from "./http";

function statusResponse(status: ExportStatus): NextResponse {
  if (status.state === "failed") return NextResponse.json(status, { status: 500 });
  if (status.state === "packing") {
    return NextResponse.json(status, { status: EXPORT_PACKING_STATUS });
  }
  if (status.state === "expired") {
    return NextResponse.json(status, { status: EXPORT_EXPIRED_STATUS });
  }
  return NextResponse.json(status);
}

// The stable export endpoint: JSON status for clients that ask for it, a 302
// to a fresh short-lived signed URL for everyone else once the zip is ready,
// 202 while packing, 410 once the link has expired — never 404, so forwarded
// links keep answering.
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

  if (!job || status.state !== "ready") return statusResponse(status);
  if (request.headers.get("accept")?.includes("application/json")) {
    return NextResponse.json(status);
  }
  const url = await signedZipUrl(job);
  if (!url) return NextResponse.json({ error: "Could not sign download" }, { status: 500 });
  return NextResponse.redirect(url, 302);
}

// Prepare: makes sure a job exists and has a worker, then reports its status.
export async function prepareExportResponse(
  kind: ExportKind,
  request: Request,
): Promise<NextResponse> {
  const { includePrivate } = parsePrepareRequest(await request.json().catch(() => null));
  const prepared = await prepareExportJob(kind, includePrivate);
  if (!prepared) return jsonError("Uploads are still open", 409);
  const { job, created } = prepared;
  if (job.state === "packing" && (created || exportJobStale(job, new Date()))) {
    const origin = new URL(request.url).origin;
    after(() => kickExportBuild(origin, kind));
  }
  return statusResponse(exportJobStatus(job));
}

export async function cancelExportResponse(kind: ExportKind): Promise<NextResponse> {
  const job = await cancelExportJob(kind);
  if (!job) return jsonError("Nothing to cancel", 409);
  return statusResponse(exportJobStatus(job));
}
