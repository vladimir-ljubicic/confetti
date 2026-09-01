"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  admitPhotos,
  holdNewPhotos,
  mergeGallery,
  type FullGallery,
} from "@/lib/gallery-head";
import type { PublicPhoto } from "@/lib/public-photos";

// A failed background fetch backs off between attempts; the gallery keeps
// working on the server-rendered head in the meantime.
const RETRY_MS = 2000;
const RETRY_MAX_MS = 60_000;

// How stale the fetched gallery may grow before a return to the tab refetches
// it. There is no polling: a tab that stays visible keeps what it has.
const REFRESH_AFTER_MS = 30_000;

const photoIds = (photos: PublicPhoto[]) =>
  new Set(photos.map((photo) => photo.id));

// The whole gallery behind the server-rendered head: fetched once after
// hydration, and again whenever the tab comes back after the fetched set has
// grown stale, so sorting and per-guest filtering stay local while new photos
// and like-counts still arrive without a reload. Until the first fetch lands,
// the head is all there is — `complete` tells the view whether an order other
// than the head's can be shown yet.
//
// The first fetch is the gallery as the guest opened it, and enters whole.
// After it, only the guest's own photos join the grid by themselves: everyone
// else's wait in `held` until `reveal` admits them, so no photo inserts itself
// under a scroll. `reveal` admits the photos it is given rather than all of
// `held` — the caller narrows the grid, so only the caller knows which of them
// a pill just spoke for.
export function useFullGallery(headPhotos: PublicPhoto[]): {
  photos: PublicPhoto[];
  complete: boolean;
  held: PublicPhoto[];
  reveal: (photos: PublicPhoto[]) => void;
} {
  const [full, setFull] = useState<FullGallery<PublicPhoto> | null>(null);

  const headRef = useRef(headPhotos);
  useEffect(() => {
    headRef.current = headPhotos;
  });

  const inFlight = useRef<Promise<boolean> | null>(null);
  // Stamped on success only: after a failed fetch the gallery is stale, so
  // the next return to the tab must try again rather than sit out the window.
  const fetchedAt = useRef(Number.NEGATIVE_INFINITY);

  // Resolves with whether the gallery is now fetched; concurrent callers
  // share one request and its outcome.
  const load = useCallback((): Promise<boolean> => {
    if (inFlight.current !== null) return inFlight.current;
    const head = headRef.current;
    const request = fetch("/api/photos")
      .then((response) =>
        response.ok
          ? (response.json() as Promise<{ photos: PublicPhoto[] }>)
          : null,
      )
      .catch(() => null)
      .then((body) => {
        inFlight.current = null;
        if (body === null) return false;
        fetchedAt.current = Date.now();
        setFull({ photos: body.photos, head });
        return true;
      });
    inFlight.current = request;
    return request;
  }, []);

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let delay = RETRY_MS;
    const attempt = () => {
      void load().then((loaded) => {
        if (cancelled || loaded) return;
        timer = window.setTimeout(attempt, delay);
        delay = Math.min(delay * 2, RETRY_MAX_MS);
      });
    };
    attempt();
    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
    };
  }, [load]);

  // Coming back to the tab refetches a gallery grown stale while it was
  // away; a refresh that fails is retried on the next return.
  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - fetchedAt.current < REFRESH_AFTER_MS) return;
      void load();
    };
    window.addEventListener("focus", refresh);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);

  const gallery = useMemo(
    () => mergeGallery(headPhotos, full),
    [headPhotos, full],
  );

  // Which photos the grid has let in; null until the first fetch settles it.
  const [admitted, setAdmitted] = useState<ReadonlySet<string> | null>(null);
  if (admitted === null && full !== null) setAdmitted(photoIds(gallery));

  const { shown, held } = useMemo(
    () => holdNewPhotos(gallery, admitted),
    [gallery, admitted],
  );

  const reveal = useCallback(
    (photos: PublicPhoto[]) =>
      setAdmitted((current) => admitPhotos(current, photos)),
    [],
  );

  return { photos: shown, complete: full !== null, held, reveal };
}
