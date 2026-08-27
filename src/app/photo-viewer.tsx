"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { PublicPhoto } from "@/lib/public-photos";
import { useServerAction } from "./photo-controls";
import type { Likes } from "./use-likes";

export type ViewerLabels = {
  open: string;
  close: string;
  download: string;
  like: string;
  unlike: string;
  share: string;
  makePrivate: string;
  delete: string;
  confirmDelete: string;
  actionFailed: string;
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} · ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function PhotoViewer({
  photos,
  startId,
  likes,
  canManageAll,
  labels,
  onClose,
}: {
  photos: PublicPhoto[];
  startId: string;
  likes: Likes;
  canManageAll: boolean;
  labels: ViewerLabels;
  onClose: () => void;
}) {
  // Photos made private or deleted from the viewer vanish here immediately;
  // router.refresh() catches the server list up in the background.
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set());
  const visible = photos.filter((photo) => !hiddenIds.has(photo.id));

  const startIndex = Math.max(
    visible.findIndex((photo) => photo.id === startId),
    0,
  );
  const [index, setIndex] = useState(startIndex);
  const currentIndex = Math.min(index, visible.length - 1);
  const current = visible[currentIndex];

  const trackRef = useRef<HTMLDivElement>(null);
  const { busy, failed, run } = useServerAction();

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Snap-scroll position is the source of truth for `index` while the user
  // swipes; it must be re-imposed instantly whenever the slide list changes
  // (open, or a photo hidden) so the stage never animates across the feed.
  const slideCount = visible.length;
  useLayoutEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({
      left: Math.min(currentIndex, slideCount - 1) * track.clientWidth,
      behavior: "instant",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideCount]);

  const onScroll = useCallback(() => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    setIndex(
      Math.max(
        0,
        Math.min(
          Math.round(track.scrollLeft / track.clientWidth),
          slideCount - 1,
        ),
      ),
    );
  }, [slideCount]);

  if (!current) return null;

  const like = likes.stateFor(current.id, {
    liked: current.likedByViewer,
    count: current.likeCount,
  });
  const canManage = canManageAll || current.ownedByViewer;
  const canShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  function hideCurrent() {
    const remaining = visible.length - 1;
    if (remaining === 0) {
      onClose();
      return;
    }
    setHiddenIds(new Set([...hiddenIds, current.id]));
  }

  async function makePrivate() {
    const ok = await run(() =>
      fetch(`/api/photos/${current.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ visibility: "private" }),
      }),
    );
    if (ok) hideCurrent();
  }

  async function remove() {
    if (!window.confirm(labels.confirmDelete)) return;
    const ok = await run(() =>
      fetch(`/api/photos/${current.id}`, { method: "DELETE" }),
    );
    if (ok) hideCurrent();
  }

  async function share() {
    const url = current.downloadUrl ?? current.imageUrl;
    if (!url) return;
    try {
      await navigator.share({ url });
    } catch {
      // Cancelled share sheet.
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-stage"
    >
      <div className="flex items-center justify-between px-[18px] pt-[18px]">
        <button
          type="button"
          onClick={onClose}
          aria-label={labels.close}
          className="-m-2 flex h-10 w-10 items-center justify-center rounded-full text-[17px] text-[rgba(250,246,238,0.85)]"
        >
          ✕
        </button>
        <span className="text-[11px] tracking-[0.18em] text-[rgba(250,246,238,0.55)]">
          {currentIndex + 1} / {visible.length}
        </span>
        <span className="w-6" />
      </div>

      <div
        ref={trackRef}
        onScroll={onScroll}
        className="flex min-h-0 flex-1 snap-x snap-mandatory overflow-x-auto overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {visible.map((photo) => (
          <div
            key={photo.id}
            className="flex h-full w-full flex-none snap-center items-center justify-center py-3.5"
          >
            {photo.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.imageUrl}
                alt=""
                loading="lazy"
                className="max-h-full w-full object-contain"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center gap-1.5 px-6 pt-1 text-center">
        {current.uploader && (
          <span className="font-serif text-[25px] leading-[1.2] text-[#f0e7d2] italic">
            {current.uploader.displayName}
          </span>
        )}
        <div className="flex items-center gap-[9px] text-[rgba(250,246,238,0.22)]">
          <span className="block h-px w-[26px] bg-current" />
          <span className="text-[11px] tracking-[0.18em] text-[rgba(250,246,238,0.6)]">
            {formatDateTime(current.uploadedAt)}
          </span>
          <span className="block h-px w-[26px] bg-current" />
        </div>
      </div>

      <div className="flex flex-col gap-[13px] px-[18px] pt-5 pb-[26px]">
        <div className="flex gap-[9px]">
          {current.downloadUrl && (
            <a
              href={current.downloadUrl}
              className="flex flex-1 items-center justify-center rounded-pill bg-paper p-[15px] text-[15px] font-medium text-ink"
            >
              {labels.download}
            </a>
          )}
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
            className="flex h-[50px] items-center justify-center gap-[7px] rounded-pill border border-[rgba(250,246,238,0.28)] px-[18px] text-[15px]"
          >
            <span
              className={`text-[17px] leading-none ${like.liked ? "text-gold-light" : "text-paper"}`}
            >
              {like.liked ? "♥" : "♡"}
            </span>
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
              className="flex h-[50px] w-[50px] items-center justify-center rounded-full border border-[rgba(250,246,238,0.28)] text-[15px] text-paper"
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
              onClick={() => void makePrivate()}
              className="flex min-h-11 items-center text-[rgba(250,246,238,0.62)] disabled:opacity-60"
            >
              {labels.makePrivate}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void remove()}
              className="flex min-h-11 items-center text-danger-light disabled:opacity-60"
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
    </div>
  );
}
