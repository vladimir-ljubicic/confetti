"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Where the pages after the first one come from. The search also identifies
// the feed: a different one is a different order or a different set of photos,
// so nothing fetched under it carries over.
export type PhotoFeedSource = {
  endpoint: string;
  search: string;
  nextCursor: string | null;
};

export type FeedPage<T> = {
  photos: T[];
  nextCursor: string | null;
};

export type PhotoFeed<T> = {
  photos: T[];
  // Place in the page a photo arrived with, for staggering its entrance;
  // absent for the photos the feed started with.
  enterOrder: ReadonlyMap<string, number>;
  loading: boolean;
  loadMore: () => void;
  sentinelRef: (node: HTMLDivElement | null) => void;
};

const NO_PAGES: never[] = [];

// Starts loading a page while the bottom of the gallery is still this far off,
// so the grid keeps growing ahead of a fast scroll.
const PREFETCH_MARGIN = "800px";

export function usePhotoFeed<T extends { id: string }>(
  serverPhotos: T[],
  source?: PhotoFeedSource,
): PhotoFeed<T> {
  const key = source ? `${source.endpoint}?${source.search}` : "";
  const [fetched, setFetched] = useState<{
    key: string;
    pages: FeedPage<T>[];
  }>({ key, pages: NO_PAGES });
  const [loading, setLoading] = useState(false);
  // The photos the feed starts from come back with the new search, so
  // everything fetched under the old one has to go.
  if (fetched.key !== key) setFetched({ key, pages: NO_PAGES });
  const pages = fetched.key === key ? fetched.pages : NO_PAGES;

  const photos = useMemo(() => {
    if (pages.length === 0) return serverPhotos;
    // A refreshed first page can overlap what was fetched below it (an upload
    // pushes rows down), so the first copy of a photo wins.
    const seen = new Set<string>();
    const merged: T[] = [];
    for (const photo of [serverPhotos, ...pages.map((page) => page.photos)].flat()) {
      if (seen.has(photo.id)) continue;
      seen.add(photo.id);
      merged.push(photo);
    }
    return merged;
  }, [serverPhotos, pages]);

  const enterOrder = useMemo(() => {
    const order = new Map<string, number>();
    for (const page of pages) {
      page.photos.forEach((photo, index) => {
        order.set(photo.id, index);
      });
    }
    return order;
  }, [pages]);

  const cursor =
    pages.length === 0 ? (source?.nextCursor ?? null) : (pages.at(-1)?.nextCursor ?? null);
  const endpoint = source?.endpoint;
  const search = source?.search;

  // Two triggers can land in the same tick (the sentinel and a swipe to the
  // end of the viewer), before any state has been re-rendered.
  const inFlight = useRef(false);
  const loadMore = useCallback(() => {
    if (endpoint === undefined || cursor === null || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    const params = new URLSearchParams(search);
    params.set("cursor", cursor);
    void fetch(`${endpoint}?${params}`)
      .then((response) => (response.ok ? (response.json() as Promise<FeedPage<T>>) : null))
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
  }, [endpoint, search, cursor, key]);

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

  return { photos, enterOrder, loading, loadMore, sentinelRef: setSentinel };
}
