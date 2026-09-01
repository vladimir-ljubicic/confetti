"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
import { useShownTiles, useTileEntrance } from "@/app/use-tile-entrance";
import {
  adminFilterKey,
  adminFilterSearch,
  type AdminFilter,
} from "@/lib/admin-filter";
import type { AdminPhoto } from "@/lib/admin-gallery";
import type { SelectedPhoto } from "@/lib/bulk-selection";
import type { Locale } from "@/lib/i18n";
import { selectionView } from "@/lib/selection-view";
import { tileEnterDelay } from "@/lib/tile-entrance";

export type { AdminFilter, AdminPhoto };

export type AdminFilterChip = {
  filter: AdminFilter;
  label: string;
  count: number;
  // The address the grid rewrites itself to when this chip is pressed; the
  // whole gallery and one guest's page word the same filter differently.
  href: string;
};

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
      : "border border-ink/18 text-ink-muted hover:text-ink active:text-ink"
  }`;
}

function AdminTile({
  photoId,
  arriving,
  delay,
  children,
}: {
  photoId: string;
  arriving: boolean;
  delay: string | undefined;
  children: React.ReactNode;
}) {
  const entering = useTileEntrance(arriving);
  return (
    <li
      data-photo-id={photoId}
      style={{ animationDelay: delay }}
      className={`relative ${entering ? "tile-in" : ""}`}
    >
      {children}
    </li>
  );
}

export function AdminPhotoGrid({
  photos,
  nextCursor,
  total,
  chips,
  initialFilter,
  labels,
  locale,
  viewerLabels,
  children,
}: {
  photos: AdminPhoto[];
  nextCursor: string | null;
  // The whole album's size, of which the grid holds a page.
  total: number;
  chips: AdminFilterChip[];
  initialFilter: AdminFilter;
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
  const [shown, setShown] = useState({ filter: initialFilter, photos, nextCursor });
  const [active, setActive] = useState(shown.filter);
  const [switching, setSwitching] = useState(false);
  const wanted = useRef(adminFilterKey(shown.filter));
  const mode = useSelectMode({ endpoints: SELECT_ENDPOINTS, locale, labels });

  const {
    photos: loaded,
    enterOrder,
    loading,
    loadMore,
    sentinelRef,
  } = usePhotoFeed(shown.photos, {
    endpoint: ADMIN_FEED,
    search: adminFilterSearch(shown.filter),
    nextCursor: shown.nextCursor,
  });
  const shownKey = adminFilterKey(shown.filter);
  const visible = selectionView(loaded, mode.edits, shown.filter.visibility);
  const shownTiles = useShownTiles(
    useMemo(() => new Set(loaded.map((photo) => photo.id)), [loaded]),
  );

  // "Select all" must reach the photos not loaded yet, so selecting fetches the
  // filter's whole id list.
  const [selection, setSelection] = useState<{ key: string; photos: SelectedPhoto[] } | null>(
    null,
  );
  useEffect(() => {
    if (!mode.active) return;
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
  }, [mode.active, shown.filter, shownKey]);
  const selectable =
    selection?.key === shownKey
      ? selectionView(selection.photos, mode.edits, shown.filter.visibility)
      : visible;

  // The address is rewritten in place — no navigation — so the view survives a
  // reload and can still be handed on as a link.
  function select(chip: AdminFilterChip) {
    const next = chip.filter;
    const key = adminFilterKey(next);
    if (key === wanted.current) return;
    wanted.current = key;
    window.history.replaceState(null, "", chip.href);
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

  const activeKey = adminFilterKey(active);
  // The viewer counts the whole filtered set, not just the pages loaded so far.
  const galleryCount = chips.find(
    (chip) => adminFilterKey(chip.filter) === shownKey,
  )?.count;
  const busy = mode.busy || switching;

  return (
    <>
      {mode.active && (
        <SelectTopRow
          mode={mode}
          selected={mode.selectedAmong(selectable).length}
          total={total}
        />
      )}
      <div className={CHIP_ROW_CLASS}>
        {chips.map((chip) => {
          const key = adminFilterKey(chip.filter);
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

      {!mode.active && visible.length > 0 && (
        <SelectEntry onEnter={() => mode.enter()} labels={labels} />
      )}

      {visible.length === 0 ? (
        <p className="px-4 py-16 text-center text-ink-muted">{labels.empty}</p>
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
            // A page that arrived on a scroll enters tile by tile; the page the
            // grid was rendered with is simply there.
            const order = shownTiles.has(photo.id)
              ? undefined
              : enterOrder.get(photo.id);
            return (
              <AdminTile
                key={photo.id}
                photoId={photo.id}
                arriving={order !== undefined}
                delay={tileEnterDelay(order)}
              >
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
              </AdminTile>
            );
          })}
        </ul>
      )}
      <div ref={sentinelRef} className="flex items-center justify-center pt-4">
        {(loading || switching) && (
          <span
            aria-hidden
            className="h-5 w-5 animate-spin rounded-full border-2 border-ink/15 border-t-gold"
          />
        )}
      </div>
      {mode.active ? (
        <SelectBar mode={mode} photos={selectable} shown={selectable} />
      ) : (
        children
      )}
      {viewerStartId !== null && (
        <PhotoViewer
          photos={visible}
          startId={viewerStartId}
          zooms={false}
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
