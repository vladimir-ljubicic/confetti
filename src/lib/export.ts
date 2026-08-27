// Contract for the export endpoints: 302 to a fresh signed URL when the
// zip is ready (JSON status instead when the client asks for
// application/json), 202 Accepted while it is still packing; never 404.
// The public zip holds public photos only; the admin zip adds private ones
// and sits behind the admin session.
export const EXPORT_PUBLIC_PATH = "/api/export/public";
export const EXPORT_ADMIN_PATH = "/api/export/admin";
export const EXPORT_PACKING_STATUS = 202;

export type ExportState = "packing" | "ready" | "failed";

export type ExportStatus = {
  state: ExportState;
  done: number;
  total: number;
  sizeBytes: number | null;
};

export function parseExportStatus(body: unknown): ExportStatus | null {
  if (typeof body !== "object" || body === null) return null;
  const { state, done, total, sizeBytes } = body as Record<string, unknown>;
  if (state !== "packing" && state !== "ready" && state !== "failed") return null;
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
