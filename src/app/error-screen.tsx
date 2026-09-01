"use client";

import type { Locale } from "@/lib/i18n";
import { ConfettiMark } from "./confetti-mark";
import { ConfettiWordmark } from "./confetti-wordmark";
import { LocaleToggle } from "./locale-toggle";

export function ErrorScreen({
  locale,
  labels,
}: {
  locale: Locale;
  labels: {
    titleLine1: string;
    titleLine2: string;
    body: string;
    retry: string;
    localeAriaLabel: string;
  };
}) {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <div className="flex items-center justify-between px-[18px] pt-3.5 pb-3">
        <ConfettiWordmark variant="static" reload />
        <LocaleToggle locale={locale} labels={{ ariaLabel: labels.localeAriaLabel }} />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-[34px] pb-[60px] text-center">
        <ConfettiMark size={22} variant="desaturated" />
        <h1 className="font-serif text-[32px] leading-[1.15] font-medium text-gold-small">
          {labels.titleLine1}
          <br />
          {labels.titleLine2}
        </h1>
        <p className="max-w-[270px] text-sm leading-[1.6] text-pretty text-ink-muted">
          {labels.body}
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="flex min-h-12 items-center justify-center rounded-pill border border-ink/18 bg-card px-6 text-[15px] text-gold-small transition active:bg-gold-tint"
        >
          {labels.retry}
        </button>
      </div>
    </main>
  );
}
