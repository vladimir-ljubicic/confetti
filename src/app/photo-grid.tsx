"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  FALLBACK_TILE_ASPECT,
  GALLERY_HEAD_PHOTOS,
  columnMetrics,
  columnWindow,
  dealColumns,
  tileHeightRatio,
  type ColumnWindow,
} from "@/lib/grid-window";
import type { Locale } from "@/lib/i18n";
import { photoAltText, type PhotoAltLabels } from "@/lib/photo-alt";
import type { PublicPhoto } from "@/lib/public-photos";
import { shortUploaderName } from "@/lib/uploader-name";
import { LikePill } from "./like-pill";
import { hideBrokenImage, publicThumbSrc } from "./photo-image";
import { PhotoViewer, type ViewerLabels } from "./photo-viewer";
import { UploadTileView } from "./upload-tile";
import { useLikes } from "./use-likes";
import { useUploadQueue, type UploadTile } from "./upload-queue";

type GridEntry =
  | { kind: "tile"; tile: UploadTile }
  | { kind: "photo"; photo: PublicPhoto };

function entryRatio(entry: GridEntry): number {
  return tileHeightRatio(entry.kind === "photo" ? entry.photo : entry.tile);
}

// Tiles this far into the grid are on screen before anything scrolls, so they
// are fetched at once rather than waiting to be discovered as lazy.
const EAGER_TILES = 6;

// Extra viewports mounted beyond each edge of the screen, so scrolling meets
// tiles that already exist.
const OVERSCAN_VIEWPORTS = 2;

// The visible-plus-overscan band, in the grid's own coordinates, with the
// measurements the tile heights derive from. Null until the grid has been
// measured — each column mounts its head, which is exactly what the server
// rendered.
type GridBand = {
  columnWidth: number;
  gap: number;
  top: number;
  bottom: number;
};

function tileAspect(photo: PublicPhoto): string {
  return photo.width && photo.height
    ? `${photo.width} / ${photo.height}`
    : FALLBACK_TILE_ASPECT;
}

// Renders the local preview until the stored image has actually loaded, so a
// freshly uploaded photo keeps its pixels during the swap. Both images fill the
// tile, whose height its aspect ratio has already reserved.
function GalleryImage({
  src,
  alt,
  width,
  height,
  eager,
  previewUrl,
  onSettled,
}: {
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  eager: boolean;
  previewUrl?: string;
  onSettled?: () => void;
}) {
  // Captured once: the tile (and its object URL) goes away after settling,
  // and the prop change must not restructure the tree and remount the image.
  const [preview] = useState(previewUrl);
  const [settled, setSettled] = useState(preview === undefined);
  const settledRef = useRef(settled);
  const settle = () => {
    if (settledRef.current) return;
    settledRef.current = true;
    setSettled(true);
    onSettled?.();
  };
  return (
    <span className="relative block h-full w-full">
      {!settled && preview !== undefined && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview}
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        width={width ?? undefined}
        height={height ?? undefined}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        onLoad={settle}
        onError={(event) => {
          settle();
          hideBrokenImage(event);
        }}
        ref={(img) => {
          // A cached image can be complete before onLoad ever fires.
          if (img?.complete) settle();
        }}
        className={`h-full w-full object-cover ${settled ? "" : "opacity-0"}`}
      />
    </span>
  );
}

function UploaderLabel({
  uploader,
  onSelect,
}: {
  uploader: { displayName: string; publicId: string };
  onSelect: (publicId: string) => void;
}) {
  const label = shortUploaderName(uploader.displayName);
  if (label === "") return null;
  return (
    // The 44px flex box is an enlarged tap target; only the text is visible.
    <Link
      href={`/uploader/${uploader.publicId}`}
      // The click is intercepted; the address is only here so the guest's
      // gallery can be opened in a tab or copied. Prefetching every label in
      // the grid would render the whole gallery again once per guest on screen.
      prefetch={false}
      onClick={(event) => {
        event.stopPropagation();
        // Modified clicks stay a plain link, so the guest's gallery can still
        // be opened in its own tab.
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        onSelect(uploader.publicId);
      }}
      className="absolute bottom-0 left-0 flex min-h-11 min-w-11 max-w-[60%] items-end"
    >
      <span className="mb-2.5 ml-2.5 min-w-0 truncate text-[11px] tracking-[0.04em] text-card [text-shadow:0_1px_4px_rgba(27,24,21,0.65)]">
        {label}
      </span>
    </Link>
  );
}

