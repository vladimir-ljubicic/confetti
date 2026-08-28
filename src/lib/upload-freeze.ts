// 423 Locked
export const UPLOADS_FROZEN_STATUS = 423;

export type SettingsPatch = {
  uploadsFrozen?: boolean;
  eventDate?: string;
  freezeOffsetDays?: number;
};

function validIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  // Round-trips only when the calendar date exists (rejects e.g. 2026-02-30).
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export function parseSettingsPatch(body: unknown): SettingsPatch | null {
  if (typeof body !== "object" || body === null) return null;
  const { uploadsFrozen, eventDate, freezeOffsetDays } = body as Record<
    string,
    unknown
  >;

  const patch: SettingsPatch = {};
  if (uploadsFrozen !== undefined) {
    if (typeof uploadsFrozen !== "boolean") return null;
    patch.uploadsFrozen = uploadsFrozen;
  }
  if (eventDate !== undefined) {
    if (typeof eventDate !== "string" || !validIsoDate(eventDate)) return null;
    patch.eventDate = eventDate;
  }
  if (freezeOffsetDays !== undefined) {
    if (
      typeof freezeOffsetDays !== "number" ||
      !Number.isInteger(freezeOffsetDays) ||
      freezeOffsetDays < 0
    )
      return null;
    patch.freezeOffsetDays = freezeOffsetDays;
  }
  return Object.keys(patch).length > 0 ? patch : null;
}
