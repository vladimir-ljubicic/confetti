"use client";

import { ViewTransition, type ReactNode } from "react";
import { photoZoomName } from "@/lib/view-transition";

// One end of a photo's travel between its gallery tile and the viewer's stage.
// Both ends name themselves this way, and the browser morphs the one it finds
// leaving into the one it finds arriving. Given no id the element stands aside:
// two elements answering to one name leave nothing to morph between.
export function PhotoZoom({
  photoId,
  children,
}: {
  photoId: string | null;
  children: ReactNode;
}) {
  return (
    <ViewTransition
      name={photoId === null ? undefined : photoZoomName(photoId)}
      share="photo-zoom"
      default="none"
    >
      {children}
    </ViewTransition>
  );
}
