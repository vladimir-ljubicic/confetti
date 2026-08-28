"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { PublicPhoto, PublicPhotoPage } from "@/lib/public-photos";
import type { SortMode } from "@/lib/sort-mode";

// Where the pages after the server-rendered first one come from.
export type PhotoFeedSource = {
  sort: SortMode;
  nextCursor: string | null;
  uploaderPublicId?: string;
};

export type PhotoFeed = {
  photos: PublicPhoto[];
  loading: boolean;
  loadMore: () => void;
  sentinelRef: (node: HTMLDivElement | null) => void;
};

const NO_PAGES: PublicPhotoPage[] = [];

// Starts loading a page while the bottom of the gallery is still this far off,
// so the grid keeps growing ahead of a fast scroll.
const PREFETCH_MARGIN = "800px";

export function usePhotoFeed(
  serverPhotos: PublicPhoto[],
  source?: PhotoFeedSource,
): PhotoFeed {
  const key = `${source?.sort ?? ""}|${source?.uploaderPublicId ?? ""}`;
  const [fetched, setFetched] = useState<{
    key: string;
    pages: PublicPhotoPage[];
  }>({ key, pages: NO_PAGES });
  const [loading, setLoading] = useState(false);
  // Switching sort re-renders the page server-side under the new order, so
  // everything fetched under the old one has to go.
  if (fetched.key !== key) setFetched({ key, pages: NO_PAGES });
  const pages = fetched.key === key ? fetched.pages : NO_PAGES;

  const photos = useMemo(() => {
    if (pages.length === 0) return serverPhotos;
    // A refreshed first page can overlap what was fetched below it (an upload
    // pushes rows down), so the first copy of a photo wins.
    const seen = new Set<string>();
    const merged: PublicPhoto[] = [];
    for (const photo of [serverPhotos, ...pages.map((page) => page.photos)].flat()) {
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);
      merged.push(photo);
    }
    return merged;
  }, [serverPhotos, pages]);

  const cursor =
    pages.length === 0 ? (source?.nextCursor ?? null) : (pages.at(-1)?.nextCursor ?? null);
  const sort = source?.sort;
  const uploaderPublicId = source?.uploaderPublicId;

  // Two triggers can land in the same tick (the sentinel and a swipe to the
  // end of the viewer), before any state has been re-rendered.
  const inFlight = useRef(false);
  const loadMore = useCallback(() => {
    if (sort === undefined || cursor === null || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    const params = new URLSearchParams({ sort, cursor });
    if (uploaderPublicId) params.set("uploader", uploaderPublicId);
    void fetch(`/api/photos?${params}`)
      .then((response) => (response.ok ? (response.json() as Promise<PublicPhotoPage>) : null))
      .catch(() => null)
      .then((page) => {
        inFlight.current = false;
        setLoading(false);
        // A failed page is left for the next scroll to ask for again.
        if (!page) return;
        setFetched((current) =>
          current.key === key
            ? { key, pages: [...current.pages, page] }
            : current,
        );
      });
  }, [sort, uploaderPublicId, cursor, key]);

  // Held in a ref so the observer is set up once: re-observing a sentinel that
  // is already on screen fires again immediately, which after a failed page
  // would spin.
  const latestLoadMore = useRef(loadMore);
  useEffect(() => {
    latestLoadMore.current = loadMore;
  }, [loadMore]);

  const [sentinel, setSentinel] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          latestLoadMore.current();
        }
      },
      { rootMargin: PREFETCH_MARGIN },
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [sentinel]);

  return { photos, loading, loadMore, sentinelRef: setSentinel };
}
