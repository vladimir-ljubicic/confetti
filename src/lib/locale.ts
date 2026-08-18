import "server-only";
import { cookies } from "next/headers";
import { getDictionary, type Dictionary } from "./dictionaries";
import { LOCALE_COOKIE, resolveLocale, type Locale } from "./i18n";

export async function getLocale(): Promise<Locale> {
  return resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

export async function getDict(): Promise<Dictionary> {
  return getDictionary(await getLocale());
}
