"use client";

import { useTransition } from "react";
import type { Locale } from "@/lib/i18n";
import { setLocale } from "./locale-actions";

const FLAGS: Record<Locale, string> = { sr: "🇷🇸", en: "🇬🇧" };

export function LocaleToggle({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { ariaLabel: string };
}) {
  const [pending, startTransition] = useTransition();
  const target: Locale = locale === "sr" ? "en" : "sr";

  return (
    <button
      type="button"
      aria-label={labels.ariaLabel}
      disabled={pending}
      onClick={() => startTransition(() => setLocale(target))}
      className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-ink/15 shadow-sm transition hover:border-ink/30 disabled:opacity-60"
    >
      {/* Oversized and cropped by the circle so the emoji's built-in padding
          doesn't shrink it to a dot. */}
      <span aria-hidden className="text-[52px] leading-none">
        {FLAGS[target]}
      </span>
    </button>
  );
}
