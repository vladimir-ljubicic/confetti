"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { COUPLE_NAMES } from "@/lib/couple";
import type { Locale } from "@/lib/i18n";
import type { SortMode } from "@/lib/sort-mode";
import { ConfettiMark } from "./confetti-mark";
import { PROFILE_SAVED_EVENT } from "./intro-sheet";
import { LocaleToggle } from "./locale-toggle";
import { OfflineNotice, type OfflineNoticeLabels } from "./offline-notice";
import { SortToggle } from "./sort-toggle";

// Scroll depth at which the masthead is gone and the compact bar's
// name block may appear without duplicating it.
const MASTHEAD_SCROLL_PX = 140;

const TOP_ROW_FALLBACK_HEIGHT_PX = 57;

const COMPACT_BAR_FALLBACK_HEIGHT_PX = 60;

const COACH_MARK_SEEN_KEY = "confetti:coach-mark-seen";

const COACH_MARK_TTL_MS = 6000;

// Vectors biased left/down so no fleck clips the viewport edge.
const BURST_FLECKS = [
  { color: "bg-gold", bx: -30, by: -18, delay: 0.45 },
  { color: "bg-ink", bx: -8, by: -30, delay: 0.52 },
  { color: "bg-gold-light", bx: 6, by: -34, delay: 0.59 },
  { color: "bg-gold-small", bx: -34, by: 14, delay: 0.66 },
  { color: "bg-gold", bx: -14, by: 30, delay: 0.73 },
];

function coachMarkSeen(): boolean {
  try {
    return localStorage.getItem(COACH_MARK_SEEN_KEY) !== null;
  } catch {
    // Storage unavailable: the flag could never persist, so showing the
    // coach mark would repeat it on every visit.
    return true;
  }
}

function persistCoachMarkSeen() {
  try {
    localStorage.setItem(COACH_MARK_SEEN_KEY, "1");
  } catch {
    // Best-effort.
  }
}

