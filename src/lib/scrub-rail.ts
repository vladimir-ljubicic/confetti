import { EVENT_TIME_ZONE } from "./event-schedule";
import { INTL_LOCALES, type Locale } from "./i18n";
import type { SortMode } from "./sort-mode";

// Below this the native scrollbar is still a grabbable sliver and a flick or
// two covers the gallery, so a rail of our own would be noise.
const SCRUB_RAIL_MIN_PHOTOS = 300;

export function scrubRailShown(photoCount: number): boolean {
  return photoCount > SCRUB_RAIL_MIN_PHOTOS;
}

export const SCRUB_THUMB_HEIGHT = 56;

function clampUnit(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

// How far down the page the guest has come, as a fraction of the whole. A page
// that does not scroll is at its top rather than at both ends at once.
export function scrollProgress(
  scrollY: number,
  scrollHeight: number,
  viewportHeight: number,
): number {
  const range = scrollHeight - viewportHeight;
  return range <= 0 ? 0 : clampUnit(scrollY / range);
}

export function scrubScrollTop(
  progress: number,
  scrollHeight: number,
  viewportHeight: number,
): number {
  return clampUnit(progress) * Math.max(0, scrollHeight - viewportHeight);
}

// The photo the thumb stands on. The grid balances its two columns, so the
// same fraction of the page is the same fraction of the list.
export function scrubbedIndex(progress: number, count: number): number {
  if (count === 0) return -1;
  return Math.min(count - 1, Math.floor(clampUnit(progress) * count));
}

// Where a drag has taken the progress. The finger holds the point of the thumb
// it came down on, so the thumb does not jump under it when the drag starts.
export function dragProgress(
  pointerY: number,
  grabOffset: number,
  track: { top: number; height: number },
): number {
  const travel = track.height - SCRUB_THUMB_HEIGHT;
  if (travel <= 0) return 0;
  return clampUnit((pointerY - grabOffset - track.top) / travel);
}

// The like counts the popular order's bands are drawn at: the floor of the
// album's top tenth, top two fifths and top seven tenths. Bands come from the
// album's own distribution, since what counts as well liked is a fact about
// this album and not a number to fix in advance. A band the album cannot fill
// — one whose floor is zero, or one already drawn — is left out.
const BAND_PERCENTILES = [90, 60, 30];

export function likeThresholds(likeCounts: number[]): number[] {
  const ascending = [...likeCounts].sort((a, b) => a - b);
  const thresholds: number[] = [];
  for (const percentile of BAND_PERCENTILES) {
    const index = Math.ceil((ascending.length * percentile) / 100);
    const floor = index < ascending.length ? ascending[index] : 0;
    if (floor > 0 && !thresholds.includes(floor)) thresholds.push(floor);
  }
  return thresholds;
}

export type ScrubLabels = {
  morning: string;
  afternoon: string;
  evening: string;
  night: string;
  dearest: string;
  loved: string;
  noLikes: string;
};

// What the bubble says: a value in the terms the list is ordered by, the heart
// that value is counted in when it is likes, and the band or part of the day
// it belongs to.
export type ScrubBubble = {
  value: string;
  heart: boolean;
  caption: string | null;
};

const clockFormats = new Map<Locale, Intl.DateTimeFormat>();

function belgradeParts(locale: Locale, instant: Date) {
  let format = clockFormats.get(locale);
  if (!format) {
    format = new Intl.DateTimeFormat(INTL_LOCALES[locale], {
      timeZone: EVENT_TIME_ZONE,
      weekday: "long",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    });
    clockFormats.set(locale, format);
  }
  const parts = format.formatToParts(instant);
  const part = (type: string) =>
    parts.find((candidate) => candidate.type === type)?.value ?? "";
  return {
    weekday: part("weekday"),
    hour: Number(part("hour")),
    clock: `${part("hour")}:${part("minute")}`,
  };
}

function partOfDay(hour: number, labels: ScrubLabels): string {
  if (hour < 5) return labels.night;
  if (hour < 12) return labels.morning;
  if (hour < 18) return labels.afternoon;
  if (hour < 23) return labels.evening;
  return labels.night;
}

function likeBubble(
  likeCount: number,
  thresholds: number[],
  labels: ScrubLabels,
): ScrubBubble {
  if (likeCount === 0) {
    return { value: labels.noLikes, heart: false, caption: null };
  }
  const band = thresholds.findIndex((threshold) => likeCount >= threshold);
  // Under the album's lowest band the only floor left is having been liked at
  // all, which is where the band of photos nobody has liked begins. Saying
  // such a photo has no likes, or lifting it into a band it never reached,
  // would both be lies about the tile under the thumb.
  const floor = band < 0 ? 1 : thresholds[band];
  const caption =
    band === 0 ? labels.dearest : band === 1 ? labels.loved : null;
  return { value: `${floor}+`, heart: true, caption };
}

// The bubble always states the value the list is ordered by: the time of day a
// photo joined the gallery in the latest order, the band it falls in in the
// popular one. A date would read the same end to end — every photo is from the
// same wedding — and so would say nothing about where the guest is.
export function scrubBubble(
  photo: { uploadedAt: string; likeCount: number },
  sort: SortMode,
  thresholds: number[],
  locale: Locale,
  labels: ScrubLabels,
): ScrubBubble {
  if (sort === "popular") return likeBubble(photo.likeCount, thresholds, labels);
  const { weekday, hour, clock } = belgradeParts(locale, new Date(photo.uploadedAt));
  return {
    value: clock,
    heart: false,
    caption: `${weekday} ${partOfDay(hour, labels)}`,
  };
}
