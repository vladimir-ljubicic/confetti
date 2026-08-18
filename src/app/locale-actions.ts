"use server";

import { cookies } from "next/headers";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n";

// Chrome caps cookie lifetime at 400 days.
const LOCALE_COOKIE_MAX_AGE = 400 * 24 * 60 * 60;

export async function setLocale(locale: string): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, resolveLocale(locale), {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: LOCALE_COOKIE_MAX_AGE,
  });
}
