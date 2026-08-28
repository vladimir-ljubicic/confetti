"use client";

import { useState } from "react";
import { PhotoViewer, type ViewerLabels } from "@/app/photo-viewer";
import { useLikes } from "@/app/use-likes";
import type { PublicPhoto } from "@/lib/public-photos";
import type { Visibility } from "@/lib/uploader-profile";

export type AdminPhoto = PublicPhoto & { visibility: Visibility };

export function AdminPhotoGrid({
  photos,
  privateBadge,
  viewerLabels,
}: {
  photos: AdminPhoto[];
  privateBadge: string;
  viewerLabels: ViewerLabels;
}) {
  const likes = useLikes();
  const [viewerStartId, setViewerStartId] = useState<string | null>(null);

  return (
    <>
      <ul className="grid grid-cols-3 gap-1.5 px-3.5">
        {photos.map((photo) => (
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
          photos={photos}
          startId={viewerStartId}
          likes={likes}
          canManageAll
          labels={viewerLabels}
          onClose={() => setViewerStartId(null)}
        />
      )}
    </>
  );
}
