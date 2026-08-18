export type SortMode = "live" | "chrono";

// End of the wedding day (2026-09-20) in Belgrade, UTC+2 in September.
const WEDDING_DAY_END = new Date("2026-09-21T00:00:00+02:00");

export function resolveSortMode(param: string | undefined, now: Date): SortMode {
  if (param === "live" || param === "chrono") return param;
  return now < WEDDING_DAY_END ? "live" : "chrono";
}
