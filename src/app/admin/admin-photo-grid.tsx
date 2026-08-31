"use client";

import { useRef, useState } from "react";
import { hideBrokenImage, thumbSrc } from "@/app/photo-image";
import { PhotoViewer, type ViewerLabels } from "@/app/photo-viewer";
import { revealTile } from "@/app/reveal-tile";
import { useLikes } from "@/app/use-likes";
import { usePhotoFeed, type FeedPage } from "@/app/use-photo-feed";
import {
  adminFilterKey,
  adminFilterSearch,
  adminFilterUrl,
  type AdminFilter,
} from "@/lib/admin-filter";
import type { AdminPhoto } from "@/lib/admin-gallery";
import type { Locale } from "@/lib/i18n";

export type { AdminFilter, AdminPhoto };

export type AdminFilterChip = AdminFilter & { label: string; count: number };

const ADMIN_FEED = "/api/admin/photos";

export function AdminPhotoGrid({
  photos,
  nextCursor = null,
  chips,
  initialFilter,
  privateBadge,
  locale,
  viewerLabels,
}: {
  photos: AdminPhoto[];
  nextCursor?: string | null;
  // Without chips the grid shows what it is given, unfiltered and unpaged.
  chips?: AdminFilterChip[];
  initialFilter?: AdminFilter;
  privateBadge: string;
  locale: Locale;
  viewerLabels: ViewerLabels;
}) {
  const likes = useLikes();
  const [viewerStartId, setViewerStartId] = useState<string | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  // What the grid is showing, and what the pressed chip promises it will show
  // — the two differ only while the new first page is on its way.
  const [shown, setShown] = useState({
    filter: initialFilter ?? ({ kind: "all" } as AdminFilter),
    photos,
    nextCursor,
  });
  const [active, setActive] = useState(shown.filter);
  const [switching, setSwitching] = useState(false);
  const wanted = useRef(adminFilterKey(shown.filter));

  const {
    photos: loaded,
    loading,
    loadMore,
    sentinelRef,
  } = usePhotoFeed(
    shown.photos,
    chips && {
      endpoint: ADMIN_FEED,
      search: adminFilterSearch(shown.filter),
      nextCursor: shown.nextCursor,
    },
  );

  // The address is rewritten in place — no navigation — so the view survives a
  // reload and can still be handed on as a link.
  function select(next: AdminFilter) {
    const key = adminFilterKey(next);
    if (key === wanted.current) return;
    wanted.current = key;
    window.history.replaceState(null, "", adminFilterUrl(next));
    setActive(next);
    setSwitching(true);
    void fetch(`${ADMIN_FEED}?${adminFilterSearch(next)}`)
      .then((response) =>
        response.ok ? (response.json() as Promise<FeedPage<AdminPhoto>>) : null,
      )
      .catch(() => null)
      .then((page) => {
        // A slower earlier switch must not overwrite a later one.
        if (key !== wanted.current) return;
        setSwitching(false);
        if (!page) {
          wanted.current = adminFilterKey(shown.filter);
          setActive(shown.filter);
          return;
        }
        setShown({ filter: next, photos: page.photos, nextCursor: page.nextCursor });
      });
  }

  const activeKey = adminFilterKey(active);
  // The viewer counts the whole filtered set, not just the pages loaded so far.
  const shownKey = adminFilterKey(shown.filter);
  const galleryCount = chips?.find(
    (chip) => adminFilterKey(chip) === shownKey,
  )?.count;

  return (
    <>
      {chips && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => {
            const key = adminFilterKey(chip);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={key === activeKey}
                onClick={() => select(chip)}
                className={`shrink-0 rounded-pill px-3.5 py-[9px] text-[13px] whitespace-nowrap transition ${
                  key === activeKey
                    ? "bg-gold-small text-card"
                    : "border border-ink/18 text-ink/65 hover:text-ink active:text-ink"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}

      <ul
        ref={listRef}
        aria-busy={switching}
        className={`grid grid-cols-3 gap-1.5 px-3.5 transition-opacity ${
          switching ? "opacity-45" : ""
        }`}
      >
        {loaded.map((photo) => (
          <li key={photo.id} data-photo-id={photo.id} className="relative">
            <button
              type="button"
              aria-label={viewerLabels.open}
              onClick={() => setViewerStartId(photo.id)}
              className="relative block aspect-square w-full overflow-hidden rounded-tile bg-sand"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={thumbSrc(photo.id)}
                alt=""
                loading="lazy"
                onError={hideBrokenImage}
                className="h-full w-full object-cover"
              />
              {photo.visibility === "private" && (
                <span className="absolute bottom-1.5 left-1.5 rounded-pill bg-[rgba(27,24,21,0.72)] px-[7px] py-[3px] text-[10px] text-paper">
                  {privateBadge}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {chips && (
        <div ref={sentinelRef} className="flex items-center justify-center pt-4">
          {(loading || switching) && (
            <span
              aria-hidden
              className="h-5 w-5 animate-spin rounded-full border-2 border-ink/15 border-t-gold"
            />
          )}
        </div>
      )}
      {viewerStartId !== null && (
        <PhotoViewer
          photos={loaded}
          startId={viewerStartId}
          likes={likes}
          canManageAll
          locale={locale}
          labels={viewerLabels}
          galleryCount={galleryCount}
          onNearEnd={loadMore}
          onCurrentChange={(photoId) =>
            revealTile(
              listRef.current?.querySelector(`[data-photo-id="${photoId}"]`),
            )
          }
          onClose={() => setViewerStartId(null)}
        />
      )}
    </>
  );
}
