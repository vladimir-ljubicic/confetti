"use client";

import { useEffect, useRef, useState } from "react";
import { hideBrokenImage, thumbSrc } from "@/app/photo-image";
import { PhotoViewer, type ViewerLabels } from "@/app/photo-viewer";
import { PrivateBadge } from "@/app/private-badge";
import { revealTile } from "@/app/reveal-tile";
import { SelectEntry } from "@/app/select-entry";
import {
  SELECTABLE_TILE_CLASS,
  SelectBar,
  SelectMark,
  SelectTopRow,
  useSelectMode,
  type SelectModeLabels,
} from "@/app/select-mode";
import { useLikes } from "@/app/use-likes";
import { usePhotoFeed, type FeedPage } from "@/app/use-photo-feed";
import {
  adminFilterKey,
  adminFilterSearch,
  adminFilterUrl,
  type AdminFilter,
} from "@/lib/admin-filter";
import type { AdminPhoto } from "@/lib/admin-gallery";
import type { SelectedPhoto } from "@/lib/bulk-selection";
import type { Locale } from "@/lib/i18n";
import { selectionView } from "@/lib/selection-view";
import type { Visibility } from "@/lib/uploader-profile";

export type { AdminFilter, AdminPhoto };

export type AdminFilterChip = AdminFilter & { label: string; count: number };

export type VisibilityKey = "all" | Visibility;

export type VisibilityChip = { key: VisibilityKey; label: string };

export type AdminGridLabels = SelectModeLabels & { privateBadge: string; empty: string };

const ADMIN_FEED = "/api/admin/photos";

// Every photo of the current admin filter, for selecting beyond the loaded
// pages.
const ADMIN_SELECTION = "/api/admin/photos/ids";

const SELECT_ENDPOINTS = {
  visibility: "/api/admin/photos/visibility",
  delete: "/api/admin/photos/delete",
};

const CHIP_ROW_CLASS =
  "flex gap-2 overflow-x-auto px-4 pb-3.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden";

function chipClass(active: boolean) {
  return `shrink-0 rounded-pill px-3.5 py-[9px] text-[13px] whitespace-nowrap transition ${
    active
      ? "bg-gold-small text-card"
      : "border border-ink/18 text-ink/65 hover:text-ink active:text-ink"
  }`;
}

