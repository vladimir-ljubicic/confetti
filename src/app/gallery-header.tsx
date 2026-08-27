"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { SortMode } from "@/lib/sort-mode";
import { ConfettiMark } from "./confetti-mark";
import { LocaleToggle } from "./locale-toggle";
import { SortToggle } from "./sort-toggle";

// Scroll depth at which the masthead is gone and the compact bar's
// name block may appear without duplicating it.
const MASTHEAD_SCROLL_PX = 140;

const TOP_ROW_FALLBACK_HEIGHT_PX = 57;

export function GalleryHeader({
  displayName,
  photoCount,
  sort,
  locale,
  labels,
}: {
  displayName: string | null;
  photoCount: number;
  sort: SortMode;
  locale: Locale;
  labels: {
    eyebrow: string;
    myPhotos: string;
    sortLive: string;
    sortChrono: string;
    localeAriaLabel: string;
  };
}) {
  const topRowRef = useRef<HTMLDivElement>(null);
  const [topRowHeight, setTopRowHeight] = useState(TOP_ROW_FALLBACK_HEIGHT_PX);
  const [pastMasthead, setPastMasthead] = useState(false);

  useEffect(() => {
    const topRow = topRowRef.current;
    if (!topRow) return;
    const observer = new ResizeObserver(() => setTopRowHeight(topRow.offsetHeight));
    observer.observe(topRow);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setPastMasthead(window.scrollY > MASTHEAD_SCROLL_PX);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <>
      <div
        ref={topRowRef}
        className="sticky top-0 z-[4] flex items-center justify-between bg-paper px-[18px] pt-3.5 pb-3"
      >
        <span className="flex items-center gap-1.5">
          <ConfettiMark size={14} variant="animated" />
          <span className="text-[11px] text-ink/45 uppercase tracking-[0.2em]">Confetti</span>
        </span>
        <div className="flex items-center gap-2.5">
          <LocaleToggle locale={locale} labels={{ ariaLabel: labels.localeAriaLabel }} />
          {displayName && (
            <Link href="/my-photos" aria-label={labels.myPhotos} className="-m-1.5 p-1.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 bg-sand font-serif text-base text-gold-deep">
                {displayName.trim().charAt(0).toLocaleUpperCase(locale)}
              </span>
            </Link>
          )}
        </div>
      </div>

      <header className="flex flex-col items-center gap-[11px] px-7 pt-4 pb-[26px] text-center">
        <span className="text-[11px] text-gold uppercase tracking-[0.28em]">{labels.eyebrow}</span>
        <h1 className="font-serif text-masthead font-medium text-gold-small">
          Јелена
          <br />
          <span className="text-[31px] text-gold italic">и</span>
          <br />
          Владимир
        </h1>
        <div className="flex items-center gap-2.5 text-ink/30">
          <span className="block h-px w-[34px] bg-current" />
          <span className="text-meta tracking-[0.22em] text-ink/60">20 · 09 · 2026</span>
          <span className="block h-px w-[34px] bg-current" />
        </div>
      </header>

      <div
        style={{ top: topRowHeight }}
        className="sticky z-[3] flex items-center gap-2.5 border-b border-ink/7 bg-paper/94 px-4 pt-[9px] pb-3 backdrop-blur-[10px]"
      >
        <div
          className={`flex min-w-0 shrink-0 flex-col transition-opacity duration-[220ms] ${
            pastMasthead ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="font-serif text-[19px] leading-[1.15] whitespace-nowrap text-gold-small">
            Јелена и Владимир
          </span>
          <span className="text-[11px] tracking-[0.16em] text-ink/68">
            20.09.2026 · {photoCount}
          </span>
        </div>
        {photoCount > 0 && (
          <div className="ml-auto">
            <SortToggle
              sort={sort}
              basePath="/"
              labels={{ live: labels.sortLive, chrono: labels.sortChrono }}
            />
          </div>
        )}
      </div>
    </>
  );
}
