"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent,
  type ReactNode,
} from "react";
import type { Locale } from "@/lib/i18n";
import {
  SCRUB_THUMB_HEIGHT,
  dragProgress,
  likeThresholds,
  scrollProgress,
  scrubBubble,
  scrubRailShown,
  scrubScrollTop,
  scrubbedIndex,
  type ScrubLabels,
} from "@/lib/scrub-rail";
import type { SortMode } from "@/lib/sort-mode";

const ScrubContext = createContext<{
  scrubbing: boolean;
  setScrubbing: (scrubbing: boolean) => void;
} | null>(null);

// A drag down the rail flies past hundreds of tiles the guest never looks at.
// The grid asks here whether one is under way and leaves its photos on their
// placeholders while it is, so the drag costs no image requests.
export function ScrubProvider({ children }: { children: ReactNode }) {
  const [scrubbing, setScrubbing] = useState(false);
  const value = useMemo(() => ({ scrubbing, setScrubbing }), [scrubbing]);
  return <ScrubContext.Provider value={value}>{children}</ScrubContext.Provider>;
}

export function useScrubbing(): boolean {
  return useContext(ScrubContext)?.scrubbing ?? false;
}

// How long the rail stays after the scrolling that summoned it.
const REST_DELAY_MS = 1200;

// The way through a gallery too long to flick: a rail down its right edge,
// invisible until something scrolls. Dragging its thumb moves the page by the
// same fraction the thumb has travelled, and the bubble says where that lands
// in the terms the list is ordered by. It duplicates the scrollbar the browser
// draws two pixels wide, so it is a touch shortcut rather than a control of
// its own and stays out of the accessibility tree.
export function ScrubRail({
  photos,
  sort,
  locale,
  labels,
}: {
  // The photos as the grid deals them, in the order on screen.
  photos: { uploadedAt: string; likeCount: number }[];
  sort: SortMode;
  locale: Locale;
  labels: ScrubLabels;
}) {
  const setScrubbing = useContext(ScrubContext)?.setScrubbing;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [progress, setProgress] = useState(0);
  const [awake, setAwake] = useState(false);
  const [dragging, setDragging] = useState(false);
  // The drag reads and writes the scroll position, so the scroll it causes
  // must not be read back as a second opinion on where the thumb is.
  const draggingRef = useRef(false);
  const grabOffset = useRef(0);
  const restTimer = useRef<number | null>(null);

  const wake = useCallback(() => {
    setAwake(true);
    if (restTimer.current !== null) clearTimeout(restTimer.current);
    restTimer.current = window.setTimeout(() => setAwake(false), REST_DELAY_MS);
  }, []);

  const shown = scrubRailShown(photos.length);

  useEffect(() => {
    if (!shown) return;
    let frame: number | null = null;
    const measure = () => {
      frame = null;
      if (draggingRef.current) return;
      setProgress(
        scrollProgress(
          window.scrollY,
          document.documentElement.scrollHeight,
          window.innerHeight,
        ),
      );
    };
    const onScroll = () => {
      wake();
      if (frame === null) frame = requestAnimationFrame(measure);
    };
    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", measure);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", measure);
    };
  }, [shown, wake]);

  useEffect(
    () => () => {
      if (restTimer.current !== null) clearTimeout(restTimer.current);
    },
    [],
  );

  const thresholds = useMemo(
    () => likeThresholds(photos.map((photo) => photo.likeCount)),
    [photos],
  );

  if (!shown) return null;

  const startDrag = (event: PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    grabOffset.current =
      event.clientY - event.currentTarget.getBoundingClientRect().top;
    draggingRef.current = true;
    setDragging(true);
    setScrubbing?.(true);
    wake();
  };

  const moveDrag = (event: PointerEvent<HTMLDivElement>) => {
    const track = trackRef.current;
    if (!draggingRef.current || !track) return;
    const { top, height } = track.getBoundingClientRect();
    const next = dragProgress(event.clientY, grabOffset.current, { top, height });
    setProgress(next);
    window.scrollTo(
      0,
      scrubScrollTop(
        next,
        document.documentElement.scrollHeight,
        window.innerHeight,
      ),
    );
  };

  const endDrag = () => {
    if (!draggingRef.current) return;
    draggingRef.current = false;
    setDragging(false);
    setScrubbing?.(false);
    wake();
  };

  const photoUnderThumb = photos[scrubbedIndex(progress, photos.length)];
  const bubble = dragging
    ? scrubBubble(photoUnderThumb, sort, thresholds, locale, labels)
    : null;

  return (
    <div
      aria-hidden
      className={`pointer-events-none fixed inset-x-0 top-[120px] bottom-[120px] z-[5] mx-auto max-w-5xl transition-[opacity,visibility] duration-200 motion-reduce:transition-none ${
        awake || dragging ? "visible opacity-100" : "invisible opacity-0"
      }`}
    >
      <div
        ref={trackRef}
        className="absolute inset-y-0 right-1.5 w-1.5 rounded-[3px] bg-ink/7"
      >
        <div
          onPointerDown={startDrag}
          onPointerMove={moveDrag}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
          // The thumb travels the track less its own height, so it comes to
          // rest flush with either end.
          style={{
            top: `calc((100% - ${SCRUB_THUMB_HEIGHT}px) * ${progress})`,
            height: SCRUB_THUMB_HEIGHT,
          }}
          className="pointer-events-auto absolute -right-1.5 w-11 touch-none"
        >
          <span className="absolute inset-y-0 right-[3px] flex w-3 flex-col items-center justify-center gap-[3px] rounded-tile bg-gold shadow-[0_4px_12px_-4px_rgb(43_38_32/0.5)]">
            <span className="h-px w-1 bg-card/80" />
            <span className="h-px w-1 bg-card/80" />
            <span className="h-px w-1 bg-card/80" />
          </span>
          {bubble && (
            <span className="absolute top-1/2 right-[26px] flex -translate-y-1/2 flex-col items-end gap-0.5 rounded-card bg-[rgba(27,24,21,0.82)] px-3.5 py-[9px] shadow-[0_10px_26px_-12px_rgb(27_24_21/0.6)] backdrop-blur-[8px]">
              <span className="flex items-baseline gap-[5px] font-serif text-[22px] leading-none whitespace-nowrap text-[#f6efe0]">
                {bubble.value}
                {bubble.heart && (
                  <span className="font-sans text-sm text-gold-light">♥</span>
                )}
              </span>
              {bubble.caption && (
                <span className="text-[11px] tracking-[0.12em] whitespace-nowrap text-[#f6efe0]/65 uppercase">
                  {bubble.caption}
                </span>
              )}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