export function AdminPhotoGrid({
  photos,
  nextCursor = null,
  total,
  chips,
  initialFilter,
  visibilityChips,
  initialVisibility = "all",
  labels,
  locale,
  viewerLabels,
  children,
}: {
  photos: AdminPhoto[];
  nextCursor?: string | null;
  // The whole album's size when the grid holds only a page of it.
  total?: number;
  // Admin filters, paged from the feed. Without them the grid holds every
  // photo it will show and filters by visibility on its own.
  chips?: AdminFilterChip[];
  initialFilter?: AdminFilter;
  visibilityChips?: VisibilityChip[];
  initialVisibility?: VisibilityKey;
  labels: AdminGridLabels;
  locale: Locale;
  viewerLabels: ViewerLabels;
  // What follows the grid on the page; the action bar takes its place while
  // selecting.
  children?: React.ReactNode;
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
  const [visibilityKey, setVisibilityKey] = useState<VisibilityKey>(initialVisibility);
  const mode = useSelectMode({ endpoints: SELECT_ENDPOINTS, locale, labels });

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
  const shownKey = adminFilterKey(shown.filter);
  const shownVisibility =
    shown.filter.kind === "private"
      ? "private"
      : visibilityKey === "all"
        ? undefined
        : visibilityKey;
  const visible = selectionView(loaded, mode.edits, shownVisibility);

  // With paged chips, "select all" must reach the photos not loaded yet, so
  // selecting fetches the filter's whole id list.
  const [selection, setSelection] = useState<{ key: string; photos: SelectedPhoto[] } | null>(
    null,
  );
  const wantSelection = mode.active && chips !== undefined;
  useEffect(() => {
    if (!wantSelection) return;
    let stale = false;
    void fetch(`${ADMIN_SELECTION}?${adminFilterSearch(shown.filter)}`)
      .then((response) =>
        response.ok ? (response.json() as Promise<{ photos: SelectedPhoto[] }>) : null,
      )
      .catch(() => null)
      .then((page) => {
        if (stale || !page) return;
        setSelection({ key: shownKey, photos: page.photos });
      });
    return () => {
      stale = true;
    };
  }, [wantSelection, shown.filter, shownKey]);
  const selectable =
    selection?.key === shownKey
      ? selectionView(selection.photos, mode.edits, shownVisibility)
      : visible;
  const albumTotal = total ?? selectionView(loaded, mode.edits).length;

  // The address is rewritten in place — no navigation — so the view survives a
  // reload and can still be handed on as a link.
  function select(next: AdminFilter) {
    const key = adminFilterKey(next);
    if (key === wanted.current) return;
    wanted.current = key;
    window.history.replaceState(null, "", adminFilterUrl(next));
    setActive(next);
    setSwitching(true);
    mode.select([]);
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

  function selectVisibility(key: VisibilityKey) {
    if (key === visibilityKey) return;
    const url = new URL(window.location.href);
    if (key === "all") url.searchParams.delete("filter");
    else url.searchParams.set("filter", key);
    window.history.replaceState(null, "", url);
    setVisibilityKey(key);
    mode.select([]);
  }

  const activeKey = adminFilterKey(active);
  // The viewer counts the whole filtered set, not just the pages loaded so far.
  const galleryCount = chips?.find(
    (chip) => adminFilterKey(chip) === shownKey,
  )?.count;
  const busy = mode.busy || switching;

  return (
    <>
      {mode.active && (
        <SelectTopRow
          mode={mode}
          selected={mode.selectedAmong(selectable).length}
          total={albumTotal}
        />
      )}
      {chips && (
        <div className={CHIP_ROW_CLASS}>
          {chips.map((chip) => {
            const key = adminFilterKey(chip);
            return (
              <button
                key={key}
                type="button"
                aria-pressed={key === activeKey}
                disabled={mode.busy}
                onClick={() => select(chip)}
                className={chipClass(key === activeKey)}
              >
                {chip.label}
              </button>
            );
          })}
        </div>
      )}
      {visibilityChips && (
        <div className={CHIP_ROW_CLASS}>
          {visibilityChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              aria-pressed={chip.key === visibilityKey}
              disabled={mode.busy}
              onClick={() => selectVisibility(chip.key)}
              className={chipClass(chip.key === visibilityKey)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      )}

      {!mode.active && visible.length > 0 && (
        <SelectEntry onEnter={() => mode.enter()} labels={labels} />
      )}

      {visible.length === 0 ? (
        <p className="px-4 py-16 text-center text-ink/50">{labels.empty}</p>
      ) : (
        <ul
          ref={listRef}
          aria-busy={busy}
          className={`grid grid-cols-3 gap-1.5 px-3.5 transition-opacity ${
            mode.active ? "pb-40" : ""
          } ${busy ? "opacity-45" : ""}`}
        >
          {visible.map((photo) => {
            const selected = mode.active && mode.selectedIds.has(photo.id);
            return (
              <li key={photo.id} data-photo-id={photo.id} className="relative">
                <button
                  type="button"
                  disabled={mode.busy}
                  aria-label={mode.active ? undefined : viewerLabels.open}
                  aria-pressed={mode.active ? selected : undefined}
                  onClick={() => mode.tap(photo.id, () => setViewerStartId(photo.id))}
                  {...mode.pressHandlers(photo.id)}
                  className={`relative block aspect-square w-full overflow-hidden rounded-tile bg-sand ${SELECTABLE_TILE_CLASS}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbSrc(photo.id)}
                    alt=""
                    loading="lazy"
                    draggable={false}
                    onError={hideBrokenImage}
                    className="h-full w-full object-cover"
                  />
                  {photo.visibility === "private" && (
                    <PrivateBadge label={labels.privateBadge} />
                  )}
                  {mode.active && <SelectMark selected={selected} />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
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
      {mode.active ? (
        <SelectBar mode={mode} photos={selectable} shown={selectable} />
      ) : (
        children
      )}
      {viewerStartId !== null && (
        <PhotoViewer
          photos={visible}
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
