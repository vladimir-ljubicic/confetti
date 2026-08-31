// The event runs on Belgrade wall-clock time.
export const EVENT_TIME_ZONE = "Europe/Belgrade";

export const DEFAULT_EVENT_DATE_ISO = "2026-09-20";
export const DEFAULT_FREEZE_OFFSET_DAYS = 7;

export type EventSchedule = {
  eventDateIso: string;
  freezeOffsetDays: number;
};

export function addDays(dateIso: string, days: number): string {
  const date = new Date(`${dateIso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function utcOffsetAt(instant: Date): string {
  const name = new Intl.DateTimeFormat("en-US", {
    timeZone: EVENT_TIME_ZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(instant)
    .find((part) => part.type === "timeZoneName")?.value;
  // "GMT+02:00" → "+02:00"; plain "GMT" means no offset.
  return name && name.length > 3 ? name.slice(3) : "+00:00";
}

// The instant a Belgrade calendar day begins.
export function belgradeMidnight(dateIso: string): Date {
  // The zone offset depends on the instant being computed, so guess with
  // summer time first and redo the arithmetic if that date is on winter time.
  const guess = new Date(`${dateIso}T00:00:00+02:00`);
  const offset = utcOffsetAt(guess);
  return offset === "+02:00" ? guess : new Date(`${dateIso}T00:00:00${offset}`);
}

// Uploads close at midnight (Belgrade) after the last day of the window.
export function uploadFreezeAt(schedule: EventSchedule): Date {
  return belgradeMidnight(addDays(schedule.eventDateIso, schedule.freezeOffsetDays));
}

export function freezeDue(schedule: EventSchedule, now: Date): boolean {
  return now.getTime() >= uploadFreezeAt(schedule).getTime();
}

export function belgradeDateIso(instant: Date): string {
  // en-CA formats as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: EVENT_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

// Belgrade calendar days left to upload, counting today: 1 means the window
// closes tonight at midnight; 0 or less means it is already shut.
export function daysUntilFreeze(schedule: EventSchedule, now: Date): number {
  const closesOn = addDays(schedule.eventDateIso, schedule.freezeOffsetDays);
  const today = belgradeDateIso(now);
  return (
    (Date.parse(`${closesOn}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) /
    86_400_000
  );
}

export function formatEventDate(dateIso: string, separator: string): string {
  const [year, month, day] = dateIso.split("-");
  return [day, month, year].join(separator);
}
