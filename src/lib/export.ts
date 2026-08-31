import { addDays, belgradeDateIso, belgradeMidnight } from "./event-schedule";
import { belgradeClock } from "./export-manifest";
import { estimateRemainingMs } from "./upload-eta";

// Contract for the export endpoints. GET: 302 to a fresh signed URL when the
// zip is ready (JSON status instead when the client asks for
// application/json), 202 Accepted while it is still packing, 410 Gone once
// the link's validity has lapsed; never 404. POST: prepares the zip — creates
// the job when there is none or the last one was cancelled or expired — and
// answers with the same JSON status. POST on the cancel path cancels a
// packing admin job (409 when there is nothing to cancel).
// The public zip holds public photos only and exists once uploads freeze; the
// admin zip sits behind the admin session, can be prepared at any time — the
// freeze then replaces a zip prepared earlier — and takes the private-photos
// choice in the POST body; preparing with a different choice replaces the
// live zip.
// A ready zip stays downloadable for a week; after that the object is purged
// and the zip has to be prepared again.
export const EXPORT_PUBLIC_PATH = "/api/export/public";
export const EXPORT_ADMIN_PATH = "/api/export/admin";
export const EXPORT_ADMIN_CANCEL_PATH = "/api/export/admin/cancel";
export const EXPORT_PACKING_STATUS = 202;
export const EXPORT_EXPIRED_STATUS = 410;
export const EXPORT_LINK_VALIDITY_DAYS = 7;

const EXPORT_STATES = ["packing", "ready", "failed", "cancelled", "expired"] as const;
export type ExportState = (typeof EXPORT_STATES)[number];

export type ExportStatus = {
  state: ExportState;
  done: number;
  total: number;
  sizeBytes: number | null;
  expiresAt: string | null;
};

export function parseExportStatus(body: unknown): ExportStatus | null {
  if (typeof body !== "object" || body === null) return null;
  const { state, done, total, sizeBytes, expiresAt } = body as Record<string, unknown>;
  if (!(EXPORT_STATES as readonly unknown[]).includes(state)) return null;
  return {
    state: state as ExportState,
    done: typeof done === "number" ? done : 0,
    total: typeof total === "number" ? total : 0,
    sizeBytes: typeof sizeBytes === "number" ? sizeBytes : null,
    expiresAt: typeof expiresAt === "string" ? expiresAt : null,
  };
}

export type PrepareRequest = { includePrivate: boolean };
export const DEFAULT_INCLUDE_PRIVATE = true;

// Anything but an explicit boolean falls back to the default.
export function parsePrepareRequest(body: unknown): PrepareRequest {
  const includePrivate =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).includePrivate
      : undefined;
  return {
    includePrivate:
      typeof includePrivate === "boolean" ? includePrivate : DEFAULT_INCLUDE_PRIVATE,
  };
}

// The link holds through the whole of its last valid day (Belgrade), so the
// date the card names is the last day the link works.
export function linkExpiresAt(readyAt: Date): string {
  const lastDay = addDays(belgradeDateIso(readyAt), EXPORT_LINK_VALIDITY_DAYS);
  return new Date(belgradeMidnight(addDays(lastDay, 1)).getTime() - 1).toISOString();
}

// The stored state, except that a ready zip counts as expired once its
// deadline has passed — whether or not the nightly purge has caught up.
export function resolveExportState(
  state: ExportState,
  expiresAt: string | null,
  now: Date,
): ExportState {
  if (state === "ready" && expiresAt !== null && Date.parse(expiresAt) <= now.getTime()) {
    return "expired";
  }
  return state;
}

// "03.09." — the instant's calendar date in the event's time zone.
export function formatDayMonth(iso: string): string {
  const clock = belgradeClock(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(clock.day)}.${pad(clock.month)}.`;
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
