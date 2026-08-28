"use client";

import { useEffect, useState } from "react";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  resolveLocale,
  type Locale,
} from "@/lib/i18n";
import { ErrorScreen } from "./error-screen";

// Copy lives here rather than in dictionaries.ts: that module is server-only,
// and an error boundary must render without a server round-trip.
const COPY: Record<
  Locale,
  {
    titleLine1: string;
    titleLine2: string;
    body: string;
    retry: string;
    localeAriaLabel: string;
  }
> = {
  sr: {
    titleLine1: "Нешто није",
    titleLine2: "у реду",
    body: "Галерија се тренутно не може учитати. Сачекајте тренутак и пробајте поново.",
    retry: "Пробај поново",
    localeAriaLabel: "Switch to English",
  },
  en: {
    titleLine1: "Something's",
    titleLine2: "not right",
    body: "The gallery couldn't load. Give it a moment and try again.",
    retry: "Try again",
    localeAriaLabel: "Пребаци на српски",
  },
};

function cookieLocale(): Locale {
  if (typeof document === "undefined") return DEFAULT_LOCALE;
  const value = document.cookie
    .split("; ")
    .find((part) => part.startsWith(`${LOCALE_COOKIE}=`))
    ?.split("=")[1];
  return resolveLocale(value);
}

export default function AppError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  const [locale] = useState(cookieLocale);
  return <ErrorScreen locale={locale} labels={COPY[locale]} />;
}
