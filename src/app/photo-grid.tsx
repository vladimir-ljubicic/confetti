"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";
import type { PublicPhoto } from "@/lib/public-photos";
import { LikePill } from "./like-pill";
import { UploadTileView } from "./upload-tile";
import { useUploadQueue, type UploadTile } from "./upload-queue";

type GridEntry =
  | { kind: "tile"; tile: UploadTile }
  | { kind: "photo"; photo: PublicPhoto };

export function PhotoGrid({
  photos,
  emptyLabel,
  downloadLabel,
  likeLabels,
  showUploader = false,
}: {
  photos: PublicPhoto[];
  emptyLabel: string;
  downloadLabel?: string;
  likeLabels?: { like: string; unlike: string };
  showUploader?: boolean;
}) {
  const queue = useUploadQueue();
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
                  likeLabels={likeLabels}
                />
              )
            ) : (
              <li
                key={entry.photo.id}
                className="group relative overflow-hidden rounded-tile bg-sand"
              >
                {entry.photo.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={entry.photo.imageUrl}
                    alt=""
                    loading="lazy"
                    className="w-full"
                  />
                ) : (
                  <div className="aspect-3/4" />
                )}
                {showUploader && entry.photo.uploader && (
                  <Link
                    href={`/uploader/${entry.photo.uploader.publicId}`}
                    className="absolute inset-x-0 bottom-0 truncate bg-linear-to-t from-ink/60 to-transparent px-2.5 pt-8 pb-2 text-left text-xs text-white hover:underline"
                  >
                    {entry.photo.uploader.displayName}
                  </Link>
                )}
                {likeLabels && (
                  <LikePill
                    photoId={entry.photo.id}
                    initialLiked={entry.photo.likedByViewer}
                    initialCount={entry.photo.likeCount}
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
  );
}
