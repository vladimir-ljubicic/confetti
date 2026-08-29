import type { Dictionary } from "@/lib/dictionaries";
import { daysUntilFreeze, type EventSchedule } from "@/lib/event-schedule";
import { pluralize, type Locale } from "@/lib/i18n";

// How much longer photos can be added, as the masthead words it. Null once the
// window has closed, where the masthead says nothing.
export function uploadWindowLine(
  dict: Dictionary,
  locale: Locale,
  settings: EventSchedule & { uploadsFrozen: boolean },
  now: Date,
): string | null {
  const daysLeft = daysUntilFreeze(settings, now);
  if (settings.uploadsFrozen || daysLeft <= 0) return null;
  if (daysLeft === 1) return dict.gallery.uploadWindowToday;
  return pluralize(locale, daysLeft, {
    one: dict.gallery.uploadWindowOne,
    few: dict.gallery.uploadWindowFew,
    many: dict.gallery.uploadWindowMany,
  });
}