export function PhotoGrid({
  photos,
  emptyLabel,
  altLabels,
  downloadLabel,
  likeLabels,
  viewer,
  showUploader = false,
  showUploadTiles = true,
  onSelectUploader,
}: {
  photos: PublicPhoto[];
  emptyLabel: string;
  altLabels: PhotoAltLabels;
  downloadLabel?: string;
  likeLabels?: { like: string; unlike: string };
  viewer?: {
    labels: ViewerLabels;
    canManageAll: boolean;
    locale: Locale;
    galleryCount?: number;
  };
  showUploader?: boolean;
  // Photos still uploading belong to the whole gallery; a narrowed grid is not
  // where the guest who started them expects to find them.
  showUploadTiles?: boolean;
  onSelectUploader?: (publicId: string) => void;
}) {
  const queue = useUploadQueue();
  const likes = useLikes();
  const [viewerStartId, setViewerStartId] = useState<string | null>(null);
  const tiles = useMemo(
    () => (showUploadTiles ? (queue?.tiles ?? []) : []),
    [queue, showUploadTiles],
  );
  const photoIds = useMemo(
    () => new Set(photos.map((photo) => photo.id)),
    [photos],
  );

  // Once the refreshed feed contains an uploaded photo, its optimistic tile
  // is hidden and its preview is handed to the photo entry, which drops the
  // tile (revoking the preview URL) after the signed image has loaded.
  const absorbedTiles = new Map<string, UploadTile>();
  for (const tile of tiles) {
    if (tile.photoId !== null && photoIds.has(tile.photoId)) {
      absorbedTiles.set(tile.photoId, tile);
    }
  }
  const removeTiles = queue?.removeTiles;

  // A shared /?photo=<id> link opens the viewer on that photo. The param is
  // consumed immediately so closing the viewer or reloading doesn't reopen it;
  // the id is held on to instead, because the photo it names may only arrive
  // with the background fetch of the full gallery.
  const [deepLinkId, setDeepLinkId] = useState<string | null>(null);
  useEffect(() => {
    if (!viewer) return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("photo");
    if (id === null) return;
    url.searchParams.delete("photo");
    window.history.replaceState(null, "", url);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDeepLinkId(id);
  }, [viewer]);
  useEffect(() => {
    if (deepLinkId === null || !photoIds.has(deepLinkId)) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setViewerStartId(deepLinkId);
    setDeepLinkId(null);
  }, [deepLinkId, photoIds]);

  // Dealt over the full ordered list, never the mounted slice, so the layout
  // is stable while the window moves.
  const columns = useMemo(() => {
    const visibleTiles = tiles.filter(
      (tile) => tile.photoId === null || !photoIds.has(tile.photoId),
    );
    const entries: GridEntry[] = [
      ...visibleTiles.map((tile): GridEntry => ({ kind: "tile", tile })),
      ...photos.map((photo): GridEntry => ({ kind: "photo", photo })),
    ];
    return dealColumns(entries.map(entryRatio)).map((indexes) =>
      indexes.map((index) => ({ entry: entries[index], order: index })),
    );
  }, [tiles, photos, photoIds]);
  const empty = columns[0].length === 0;

  // The grid is windowed: only tiles near the screen mount, and per-column
  // spacers keep the scroll height, computed from the photos' aspect ratios
  // rather than measured. Until the first measurement the head of each column
  // mounts as-is, matching the markup the server rendered.
  const gridRef = useRef<HTMLDivElement | null>(null);
  const columnRef = useRef<HTMLUListElement | null>(null);
  const [band, setBand] = useState<GridBand | null>(null);

  useEffect(() => {
    const grid = gridRef.current;
    const column = columnRef.current;
    if (!grid || !column) return;
    let frame: number | null = null;
    let measuredAt = Number.NEGATIVE_INFINITY;

    const measure = () => {
      frame = null;
      measuredAt = window.scrollY;
      const gridTop = grid.getBoundingClientRect().top + window.scrollY;
      const viewport = window.innerHeight;
      setBand({
        columnWidth: column.getBoundingClientRect().width,
        gap: parseFloat(getComputedStyle(column).rowGap) || 0,
        top: window.scrollY - gridTop - OVERSCAN_VIEWPORTS * viewport,
        bottom:
          window.scrollY - gridTop + (1 + OVERSCAN_VIEWPORTS) * viewport,
      });
    };
    const schedule = () => {
      if (frame === null) frame = requestAnimationFrame(measure);
    };
    const onScroll = () => {
      // Half the overscan may pass unnoticed before the window shifts; the
      // mounted band still overhangs the screen by the other half.
      if (
        Math.abs(window.scrollY - measuredAt) >
        (OVERSCAN_VIEWPORTS / 2) * window.innerHeight
      ) {
        schedule();
      }
    };

    measure();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", schedule);
    const observer = new ResizeObserver(schedule);
    observer.observe(column);
    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", schedule);
      observer.disconnect();
    };
  }, [empty]);

  const windows: ColumnWindow[] = useMemo(
    () =>
      columns.map((column) => {
        if (band === null) {
          let end = 0;
          while (end < column.length && column[end].order < GALLERY_HEAD_PHOTOS)
            end++;
          return { start: 0, end, topSpacer: 0, bottomSpacer: 0 };
        }
        const metrics = columnMetrics(
          column.map(({ entry }) => entryRatio(entry)),
          band.columnWidth,
          band.gap,
        );
        return columnWindow(metrics, band.top, band.bottom);
      }),
    [columns, band],
  );

  if (empty) {
    return <p className="px-4 py-16 text-center text-ink/50">{emptyLabel}</p>;
  }

  const absorbProps = (photo: PublicPhoto) => {
    const tile = absorbedTiles.get(photo.id);
    return {
      previewUrl: tile?.previewUrl,
      onSettled:
        tile && removeTiles ? () => removeTiles([tile.id]) : undefined,
    };
  };

  return (
    <>
      <div
        ref={gridRef}
        className="grid w-full grid-cols-2 items-start gap-2 px-3 pb-26"
      >
        {columns.map((column, columnIndex) => {
          const { start, end, topSpacer, bottomSpacer } = windows[columnIndex];
          return (
            <ul
              key={columnIndex}
              ref={columnIndex === 0 ? columnRef : undefined}
              className="flex flex-col gap-2"
            >
              {topSpacer > 0 && <li aria-hidden style={{ height: topSpacer }} />}
              {column.slice(start, end).map(({ entry, order }) => {
                if (entry.kind === "tile") {
                  return (
                    queue && (
                      <UploadTileView
                        key={`tile-${entry.tile.id}`}
                        tile={entry.tile}
                        labels={queue.labels}
                        likes={likes}
                        likeLabels={likeLabels}
                        offline={queue.offline}
                      />
                    )
                  );
                }
                const image = (
                  <GalleryImage
                    src={publicThumbSrc(entry.photo.id)}
                    alt={photoAltText(altLabels, entry.photo.uploader)}
                    width={entry.photo.width}
                    height={entry.photo.height}
                    eager={order < EAGER_TILES}
                    {...absorbProps(entry.photo)}
                  />
                );
                return (
                  <li
                    key={entry.photo.id}
                    style={{ aspectRatio: tileAspect(entry.photo) }}
                    // A photo taking over from its own upload tile is already
                    // on screen and must not fade in a second time.
                    className={`group relative overflow-hidden rounded-tile bg-sand ${
                      absorbedTiles.has(entry.photo.id) ? "" : "tile-in"
                    }`}
                  >
                    {viewer ? (
                      <button
                        type="button"
                        aria-label={viewer.labels.open}
                        onClick={() => setViewerStartId(entry.photo.id)}
                        className="block h-full w-full"
                      >
                        {image}
                      </button>
                    ) : (
                      image
                    )}
                    {showUploader && entry.photo.uploader && onSelectUploader && (
                      <UploaderLabel
                        uploader={entry.photo.uploader}
                        onSelect={onSelectUploader}
                      />
                    )}
                    {likeLabels && (
                      <LikePill
                        state={likes.stateFor(entry.photo.id, {
                          liked: entry.photo.likedByViewer,
                          count: entry.photo.likeCount,
                        })}
                        onToggle={() =>
                          void likes.toggle(entry.photo.id, {
                            liked: entry.photo.likedByViewer,
                            count: entry.photo.likeCount,
                          })
                        }
                        labels={likeLabels}
                      />
                    )}
                    {downloadLabel && (
                      <a
                        href={`/api/photos/${entry.photo.id}/download`}
                        className="absolute right-2 bottom-2 rounded-full bg-white/80 px-3 py-1 text-xs text-ink opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100"
                      >
                        {downloadLabel}
                      </a>
                    )}
                  </li>
                );
              })}
              {bottomSpacer > 0 && (
                <li aria-hidden style={{ height: bottomSpacer }} />
              )}
            </ul>
          );
        })}
      </div>
      {viewer && viewerStartId !== null && (
        <PhotoViewer
          photos={photos}
          startId={viewerStartId}
          likes={likes}
          canManageAll={viewer.canManageAll}
          locale={viewer.locale}
          labels={viewer.labels}
          galleryCount={viewer.galleryCount}
          onSelectUploader={onSelectUploader}
          onClose={() => setViewerStartId(null)}
        />
      )}
    </>
  );
}
