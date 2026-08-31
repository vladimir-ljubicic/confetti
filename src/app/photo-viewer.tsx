"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { pluralize, type Locale } from "@/lib/i18n";
import { photoAltText, type PhotoAltLabels } from "@/lib/photo-alt";
import type { PublicPhoto } from "@/lib/public-photos";
import type { Visibility } from "@/lib/uploader-profile";
import { anchoredIndex } from "@/lib/viewer-anchor";
import { HeartIcon, LikeHeart } from "./like-pill";
import { useServerAction } from "./photo-controls";
import { hideBrokenImage, renditionSrcs } from "./photo-image";
import type { Likes } from "./use-likes";
import { useSheetDismiss } from "./use-sheet-dismiss";
import { useSwipeDismiss } from "./use-swipe-dismiss";

export type ViewerPhoto = PublicPhoto & { visibility?: Visibility };

export type ViewerLabels = {
  open: string;
  close: string;
  download: string;
  like: string;
  unlike: string;
  share: string;
  sharePreparing: string;
  shareCancel: string;
  makePrivate: string;
  makePublic: string;
  delete: string;
  confirmDelete: string;
  actionFailed: string;
  photosOne: string;
  photosFew: string;
  photosMany: string;
  alt: PhotoAltLabels;
};

// How long the viewer holds itself on screen while it fades away.
const CLOSE_MS = 200;

// Slides mounted on each side of the current one. Wider than the ±1 sharpen
// window, so a swipe always lands on a slide that already exists.
const OVERSCAN_SLIDES = 3;

// Two taps count as one gesture within this window and distance of each other.
const DOUBLE_TAP_MS = 300;
const DOUBLE_TAP_PX = 40;

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

// `object-contain` letterboxes the photo inside the element, so part of the
// image box is empty stage. Re-derives the drawn rect to tell the two apart.
function clickedLetterbox(event: React.MouseEvent<HTMLImageElement>): boolean {
  const img = event.currentTarget;
  const { naturalWidth, naturalHeight, clientWidth, clientHeight } = img;
  if (!naturalWidth || !naturalHeight) return false;
  const scale = Math.min(clientWidth / naturalWidth, clientHeight / naturalHeight);
  const drawnWidth = naturalWidth * scale;
  const drawnHeight = naturalHeight * scale;
  const rect = img.getBoundingClientRect();
  const x = event.clientX - rect.left - (clientWidth - drawnWidth) / 2;
  const y = event.clientY - rect.top - (clientHeight - drawnHeight) / 2;
  return x < 0 || y < 0 || x > drawnWidth || y > drawnHeight;
}

function ViewerImage({
  src,
  sharpSrc,
  sharpen,
  alt,
  onClick,
}: {
  src: string;
  sharpSrc: string;
  // Only slides near the current one fetch their viewer rendition, so opening
  // the viewer doesn't pull one for every photo in the feed.
  sharpen: boolean;
  alt: string;
  onClick: (event: React.MouseEvent<HTMLImageElement>) => void;
}) {
  // The thumb paints at once from the grid's cache; the wider viewer
  // rendition swaps in only once fully decoded, so the upgrade never blanks
  // the stage and, with the same aspect ratio, never shifts layout. A photo
  // with no viewer rendition keeps the thumb.
  const [sharp, setSharp] = useState(false);
  useEffect(() => {
    if (!sharpen || sharp) return;
    let cancelled = false;
    const image = new Image();
    const swap = () => {
      if (!cancelled) setSharp(true);
    };
    image.src = sharpSrc;
    image
      .decode()
      .then(swap)
      .catch(() => {
        // decode() can reject under memory pressure even for an image that
        // fetched fine; only a failed fetch (naturalWidth 0) keeps the thumb.
        if (image.naturalWidth > 0) swap();
        else if (!image.complete) image.onload = swap;
      });
    return () => {
      cancelled = true;
    };
  }, [sharpen, sharp, sharpSrc]);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={sharp ? sharpSrc : src}
      alt={alt}
      loading="lazy"
      onError={hideBrokenImage}
      onClick={onClick}
      className="max-h-full w-full touch-manipulation object-contain"
    />
  );
}