export function GalleryHeader({
  displayName,
  photoCount,
  sort,
  locale,
  labels,
  frozenNotice,
  offlineNotice,
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
    coachMark: string;
    coachMarkDismiss: string;
  };
  frozenNotice?: { title: string; body: string } | null;
  offlineNotice?: OfflineNoticeLabels | null;
}) {
  const topRowRef = useRef<HTMLDivElement>(null);
  const compactBarRef = useRef<HTMLDivElement>(null);
  const [topRowHeight, setTopRowHeight] = useState(TOP_ROW_FALLBACK_HEIGHT_PX);
  const [compactBarHeight, setCompactBarHeight] = useState(
    COMPACT_BAR_FALLBACK_HEIGHT_PX,
  );
  const [pastMasthead, setPastMasthead] = useState(false);
  const [savedName, setSavedName] = useState<string | null>(null);
  const [arrival, setArrival] = useState(false);
  const [coachMark, setCoachMark] = useState(false);

  const name = displayName ?? savedName;

  useEffect(() => {
    const begin = () => {
      if (coachMarkSeen()) return;
      setArrival(true);
      setCoachMark(true);
    };
    // The first upload can happen from the empty gallery, where this header
    // does not exist yet; it then mounts with the avatar already present.
    if (displayName) begin();
    const onProfileSaved = (event: Event) => {
      const detail = (event as CustomEvent<{ displayName?: string }>).detail;
      if (typeof detail?.displayName === "string") setSavedName(detail.displayName);
      begin();
    };
    window.addEventListener(PROFILE_SAVED_EVENT, onProfileSaved);
    return () => window.removeEventListener(PROFILE_SAVED_EVENT, onProfileSaved);
  }, [displayName]);

  const dismissCoachMark = useCallback(() => {
    persistCoachMarkSeen();
    setCoachMark(false);
  }, []);

  useEffect(() => {
    if (!coachMark) return;
    const timer = window.setTimeout(dismissCoachMark, COACH_MARK_TTL_MS);
    window.addEventListener("scroll", dismissCoachMark, { passive: true });
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("scroll", dismissCoachMark);
    };
  }, [coachMark, dismissCoachMark]);

  useEffect(() => {
    const topRow = topRowRef.current;
    const compactBar = compactBarRef.current;
    if (!topRow || !compactBar) return;
    const observer = new ResizeObserver(() => {
      setTopRowHeight(topRow.offsetHeight);
      setCompactBarHeight(compactBar.offsetHeight);
    });
    observer.observe(topRow);
    observer.observe(compactBar);
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
          {name && (
            <Link href="/my-photos" aria-label={labels.myPhotos} className="-m-1.5 p-1.5">
              <span className="relative block h-8 w-8">
                <span
                  className={`flex h-8 w-8 items-center justify-center rounded-full border border-ink/15 bg-sand font-serif text-base text-gold-deep ${
                    arrival ? "avatar-pop" : ""
                  }`}
                >
                  {name.trim().charAt(0).toLocaleUpperCase(locale)}
                </span>
                {arrival &&
                  BURST_FLECKS.map((fleck, i) => (
                    <span
                      key={i}
                      aria-hidden
                      className={`avatar-burst-fleck absolute top-3.5 left-3.5 h-2 w-[5px] rounded-[1px] ${fleck.color}`}
                      style={
                        {
                          "--bx": `${fleck.bx}px`,
                          "--by": `${fleck.by}px`,
                          animationDelay: `${fleck.delay}s`,
                        } as React.CSSProperties
                      }
                    />
                  ))}
              </span>
            </Link>
          )}
        </div>

        {coachMark && (
          <div
            onClick={dismissCoachMark}
            className="coach-mark-in absolute top-full right-2 z-[1] flex flex-col items-end"
          >
            <span className="-mb-1.5 mr-4 h-[11px] w-[11px] rotate-45 rounded-[2px] border-t border-l border-ink/10 bg-card" />
            <span className="flex items-center gap-1 rounded-card border border-ink/10 bg-card py-[11px] pr-1.5 pl-3.5 text-[13px] leading-[1.35] whitespace-nowrap text-ink shadow-card">
              {labels.coachMark}
              <button
                type="button"
                aria-label={labels.coachMarkDismiss}
                onClick={dismissCoachMark}
                className="-my-[13px] flex h-11 w-11 items-center justify-center text-[15px] text-ink/55"
              >
                ✕
              </button>
            </span>
          </div>
        )}
      </div>

      <header className="flex flex-col items-center gap-[11px] px-7 pt-4 pb-[26px] text-center">
        <span className="text-[11px] text-gold uppercase tracking-[0.28em]">{labels.eyebrow}</span>
        <h1 className="font-serif text-masthead font-medium text-gold-small">
          {COUPLE_NAMES[locale].first}
          <br />
          <span className="text-[31px] text-gold italic">{COUPLE_NAMES[locale].and}</span>
          <br />
          {COUPLE_NAMES[locale].second}
        </h1>
        <div className="flex items-center gap-2.5 text-ink/30">
          <span className="block h-px w-[34px] bg-current" />
          <span className="text-meta tracking-[0.22em] text-ink/60">20 · 09 · 2026</span>
          <span className="block h-px w-[34px] bg-current" />
        </div>
      </header>

      <div
        ref={compactBarRef}
        style={{ top: topRowHeight }}
        className="sticky z-[3] flex items-center gap-2.5 border-b border-ink/7 bg-paper/94 px-4 pt-[9px] pb-3 backdrop-blur-[10px]"
      >
        <div
          className={`flex min-w-0 shrink-0 flex-col transition-opacity duration-[220ms] ${
            pastMasthead ? "opacity-100" : "opacity-0"
          }`}
        >
          <span className="font-serif text-[19px] leading-[1.15] whitespace-nowrap text-gold-small">
            {COUPLE_NAMES[locale].oneLine}
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

      {frozenNotice && (
        <div
          style={{ top: topRowHeight + compactBarHeight }}
          className="sticky z-[2] mx-3.5 mt-3.5 flex items-start gap-[11px] rounded-card bg-sand px-4 py-3.5"
        >
          <span className="mt-0.5 shrink-0">
            <ConfettiMark size={20} />
          </span>
          <div className="flex min-w-0 flex-col gap-[3px]">
            <span className="font-serif text-xl leading-[1.2] text-gold-small">
              {frozenNotice.title}
            </span>
            <span className="text-body text-pretty text-ink/70">{frozenNotice.body}</span>
          </div>
        </div>
      )}

      {offlineNotice && (
        <OfflineNotice
          labels={offlineNotice}
          locale={locale}
          top={topRowHeight + compactBarHeight}
        />
      )}
    </>
  );
}
