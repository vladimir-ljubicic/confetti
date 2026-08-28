"use client";

import { addTransitionType, useOptimistic, useTransition } from "react";
import { LOCALE_TRANSITION_TYPE, type Locale } from "@/lib/i18n";
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
  const [optimisticLocale, setOptimisticLocale] = useOptimistic(locale);

  return (
    <div className="flex items-center rounded-pill border border-ink/15 text-[11px] tracking-[0.1em]">
      {SEGMENTS.map((segment) => {
        const active = segment.locale === optimisticLocale;
        return (
          <button
            key={segment.locale}
            type="button"
            aria-label={active ? undefined : labels.ariaLabel}
            aria-current={active ? "true" : undefined}
            disabled={pending || active}
            onClick={() =>
              startTransition(async () => {
                addTransitionType(LOCALE_TRANSITION_TYPE);
                setOptimisticLocale(segment.locale);
                await setLocale(segment.locale);
              })
            }
            className={`relative px-[11px] py-1.5 transition first:rounded-l-pill last:rounded-r-pill before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] ${
              active ? "bg-gold-small text-card" : "text-ink/60 hover:text-ink active:text-ink"
            }`}
          >
            {segment.label}
          </button>
        );
      })}
    </div>
  );
}