function ShareSheet({
  state,
  labels,
  onShare,
  onCancel,
}: {
  state: { status: "preparing" } | { status: "ready"; payload: ShareData };
  labels: Pick<ViewerLabels, "share" | "sharePreparing" | "shareCancel">;
  onShare: (payload: ShareData) => void;
  onCancel: () => void;
}) {
  const { sheetProps, backdropStyle } = useSheetDismiss(onCancel);

  return (
    <div
      style={backdropStyle}
      className="scrim-in fixed inset-0 z-[60] flex flex-col justify-end bg-ink/42"
    >
      <div
        {...sheetProps}
        className="sheet-in mx-auto flex w-full max-w-md flex-col gap-5 rounded-sheet bg-card px-[22px] pt-3 pb-[26px] shadow-sheet"
      >
        <span className="mx-auto h-1 w-[38px] rounded-pill bg-ink/15" />
        {state.status === "preparing" ? (
          <div className="flex items-center justify-center gap-3 py-2">
            <span
              aria-hidden
              className="h-5 w-5 animate-spin rounded-full border-2 border-ink/15 border-t-gold"
            />
            <p className="text-body text-ink/70">{labels.sharePreparing}</p>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onShare(state.payload)}
            className="w-full rounded-pill bg-gold px-7 py-4 text-base font-medium text-card transition hover:bg-gold-small active:bg-gold-deep"
          >
            {labels.share}
          </button>
        )}
        <button
          type="button"
          onClick={onCancel}
          className="-mt-2 min-h-11 text-sm text-ink/60"
        >
          {labels.shareCancel}
        </button>
      </div>
    </div>
  );
}

