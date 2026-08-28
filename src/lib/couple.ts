import type { Locale } from "./i18n";

export const COUPLE_NAMES: Record<
  Locale,
  { first: string; and: string; second: string; oneLine: string }
> = {
  sr: { first: "Јелена", and: "и", second: "Владимир", oneLine: "Јелена и Владимир" },
  en: { first: "Jelena", and: "&", second: "Vladimir", oneLine: "Jelena & Vladimir" },
};
