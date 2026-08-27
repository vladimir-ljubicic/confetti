"use client";

import { useTransition } from "react";
import type { Locale } from "@/lib/i18n";
import { setLocale } from "./locale-actions";

const SEGMENTS: { locale: Locale; label: string }[] = [
  { locale: "sr", label: "СР" },
  { locale: "en", label: "EN" },
];

export function LocaleToggle({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { ariaLabel: string };
}) {
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex items-center overflow-hidden rounded-pill border border-ink/15 text-[11px] tracking-[0.1em]">
      {SEGMENTS.map((segment) => {
        const active = segment.locale === locale;
        return (
          <button
            key={segment.locale}
            type="button"
            aria-label={active ? undefined : labels.ariaLabel}
            aria-current={active ? "true" : undefined}
            disabled={pending || active}
            onClick={() => startTransition(() => setLocale(segment.locale))}
            className={`px-[11px] py-1.5 transition ${
              active ? "bg-gold-small text-card" : "text-ink/60 hover:text-ink"
            }`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