export function PhotoViewer({
  photos,
  startId,
  likes,
  canManageAll,
  locale,
  labels,
  galleryCount,
  onNearEnd,
  onSelectUploader,
  onClose,
}: {
  photos: ViewerPhoto[];
  startId: string;
  likes: Likes;
  canManageAll: boolean;
  locale: Locale;
  labels: ViewerLabels;
  // Size of the gallery being swiped through, when it is larger than the
  // photos handed over.
  galleryCount?: number;
  onNearEnd?: () => void;
  // Given, the uploader pill filters the gallery behind the viewer in place
  // rather than navigating to the guest's page.
  onSelectUploader?: (publicId: string) => void;
  onClose: () => void;
}) {
  const router = useRouter();
  // Photos deleted from the viewer vanish here immediately;
  // router.refresh() catches the server list up in the background.
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  // Visibility flips stay local while the viewer is open — the grid refresh
  // is deferred to unmount so the current photo doesn't drop out of the feed
  // (and the viewer off the current slide) mid-view.
  const [visibilityOverrides, setVisibilityOverrides] = useState<
    ReadonlyMap<string, Visibility>
  >(new Map());
  const visibilityChanged = useRef(false);
  // What the viewer is showing at the moment it starts to close, and so what it
  // goes on showing while it fades. The feed behind it keeps loading, and a
  // page arriving mid-fade would otherwise re-lay the slides and carry the exit
  // animation onto another photo.
  const [closingOn, setClosingOn] = useState<{
    photos: ViewerPhoto[];
    galleryCount: number | undefined;
  } | null>(null);
  const closing = closingOn !== null;
  const closeTimer = useRef<number | null>(null);
  const visible = (closingOn?.photos ?? photos).filter(
    (photo) => !hiddenIds.has(photo.id),
  );

  const startIndex = Math.max(
    visible.findIndex((photo) => photo.id === startId),
    0,
  );
  const [index, setIndex] = useState(startIndex);
  const currentIndex = Math.min(index, visible.length - 1);
  const current = visible[currentIndex];
  // The place the viewer stands, mirrored outside React state so that when
  // the slide list changes the stage can be re-anchored from the list it was
  // actually standing in, immune to how state updates interleave.
  const placeRef = useRef({ visible, index: startIndex });

  const shownCount = closingOn ? closingOn.galleryCount : galleryCount;
  const total = Math.max(
    (shownCount ?? visible.length) - hiddenIds.size,
    visible.length,
  );

  const trackRef = useRef<HTMLDivElement>(null);
  const lastTap = useRef<{ time: number; x: number; y: number } | null>(null);
  // Keyed so a second double-tap restarts the animation instead of joining
  // the one still running.
  const [burst, setBurst] = useState<{ key: number; photoId: string } | null>(
    null,
  );
  const { busy, failed, run } = useServerAction();
  const [shareState, setShareState] = useState<
    { status: "preparing" } | { status: "ready"; payload: ShareData } | null
  >(null);
  // null marks a photo whose original couldn't be fetched or shared as a file,
  // so retries fall straight back to link sharing.
  const shareFiles = useRef(new Map<string, File | null>());
  const shareAbort = useRef<AbortController | null>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(
    () => () => {
      if (visibilityChanged.current) router.refresh();
    },
    [router],
  );

  useEffect(() => () => shareAbort.current?.abort(), []);

  useEffect(
    () => () => {
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    },
    [],
  );

  // Closing runs the exit animation first; the viewer leaves once it has.
  const dismiss = useCallback(() => {
    if (closeTimer.current !== null) return;
    setClosingOn({ photos, galleryCount });
    closeTimer.current = window.setTimeout(onClose, CLOSE_MS);
  }, [photos, galleryCount, onClose]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") dismiss();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [dismiss]);

  const swipe = useSwipeDismiss(dismiss);

  // Snap-scroll position is the source of truth for `index` while the user
  // swipes; whenever the slide list changes (open, a photo hidden, or a
  // background refresh) the stage re-anchors to the photo it was standing on
  // and re-imposes its scroll instantly, so it neither animates across the
  // feed nor drifts onto a neighbouring photo.
  const slideCount = visible.length;
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const place = placeRef.current;
    const target = anchoredIndex(place.visible, place.index, visible);
    placeRef.current = { visible, index: target };
    // Already standing on (or swiping around) the anchored slide: imposing
    // now would only yank a swipe in progress.
    if (
      target === place.index &&
      Math.abs(track.scrollLeft - target * track.clientWidth) <
        track.clientWidth
    ) {
      return;
    }
    setIndex(target);
    track.scrollTo({
      left: target * track.clientWidth,
      behavior: "instant",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideCount, photos]);

  // Swiping is its own way through the feed, so it pulls the next page in
  // before the last slide the same way scrolling the grid does.
  useEffect(() => {
    if (currentIndex >= slideCount - 3) onNearEnd?.();
  }, [currentIndex, slideCount, onNearEnd]);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const next = Math.max(
      0,
      Math.min(
        Math.round(track.scrollLeft / track.clientWidth),
        slideCount - 1,
      ),
    );
    placeRef.current = { ...placeRef.current, index: next };
    setIndex(next);
  }, [slideCount]);

  if (!current) return null;

  const like = likes.stateFor(current.id, {
    liked: current.likedByViewer,
    count: current.likeCount,
  });
  const canManage = canManageAll || current.ownedByViewer;
  const currentVisibility =
    visibilityOverrides.get(current.id) ?? current.visibility ?? "public";
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  // Only slides around the current one mount; spacers as wide as the missing
  // slides hold the track's scroll width, so every slide keeps the position
  // and snap point it would have with the whole list mounted.
  const trackStart = Math.max(0, currentIndex - OVERSCAN_SLIDES);
  const trackEnd = Math.min(visible.length, currentIndex + OVERSCAN_SLIDES + 1);

  // A double tap likes the photo but never unlikes it, so a mistaken second
  // gesture can't undo the first. The burst plays either way.
  function tapPhoto(
    event: React.MouseEvent<HTMLImageElement>,
    photo: ViewerPhoto,
  ) {
    const previous = lastTap.current;
    if (
      previous &&
      event.timeStamp - previous.time < DOUBLE_TAP_MS &&
      Math.hypot(event.clientX - previous.x, event.clientY - previous.y) <
        DOUBLE_TAP_PX
    ) {
      lastTap.current = null;
      setBurst((running) => ({
        key: (running?.key ?? 0) + 1,
        photoId: photo.id,
      }));
      const seed = { liked: photo.likedByViewer, count: photo.likeCount };
      if (!likes.stateFor(photo.id, seed).liked) {
        void likes.toggle(photo.id, seed);
      }
      return;
    }
    lastTap.current = {
      time: event.timeStamp,
      x: event.clientX,
      y: event.clientY,
    };
    if (clickedLetterbox(event)) dismiss();
  }

  function hideCurrent() {
    const remaining = visible.length - 1;
    if (remaining === 0) {
      dismiss();
      return;
    }
    setHiddenIds(new Set([...hiddenIds, current.id]));
  }

  async function toggleVisibility() {
    const next: Visibility = currentVisibility === "private" ? "public" : "private";
    const ok = await run(
      () =>
        fetch(`/api/photos/${current.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ visibility: next }),
        }),
      { refresh: false },
    );
    if (ok) {
      visibilityChanged.current = true;
      setVisibilityOverrides(new Map(visibilityOverrides).set(current.id, next));
    }
  }

  async function remove() {
    if (!window.confirm(labels.confirmDelete)) return;
    const ok = await run(() =>
      fetch(`/api/photos/${current.id}`, { method: "DELETE" }),
    );
    if (ok) hideCurrent();
  }

  async function presentShare(payload: ShareData) {
    setShareState(null);
    try {
      await navigator.share(payload);
    } catch (error) {
      // The share call must run within a few seconds of a tap; when the
      // download outlives that window the browser rejects it, so hold the
      // payload behind a button and let the next tap hand it off directly.
      if (error instanceof DOMException && error.name === "NotAllowedError") {
        setShareState({ status: "ready", payload });
      }
      // Otherwise: cancelled share sheet.
    }
  }

  // Shares the untouched original as a file where the browser supports it;
  // otherwise shares a gallery link that opens this photo. The original is
  // fetched behind a "preparing" sheet so the tap gets instant feedback.
  async function share() {
    const photo = current;
    const linkPayload: ShareData = {
      url: `${window.location.origin}/?photo=${photo.id}`,
    };
    if (typeof navigator.canShare !== "function") {
      await presentShare(linkPayload);
      return;
    }
    const cached = shareFiles.current.get(photo.id);
    if (cached !== undefined) {
      await presentShare(cached ? { files: [cached] } : linkPayload);
      return;
    }
    const controller = new AbortController();
    shareAbort.current = controller;
    setShareState({ status: "preparing" });
    const file = await fetch(`/api/photos/${photo.id}/download`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) return null;
        const blob = await response.blob();
        return new File([blob], photo.originalFilename, { type: blob.type });
      })
      .catch(() => null);
    if (controller.signal.aborted) return;
    const shareable = file && navigator.canShare({ files: [file] }) ? file : null;
    shareFiles.current.set(photo.id, shareable);
    await presentShare(shareable ? { files: [shareable] } : linkPayload);
  }

  function cancelShare() {
    shareAbort.current?.abort();
    setShareState(null);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className={`fixed inset-0 z-50 flex flex-col ${
        closing ? "viewer-out pointer-events-none" : "viewer-in"
      }`}
    >
      <div
        aria-hidden
        style={swipe.fadeStyle}
        className="absolute inset-0 -z-10 bg-stage"
      />
      <div
        style={swipe.fadeStyle}
        className="flex items-center justify-between px-[18px] pt-[18px]"
      >
        <button
          type="button"
          onClick={dismiss}
          aria-label={labels.close}
          className="-m-2 flex h-10 w-10 items-center justify-center rounded-full text-[17px] text-[rgba(250,246,238,0.85)]"
        >
          ✕
        </button>
        <span className="text-[11px] tracking-[0.18em] text-[rgba(250,246,238,0.55)]">
          {currentIndex + 1} / {total}
        </span>
        <span className="w-6" />
      </div>

      {/* The open/close animations live one element above the swipe's
          transform: a running animation overrides an inline transform on
          the same element. */}
      <div
        className={`flex min-h-0 flex-1 flex-col ${
          closing ? "viewer-photo-out" : "viewer-photo-in"
        }`}
      >
        {/* overflow-anchor off: the track re-imposes its own position when
            the slide list changes, and the browser's scroll anchoring would
            shift it a second time. */}
        <div
          {...swipe.trackProps}
          ref={trackRef}
          onScroll={onScroll}
          className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [overflow-anchor:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {trackStart > 0 && (
            <div
              aria-hidden
              className="h-full flex-none"
              style={{ width: `${trackStart * 100}%` }}
            />
          )}
          {visible.slice(trackStart, trackEnd).map((photo, sliceIndex) => {
            const slideIndex = trackStart + sliceIndex;
            const srcs = renditionSrcs({
              id: photo.id,
              width: photo.width,
              visibility: visibilityOverrides.get(photo.id) ?? photo.visibility,
            });
            return (
              <div
                key={photo.id}
                onClick={(event) => {
                  if (event.target === event.currentTarget) dismiss();
                }}
                className="relative flex h-full w-full flex-none snap-center items-center justify-center py-3.5"
              >
                <ViewerImage
                  src={srcs.thumb}
                  sharpSrc={srcs.viewer}
                  sharpen={Math.abs(slideIndex - currentIndex) <= 1}
                  alt={photoAltText(labels.alt, photo.uploader)}
                  onClick={(event) => tapPhoto(event, photo)}
                />
                {burst?.photoId === photo.id && (
                  <span
                    key={burst.key}
                    aria-hidden
                    onAnimationEnd={() => setBurst(null)}
                    className="heart-burst pointer-events-none absolute"
                  >
                    <HeartIcon
                      filled
                      className="h-[92px] w-[92px] text-paper drop-shadow-[0_2px_16px_rgba(27,24,21,0.5)]"
                    />
                  </span>
                )}
              </div>
            );
          })}
          {trackEnd < visible.length && (
            <div
              aria-hidden
              className="h-full flex-none"
              style={{ width: `${(visible.length - trackEnd) * 100}%` }}
            />
          )}
        </div>
      </div>

      <div
        style={swipe.fadeStyle}
        className="flex flex-col items-center gap-1.5 px-6 pt-1 text-center"
      >
        {current.uploader &&
          // An empty publicId marks the guest's own profile view, where
          // navigating to their uploader page would be pointless.
          (current.uploader.publicId === "" ? (
            <span className="font-serif text-[25px] leading-[1.2] text-[#f0e7d2] italic">
              {current.uploader.displayName}
            </span>
          ) : (
            <Link
              href={`/uploader/${current.uploader.publicId}`}
              prefetch={false}
              onClick={(event) => {
                const publicId = current.uploader?.publicId;
                if (!onSelectUploader || publicId === undefined) return;
                if (
                  event.metaKey ||
                  event.ctrlKey ||
                  event.shiftKey ||
                  event.altKey
                ) {
                  return;
                }
                event.preventDefault();
                // No exit animation: this is a move to the guest's gallery,
                // not a return to the one the viewer was opened from, and
                // fading back to a grid that is being replaced anyway reads
                // as a stutter. Both in one commit, so neither is seen alone.
                onClose();
                onSelectUploader(publicId);
              }}
              className="flex min-h-12 items-center gap-2.5 rounded-pill border border-[rgba(250,246,238,0.22)] bg-[rgba(250,246,238,0.08)] py-[5px] pr-3.5 pl-1.5 transition active:bg-[rgba(250,246,238,0.14)]"
            >
              <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(250,246,238,0.16)] font-serif text-[16px] text-[#e8dcc0]">
                {current.uploader.displayName.trim().charAt(0).toLocaleUpperCase(locale)}
              </span>
              <span className="flex flex-col items-start">
                <span className="font-serif text-[21px] leading-[1.1] text-[#f0e7d2] italic">
                  {current.uploader.displayName}
                </span>
                <span className="text-[11px] tracking-[0.1em] text-[rgba(250,246,238,0.55)]">
                  {pluralize(locale, current.uploader.photoCount, {
                    one: labels.photosOne,
                    few: labels.photosFew,
                    many: labels.photosMany,
                  })}
                </span>
              </span>
              <span aria-hidden className="text-[14px] text-[rgba(250,246,238,0.55)]">
                ›
              </span>
            </Link>
          ))}
        <div className="flex items-center gap-[9px] text-[rgba(250,246,238,0.22)]">
          <span className="block h-px w-[26px] bg-current" />
          <span className="text-[11px] tracking-[0.18em] text-[rgba(250,246,238,0.6)]">
            {formatDateTime(current.uploadedAt)}
          </span>
          <span className="block h-px w-[26px] bg-current" />
        </div>
      </div>

      <div
        style={swipe.fadeStyle}
        className="flex flex-col gap-[13px] px-[18px] pt-5 pb-[26px]"
      >
        <div className="flex gap-[9px]">
          <a
            href={`/api/photos/${current.id}/download`}
            className="flex flex-1 items-center justify-center rounded-pill bg-paper p-[15px] text-[15px] font-medium text-ink transition active:bg-sand"
          >
            {labels.download}
          </a>
          <button
            type="button"
            onClick={() =>
              void likes.toggle(current.id, {
                liked: current.likedByViewer,
                count: current.likeCount,
              })
            }
            aria-pressed={like.liked}
            aria-label={like.liked ? labels.unlike : labels.like}
            className="flex h-[50px] items-center justify-center gap-[7px] rounded-pill border border-[rgba(250,246,238,0.28)] px-[18px] text-[15px] transition active:bg-[rgba(250,246,238,0.12)]"
          >
            <LikeHeart
              liked={like.liked}
              className={`h-[17px] w-[17px] ${like.liked ? "text-gold-light" : "text-paper"}`}
            />
            {like.count > 0 && (
              <span className="text-[rgba(250,246,238,0.85)]">
                {like.count}
              </span>
            )}
          </button>
          {canShare && (
            <button
              type="button"
              onClick={() => void share()}
              aria-label={labels.share}
              className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-[rgba(250,246,238,0.28)] text-[15px] text-paper transition active:bg-[rgba(250,246,238,0.12)]"
            >
              ↗
            </button>
          )}
        </div>

        {canManage && (
          <div className="flex items-center justify-center gap-[18px] text-[13px]">
            <button
              type="button"
              disabled={busy}
              onClick={() => void toggleVisibility()}
              className="flex min-h-11 items-center text-[rgba(250,246,238,0.62)] transition active:text-[rgba(250,246,238,0.9)] disabled:opacity-60"
            >
              {currentVisibility === "private" ? labels.makePublic : labels.makePrivate}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="flex min-h-11 items-center text-danger-light transition active:opacity-60 disabled:opacity-60"
            >
              {labels.delete}
            </button>
          </div>
        )}

        {failed && (
          <p className="text-center text-xs text-danger-light">
            {labels.actionFailed}
          </p>
        )}
      </div>

      {shareState && (
        <ShareSheet
          state={shareState}
          labels={labels}
          onShare={(payload) => void presentShare(payload)}
          onCancel={cancelShare}
        />
      )}
    </div>
  );
}
