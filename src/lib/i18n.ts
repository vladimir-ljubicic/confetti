export const LOCALES = ["sr", "en"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "sr";

export const LOCALE_COOKIE = "confetti_locale";

// BCP-47 tags for Intl formatters.
export const INTL_LOCALES: Record<Locale, string> = { sr: "sr-RS", en: "en-GB" };

export type PluralForms = { one: string; few: string; many: string };

// Serbian distinguishes one/few/other; English collapses to one/other.
// "many" holds the CLDR "other" template for both.
export function pluralize(
  locale: Locale,
  count: number,
  forms: PluralForms,
): string {
  const category = new Intl.PluralRules(INTL_LOCALES[locale]).select(count);
  const template =
    category === "one" ? forms.one : category === "few" ? forms.few : forms.many;
  return template.replace("{count}", String(count));
}

export function resolveLocale(value: string | undefined): Locale {
  return (LOCALES as readonly string[]).includes(value ?? "")
    ? (value as Locale)
    : DEFAULT_LOCALE;
}
