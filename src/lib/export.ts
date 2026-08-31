import { estimateRemainingMs } from "./upload-eta";

// Contract for the export endpoints. GET: 302 to a fresh signed URL when the
// zip is ready (JSON status instead when the client asks for
// application/json), 202 Accepted while it is still packing; never 404.
// POST: prepares the zip — creates the job when there is none or the last one
// was cancelled — and answers with the same JSON status. POST on the cancel
// path cancels a packing admin job (409 when there is nothing to cancel).
// The public zip holds public photos only and exists once uploads freeze; the
// admin zip adds private ones, sits behind the admin session, and can be
// prepared at any time — the freeze then replaces a zip prepared earlier.
export const EXPORT_PUBLIC_PATH = "/api/export/public";
export const EXPORT_ADMIN_PATH = "/api/export/admin";
export const EXPORT_ADMIN_CANCEL_PATH = "/api/export/admin/cancel";
export const EXPORT_PACKING_STATUS = 202;

export type ExportState = "packing" | "ready" | "failed" | "cancelled";

export type ExportStatus = {
  state: ExportState;
  done: number;
  total: number;
  sizeBytes: number | null;
};

export function parseExportStatus(body: unknown): ExportStatus | null {
  if (typeof body !== "object" || body === null) return null;
  const { state, done, total, sizeBytes } = body as Record<string, unknown>;
  if (
    state !== "packing" &&
    state !== "ready" &&
    state !== "failed" &&
    state !== "cancelled"
  ) {
    return null;
  }
  return {
    state,
    done: typeof done === "number" ? done : 0,
    total: typeof total === "number" ? total : 0,
    sizeBytes: typeof sizeBytes === "number" ? sizeBytes : null,
  };
}

// "4.2 GB" / "850 MB" — decimal units, matching the design copy.
export function formatSize(bytes: number): string {
  if (bytes >= 1e9) {
    const gb = bytes / 1e9;
    return `${gb >= 10 ? Math.round(gb) : Math.round(gb * 10) / 10} GB`;
  }
  return `${Math.max(1, Math.round(bytes / 1e6))} MB`;
}

export type PackingSample = { done: number; at: number };

// Packing rate is measured on the client from the progress it has watched,
// so the estimate needs a few polls' worth of samples before it means much.
export const PACKING_ETA_WARMUP_MS = 10_000;

export function packingEtaMs(
  first: PackingSample,
  latest: PackingSample,
  total: number,
): number | null {
  const elapsed = latest.at - first.at;
  if (elapsed < PACKING_ETA_WARMUP_MS) return null;
  return estimateRemainingMs(latest.done - first.done, total - first.done, elapsed);
}
