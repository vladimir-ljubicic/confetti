export const LOCALES = ["sr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "sr";

export const LOCALE_COOKIE = "confetti_locale";

export function resolveLocale(value: string | undefined): Locale {
  return (LOCALES as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : DEFAULT_LOCALE;
}
