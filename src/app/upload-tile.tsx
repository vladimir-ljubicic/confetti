"use client";

import { LikePill } from "./like-pill";
import type { UploadTile, UploadTileLabels } from "./upload-queue";
import type { Likes } from "./use-likes";

export function UploadTileView({
  tile,
  labels,
  likes,
  likeLabels,
  offline = false,
}: {
  tile: UploadTile;
  labels: UploadTileLabels;
  likes?: Likes;
  likeLabels?: { like: string; unlike: string };
  offline?: boolean;
}) {
  const waiting = offline && tile.status === "queued";
  const inFlight =
    !waiting && (tile.status === "queued" || tile.status === "uploading");
  const turn = Math.min(Math.max(tile.percent, 0), 100) / 100;
  return (
    <li className="relative overflow-hidden rounded-tile bg-sand">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={tile.previewUrl} alt="" className="w-full" />

      {waiting && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(43,38,32,0.42)]">
          <span className="text-meta text-card">{labels.waiting}</span>
        </div>
      )}

      {inFlight && (
        <div className="absolute inset-0 bg-[rgba(43,38,32,0.34)]">
          <div
            className="absolute top-1/2 left-1/2 flex h-11 w-11 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full"
            style={{
              background: `conic-gradient(#fffdf8 0turn ${turn}turn, rgba(255,253,248,0.28) ${turn}turn 1turn)`,
            }}
          >
            <span className="flex h-[34px] w-[34px] items-center justify-center rounded-full bg-[rgba(43,38,32,0.55)] text-[11px] leading-none text-card">
              {Math.round(tile.percent)}%
            </span>
          </div>
          <button
            type="button"
            onClick={tile.cancel}
            aria-label={labels.cancelUpload}
            className="absolute top-0 right-0 flex h-11 w-11 items-center justify-center text-base text-card [text-shadow:0_1px_3px_rgba(27,24,21,0.6)]"
          >
            ✕
          </button>
        </div>
      )}

      {tile.status === "failed" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(43,38,32,0.5)]">
          <button
            type="button"
            onClick={tile.retry}
            className="rounded-pill bg-card px-4 py-2 text-[13px] text-ink shadow-sm"
          >
            ↺ {labels.retry}
          </button>
        </div>
      )}

      {tile.status === "cancelled" && (
        <div className="absolute inset-0 flex items-center justify-center bg-[rgba(43,38,32,0.5)]">
          <button
            type="button"
            onClick={tile.restore}
            className="rounded-pill bg-card px-4 py-2 text-[13px] text-ink shadow-sm"
          >
            {labels.cancelled} · {labels.restore}
          </button>
        </div>
      )}

      {tile.status === "done" && likes && likeLabels && tile.photoId !== null && (
        <LikePill
          state={likes.stateFor(tile.photoId, { liked: false, count: 0 })}
          onToggle={() => {
            if (tile.photoId !== null) {
              void likes.toggle(tile.photoId, { liked: false, count: 0 });
            }
          }}
          labels={likeLabels}
        />
      )}
    </li>
  );
}
