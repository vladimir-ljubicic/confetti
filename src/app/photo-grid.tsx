"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Locale } from "@/lib/i18n";
import { photoAltText, type PhotoAltLabels } from "@/lib/photo-alt";
import type { PublicPhoto } from "@/lib/public-photos";
import { shortUploaderName } from "@/lib/uploader-name";
import { LikePill } from "./like-pill";
import { PhotoViewer, type ViewerLabels } from "./photo-viewer";
import { UploadTileView } from "./upload-tile";
import { useImageSrc } from "./use-image-src";
import { useLikes } from "./use-likes";
import { useUploadQueue, type UploadTile } from "./upload-queue";

type GridEntry =
  | { kind: "tile"; tile: UploadTile }
  | { kind: "photo"; photo: PublicPhoto };

// Tiles this far into the grid are on screen before anything scrolls, so they
// are fetched at once rather than waiting to be discovered as lazy.
const EAGER_TILES = 6;

// Stands in for a photo whose pixel size was never recorded, so its tile still
// reserves a plausible height instead of collapsing to nothing.
const FALLBACK_ASPECT = "3 / 4";

function tileAspect(photo: PublicPhoto): string {
  return photo.width && photo.height
    ? `${photo.width} / ${photo.height}`
    : FALLBACK_ASPECT;
}

// Renders the local preview until the signed image has actually loaded, so a
// freshly uploaded photo keeps its pixels during the swap. Both images fill the
// tile, whose height its aspect ratio has already reserved.
function GalleryImage({
  photoId,
  src,
  alt,
  width,
  height,
  eager,
  previewUrl,
  onSettled,
}: {
  photoId: string;
  src: string;
  alt: string;
  width: number | null;
  height: number | null;
  eager: boolean;
  previewUrl?: string;
  onSettled?: () => void;
}) {
  const image = useImageSrc(photoId, src);
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
        src={image.src}
        alt={alt}
        width={width ?? undefined}
        height={height ?? undefined}
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : "auto"}
        decoding="async"
        onLoad={settle}
        onError={() => {
          settle();
          image.onError();
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
  // consumed immediately so closing the viewer or reloading doesn't reopen it.
  useEffect(() => {
    if (!viewer) return;
    const url = new URL(window.location.href);
    const id = url.searchParams.get("photo");
    if (id === null) return;
    url.searchParams.delete("photo");
    window.history.replaceState(null, "", url);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (photoIds.has(id)) setViewerStartId(id);
  }, [viewer, photoIds]);

  const visibleTiles = tiles.filter(
    (tile) => tile.photoId === null || !photoIds.has(tile.photoId),
  );

  if (photos.length === 0 && visibleTiles.length === 0) {
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

  const entries: GridEntry[] = [
    ...visibleTiles.map((tile): GridEntry => ({ kind: "tile", tile })),
    ...photos.map((photo): GridEntry => ({ kind: "photo", photo })),
  ];
  const columns = [
    entries.filter((_, index) => index % 2 === 0),
    entries.filter((_, index) => index % 2 === 1),
  ];
  return (
    <>
      <div className="grid w-full grid-cols-2 items-start gap-2 px-3 pb-26">
        {columns.map((column, columnIndex) => (
          <ul key={columnIndex} className="flex flex-col gap-2">
            {column.map((entry, rowIndex) =>
              entry.kind === "tile" ? (
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
              ) : (
                <li
                  key={entry.photo.id}
                  style={{ aspectRatio: tileAspect(entry.photo) }}
                  // A photo taking over from its own upload tile is already
                  // on screen and must not fade in a second time.
                  className={`group relative overflow-hidden rounded-tile bg-sand ${
                    absorbedTiles.has(entry.photo.id) ? "" : "tile-in"
                  }`}
                >
                  {entry.photo.imageUrl ? (
                    viewer ? (
                      <button
                        type="button"
                        aria-label={viewer.labels.open}
                        onClick={() => setViewerStartId(entry.photo.id)}
                        className="block h-full w-full"
                      >
                        <GalleryImage
                          photoId={entry.photo.id}
                          src={entry.photo.imageUrl}
                          alt={photoAltText(altLabels, entry.photo.uploader)}
                          width={entry.photo.width}
                          height={entry.photo.height}
                          eager={rowIndex * 2 + columnIndex < EAGER_TILES}
                          {...absorbProps(entry.photo)}
                        />
                      </button>
                    ) : (
                      <GalleryImage
                        photoId={entry.photo.id}
                        src={entry.photo.imageUrl}
                        alt={photoAltText(altLabels, entry.photo.uploader)}
                        width={entry.photo.width}
                        height={entry.photo.height}
                        eager={rowIndex * 2 + columnIndex < EAGER_TILES}
                        {...absorbProps(entry.photo)}
                      />
                    )
                  ) : null}
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
              ),
            )}
          </ul>
        ))}
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
