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
import { usePhotoFeed, type PhotoFeedSource } from "./use-photo-feed";
import { useUploadQueue, type UploadTile } from "./upload-queue";

type GridEntry =
  | { kind: "tile"; tile: UploadTile }
  | { kind: "photo"; photo: PublicPhoto };

// Renders the local preview at full size until the signed image has actually
// loaded, so a freshly uploaded photo keeps its pixels and height during the
// swap instead of collapsing and re-growing as the real image arrives.
function GalleryImage({
  photoId,
  src,
  alt,
  previewUrl,
  onSettled,
}: {
  photoId: string;
  src: string;
  alt: string;
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
  if (preview === undefined) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image.src}
        alt={alt}
        loading="lazy"
        onError={image.onError}
        className="w-full"
      />
    );
  }
  return (
    <div className="relative">
      {!settled && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className="w-full" />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image.src}
        alt={alt}
        onLoad={settle}
        onError={() => {
          settle();
          image.onError();
        }}
        ref={(img) => {
          // A cached image can be complete before onLoad ever fires.
          if (img?.complete) settle();
        }}
        className={
          settled ? "w-full" : "absolute inset-0 h-full w-full object-cover opacity-0"
        }
      />
    </div>
  );
}

function UploaderLabel({
  uploader,
}: {
  uploader: { displayName: string; publicId: string };
}) {
  const label = shortUploaderName(uploader.displayName);
  if (label === "") return null;
  return (
    // The 44px flex box is an enlarged tap target; only the text is visible.
    <Link
      href={`/uploader/${uploader.publicId}`}
      onClick={(event) => event.stopPropagation()}
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
  feed,
  emptyLabel,
  altLabels,
  downloadLabel,
  likeLabels,
  viewer,
  showUploader = false,
}: {
  photos: PublicPhoto[];
  feed?: PhotoFeedSource;
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
}) {
  const queue = useUploadQueue();
  const likes = useLikes();
  const {
    photos: loadedPhotos,
    enterOrder,
    loading,
    loadMore,
    sentinelRef,
  } = usePhotoFeed(photos, feed);
  const [viewerStartId, setViewerStartId] = useState<string | null>(null);
  const tiles = useMemo(() => queue?.tiles ?? [], [queue]);
  const photoIds = useMemo(
    () => new Set(loadedPhotos.map((photo) => photo.id)),
    [loadedPhotos],
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

  if (loadedPhotos.length === 0 && visibleTiles.length === 0) {
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
    ...loadedPhotos.map((photo): GridEntry => ({ kind: "photo", photo })),
  ];
  const columns = [
    entries.filter((_, index) => index % 2 === 0),
    entries.filter((_, index) => index % 2 === 1),
  ];
  return (
    <>
      <div className="grid w-full grid-cols-2 items-start gap-2 px-3">
        {columns.map((column, columnIndex) => (
          <ul key={columnIndex} className="flex flex-col gap-2">
            {column.map((entry) =>
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
                  // A photo taking over from its own upload tile is already
                  // on screen and must not fade in a second time.
                  className={`group relative overflow-hidden rounded-tile bg-sand ${
                    absorbedTiles.has(entry.photo.id) ? "" : "tile-in"
                  }`}
                  style={{
                    animationDelay: `${(enterOrder.get(entry.photo.id) ?? 0) * 40}ms`,
                  }}
                >
                  {entry.photo.imageUrl ? (
                    viewer ? (
                      <button
                        type="button"
                        aria-label={viewer.labels.open}
                        onClick={() => setViewerStartId(entry.photo.id)}
                        className="block w-full"
                      >
                        <GalleryImage
                          photoId={entry.photo.id}
                          src={entry.photo.imageUrl}
                          alt={photoAltText(altLabels, entry.photo.uploader)}
                          {...absorbProps(entry.photo)}
                        />
                      </button>
                    ) : (
                      <GalleryImage
                        photoId={entry.photo.id}
                        src={entry.photo.imageUrl}
                        alt={photoAltText(altLabels, entry.photo.uploader)}
                        {...absorbProps(entry.photo)}
                      />
                    )
                  ) : (
                    <div className="aspect-3/4" />
                  )}
                  {showUploader && entry.photo.uploader && (
                    <UploaderLabel uploader={entry.photo.uploader} />
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
      <div
        ref={sentinelRef}
        className="flex items-center justify-center pt-5 pb-26"
      >
        {loading && (
          <span
            aria-hidden
            className="h-5 w-5 animate-spin rounded-full border-2 border-ink/15 border-t-gold"
          />
        )}
      </div>
      {viewer && viewerStartId !== null && (
        <PhotoViewer
          photos={loadedPhotos}
          startId={viewerStartId}
          likes={likes}
          canManageAll={viewer.canManageAll}
          locale={viewer.locale}
          labels={viewer.labels}
          galleryCount={viewer.galleryCount}
          onNearEnd={loadMore}
          onClose={() => setViewerStartId(null)}
        />
      )}
    </>
  );
}
