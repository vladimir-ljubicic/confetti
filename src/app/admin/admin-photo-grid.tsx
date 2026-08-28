"use client";

import { useState } from "react";
import { PhotoViewer, type ViewerLabels } from "@/app/photo-viewer";
import { useLikes } from "@/app/use-likes";
import type { Locale } from "@/lib/i18n";
import type { PublicPhoto } from "@/lib/public-photos";
import type { Visibility } from "@/lib/uploader-profile";

export type AdminPhoto = PublicPhoto & { visibility: Visibility };

export type AdminFilter =
  | { kind: "all" }
  | { kind: "private" }
  | { kind: "uploader"; publicId: string };

export type AdminFilterChip = AdminFilter & { label: string };

function filterKey(filter: AdminFilter): string {
  return filter.kind === "uploader" ? `uploader:${filter.publicId}` : filter.kind;
}

function filterUrl(filter: AdminFilter): string {
  if (filter.kind === "private") return "/admin?filter=private";
  if (filter.kind === "uploader") return `/admin?uploader=${filter.publicId}`;
  return "/admin";
}

function matches(photo: AdminPhoto, filter: AdminFilter): boolean {
  if (filter.kind === "all") return true;
  if (filter.kind === "private") return photo.visibility === "private";
  return photo.uploader?.publicId === filter.publicId;
}

export function AdminPhotoGrid({
  photos,
  chips,
  initialFilter,
  privateBadge,
  locale,
  viewerLabels,
}: {
  photos: AdminPhoto[];
  // Without chips the grid shows what it is given, unfiltered.
  chips?: AdminFilterChip[];
  initialFilter?: AdminFilter;
  privateBadge: string;
  locale: Locale;
  viewerLabels: ViewerLabels;
}) {
  const likes = useLikes();
  const [viewerStartId, setViewerStartId] = useState<string | null>(null);
  const [filter, setFilter] = useState<AdminFilter>(
    initialFilter ?? { kind: "all" },
  );
  const shown = photos.filter((photo) => matches(photo, filter));
  const activeKey = filterKey(filter);

  // The page holds every photo, so narrowing to one guest is local work. The
  // address is rewritten in place — no navigation — so the view survives a
  // reload and can still be handed on as a link.
  function select(next: AdminFilter) {
    setFilter(next);
    window.history.replaceState(null, "", filterUrl(next));
  }

  return (
    <>
      {chips && (
        <div className="flex gap-2 overflow-x-auto px-4 pb-3.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {chips.map((chip) => {
            const key = filterKey(chip);
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

      <ul className="grid grid-cols-3 gap-1.5 px-3.5">
        {shown.map((photo) => (
          <li key={photo.id} className="relative">
            <button
              type="button"
              aria-label={viewerLabels.open}
              onClick={() => setViewerStartId(photo.id)}
              className="relative block aspect-square w-full overflow-hidden rounded-tile bg-sand"
            >
              {photo.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.imageUrl}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover"
                />
              )}
              {photo.visibility === "private" && (
                <span className="absolute bottom-1.5 left-1.5 rounded-pill bg-[rgba(27,24,21,0.72)] px-[7px] py-[3px] text-[10px] text-paper">
                  {privateBadge}
                </span>
              )}
            </button>
          </li>
        ))}
      </ul>
      {viewerStartId !== null && (
        <PhotoViewer
          photos={shown}
          startId={viewerStartId}
          likes={likes}
          canManageAll
          locale={locale}
          labels={viewerLabels}
          onClose={() => setViewerStartId(null)}
        />
      )}
    </>
  );
}
