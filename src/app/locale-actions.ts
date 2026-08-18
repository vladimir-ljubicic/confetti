"use server";

import { cookies } from "next/headers";
import { LONG_LIVED_COOKIE_MAX_AGE_SECONDS } from "@/lib/cookies";
import { LOCALE_COOKIE, resolveLocale } from "@/lib/i18n";

export async function setLocale(locale: string): Promise<void> {
  (await cookies()).set(LOCALE_COOKIE, resolveLocale(locale), {
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: LONG_LIVED_COOKIE_MAX_AGE_SECONDS,
  });
}
