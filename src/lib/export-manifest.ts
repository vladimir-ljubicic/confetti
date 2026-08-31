import { EVENT_TIME_ZONE } from "./event-schedule";
import type { DosClock } from "./zip";

// One zip entry, snapshotted at freeze time. Stored in the job row so every
// packing invocation regenerates byte-identical archive content.
export type ManifestEntry = {
  path: string;
  name: string;
  size: number;
  takenAt: string;
};

export type ExportPhoto = {
  storagePath: string;
  originalFilename: string;
  sizeBytes: number;
  takenAt: string;
  displayName: string | null;
};

export const UNKNOWN_UPLOADER_FOLDER = "Непознат гост";

export function belgradeClock(iso: string): DosClock {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: string) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour") % 24,
    minute: get("minute"),
    second: get("second"),
  };
}

function pad(value: number, width: number): string {
  return String(value).padStart(width, "0");
}

export function timestampPrefix(iso: string): string {
  const clock = belgradeClock(iso);
  return `${pad(clock.year, 4)}${pad(clock.month, 2)}${pad(clock.day, 2)}_${pad(clock.hour, 2)}${pad(clock.minute, 2)}${pad(clock.second, 2)}`;
}

function sanitize(value: string): string {
  return value
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\.+$/, "");
}

export function folderName(displayName: string | null): string {
  const cleaned = sanitize(displayName ?? "");
  return cleaned === "" ? UNKNOWN_UPLOADER_FOLDER : cleaned;
}

function withSuffix(name: string, ordinal: number): string {
  if (ordinal === 1) return name;
  const dot = name.lastIndexOf(".");
  return dot > 0
    ? `${name.slice(0, dot)} (${ordinal})${name.slice(dot)}`
    : `${name} (${ordinal})`;
}

export function buildManifest(photos: ExportPhoto[]): ManifestEntry[] {
  const sorted = [...photos].sort((a, b) => {
    const folder = folderName(a.displayName).localeCompare(
      folderName(b.displayName),
      "sr",
    );
    if (folder !== 0) return folder;
    if (a.takenAt !== b.takenAt) return a.takenAt < b.takenAt ? -1 : 1;
    return a.storagePath.localeCompare(b.storagePath);
  });
  const taken = new Set<string>();
  return sorted.map((photo) => {
    const filename = sanitize(photo.originalFilename) || "photo";
    const base = `${folderName(photo.displayName)}/${timestampPrefix(photo.takenAt)}_${filename}`;
    let ordinal = 1;
    let name = base;
    while (taken.has(name)) name = withSuffix(base, ++ordinal);
    taken.add(name);
    return {
      path: photo.storagePath,
      name,
      size: photo.sizeBytes,
      takenAt: photo.takenAt,
    };
  });
}
