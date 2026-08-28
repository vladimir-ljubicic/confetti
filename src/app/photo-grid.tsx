"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Locale } from "@/lib/i18n";
import type { PublicPhoto } from "@/lib/public-photos";
import { shortUploaderName } from "@/lib/uploader-name";
import { LikePill } from "./like-pill";
import { PhotoViewer, type ViewerLabels } from "./photo-viewer";
import { UploadTileView } from "./upload-tile";
import { useLikes } from "./use-likes";
import { useUploadQueue, type UploadTile } from "./upload-queue";

type GridEntry =
  | { kind: "tile"; tile: UploadTile }
  | { kind: "photo"; photo: PublicPhoto };

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
  emptyLabel,
  downloadLabel,
  likeLabels,
  viewer,
  showUploader = false,
}: {
  photos: PublicPhoto[];
  emptyLabel: string;
  downloadLabel?: string;
  likeLabels?: { like: string; unlike: string };
  viewer?: { labels: ViewerLabels; canManageAll: boolean; locale: Locale };
  showUploader?: boolean;
}) {
  const queue = useUploadQueue();
  const likes = useLikes();
  const [viewerStartId, setViewerStartId] = useState<string | null>(null);
  const tiles = useMemo(() => queue?.tiles ?? [], [queue]);
  const photoIds = useMemo(
    () => new Set(photos.map((photo) => photo.id)),
    [photos],
  );

  // Once the refreshed feed contains an uploaded photo, its optimistic tile
  // is redundant and is dropped (which also revokes its preview URL).
  const absorbedIds = tiles
    .filter((tile) => tile.photoId !== null && photoIds.has(tile.photoId))
    .map((tile) => tile.id);
  const absorbedKey = absorbedIds.join(",");
  const removeTiles = queue?.removeTiles;
  useEffect(() => {
    if (!removeTiles || absorbedKey === "") return;
    removeTiles(absorbedKey.split(",").map(Number));
  }, [removeTiles, absorbedKey]);

  const visibleTiles = tiles.filter((tile) => !absorbedIds.includes(tile.id));

  if (photos.length === 0 && visibleTiles.length === 0) {
    return <p className="px-4 py-16 text-center text-ink/50">{emptyLabel}</p>;
  }

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
                  className="group relative overflow-hidden rounded-tile bg-sand"
                >
                  {entry.photo.imageUrl ? (
                    viewer ? (
                      <button
                        type="button"
                        aria-label={viewer.labels.open}
                        onClick={() => setViewerStartId(entry.photo.id)}
                        className="block w-full"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={entry.photo.imageUrl}
                          alt=""
                          loading="lazy"
                          className="w-full"
                        />
                      </button>
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={entry.photo.imageUrl}
                        alt=""
                        loading="lazy"
                        className="w-full"
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
                  {downloadLabel && entry.photo.downloadUrl && (
                    <a
                      href={entry.photo.downloadUrl}
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
          onClose={() => setViewerStartId(null)}
        />
      )}
    </>
  );
}
