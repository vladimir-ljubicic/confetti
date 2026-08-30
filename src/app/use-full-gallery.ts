"use client";

import { useEffect, useMemo, useState } from "react";
import type { PublicPhoto } from "@/lib/public-photos";

// A failed background fetch backs off between attempts; the gallery keeps
// working on the server-rendered head in the meantime.
const RETRY_MS = 2000;
const RETRY_MAX_MS = 60_000;

// The whole gallery behind the server-rendered head: fetched once after
// hydration, so sorting and per-guest filtering stay local. Until it lands,
// the head is all there is — `complete` tells the view whether an order other
// than the head's can be shown yet.
export function useFullGallery(headPhotos: PublicPhoto[]): {
  photos: PublicPhoto[];
  complete: boolean;
} {
  const [full, setFull] = useState<PublicPhoto[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let delay = RETRY_MS;
    const load = () => {
      void fetch("/api/photos")
        .then((response) =>
          response.ok
            ? (response.json() as Promise<{ photos: PublicPhoto[] }>)
            : null,
        )
        .catch(() => null)
        .then((body) => {
          if (cancelled) return;
          if (body) {
            setFull(body.photos);
            return;
          }
          timer = window.setTimeout(load, delay);
          delay = Math.min(delay * 2, RETRY_MAX_MS);
        });
    };
    load();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, []);

  // The head rides in front of the fetched set: a router.refresh() re-renders
  // it with rows the background fetch may predate (a photo just uploaded or
  // deleted), so where both hold a photo the head's copy wins.
  const photos = useMemo(() => {
    if (full === null) return headPhotos;
    const seen = new Set<string>();
    const merged: PublicPhoto[] = [];
    for (const photo of [...headPhotos, ...full]) {
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);
      merged.push(photo);
    }
    return merged;
  }, [headPhotos, full]);

  return { photos, complete: full !== null };
}
