// The wedding gallery serves a single hardcoded event.
export const EVENT_DATE_ISO = "2026-09-20";

// Uploads close automatically 7 days after the event (Belgrade midnight).
export const UPLOAD_FREEZE_AT = new Date("2026-09-27T00:00:00+02:00");

export function freezeDue(now: Date): boolean {
  return now.getTime() >= UPLOAD_FREEZE_AT.getTime();
}
