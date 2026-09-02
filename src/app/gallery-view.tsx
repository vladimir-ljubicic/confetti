"use client";

import { usePathname } from "next/navigation";
import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { headCoversView } from "@/lib/gallery-head";
import type { Locale } from "@/lib/i18n";
import type { PhotoAltLabels } from "@/lib/photo-alt";
import type { PublicPhoto } from "@/lib/public-photos";
import type { ScrubLabels } from "@/lib/scrub-rail";
import { comparePhotos, sumLikes, type SortMode } from "@/lib/sort-mode";
import { restartLatest, resumeSort, type SortScroll } from "@/lib/sort-scroll";
import { BackToTop } from "./back-to-top";
import { GalleryStatsProvider } from "./gallery-stats";
import { GridSkeleton } from "./grid-skeleton";
import { GuestBar, type GuestBarLabels } from "./guest-bar";
import { NewPhotosProvider } from "./new-photos";
import type { ViewerLabels } from "./photo-viewer";
import { PhotoGrid } from "./photo-grid";
import { ScrubProvider, ScrubRail } from "./scrub-rail";
import { SortProvider } from "./sort-context";
import { useFullGallery } from "./use-full-gallery";

const GUEST_PATH = /^\/uploader\/([^/?#]+)/;

// The whole gallery in one place: the server hands over its first screens and
// the rest arrives by a background fetch, after which ordering and narrowing
// to one guest are both local — the toggle and the uploader labels rearrange
// what is already loaded instead of asking the server for it again. A guest's
// gallery keeps its own address, which the view pushes and reads back rather
// than navigating.
export function GalleryView({
  photos: headPhotos,
  initialSort,
  initialLikeTotal,
  initialGuest = null,
  locale,
  viewerName,
  canManageAll,
  altLabels,
  likeLabels,
  viewerLabels,
  emptyLabel,
  guestEmptyLabel,
  guestLabels,
  backToTopLabel,
  scrubLabels,
  header,
  footer,
}: {
  // What the server rendered: the gallery's first screens of tiles in
  // `initialSort` order, or — when the load landed on a guest's gallery —
  // that guest's complete public set.
  photos: PublicPhoto[];
  initialSort: SortMode;
  // Likes across the whole gallery as the server counted them. The head can
  // only be summed for its own screenful, so the sort toggle reads this until
  // the background fetch makes the client's own sum the gallery's.
  initialLikeTotal: number;
  // The guest whose gallery a cold load landed on, and so whose photos are
  // all `photos` holds. Their name comes along for the header of a guest
  // whose photos are all private and so absent even there.
  initialGuest?: { publicId: string; displayName: string } | null;
  locale: Locale;
  viewerName: string | null;
  canManageAll: boolean;
  altLabels: PhotoAltLabels;
  likeLabels: { like: string; unlike: string };
  viewerLabels: ViewerLabels;
  emptyLabel: string;
  guestEmptyLabel: string;
  guestLabels: GuestBarLabels;
  backToTopLabel: string;
  scrubLabels: ScrubLabels;
  header: ReactNode;
  footer: ReactNode;
}) {
  const pathname = usePathname();
  const routeGuestId = GUEST_PATH.exec(pathname)?.[1] ?? null;
  // The address says whose gallery this is, but the router reports an address
  // this view pushed itself a render late — long enough for the unnarrowed
  // gallery to appear for a frame under a viewer already closing off it. So
  // the choice is rendered as it is made, and the address corrects it if it
  // ever moves on its own, as it does when stepping back through history.
  const [selected, setSelected] = useState({
    route: routeGuestId,
    guestId: routeGuestId,
  });
  if (selected.route !== routeGuestId) {
    setSelected({ route: routeGuestId, guestId: routeGuestId });
  }
  const guestId = selected.guestId;
  const [sort, setSort] = useState(initialSort);
  // History entries this view may step back through: the ones it pushed
  // itself, and the viewer's own when its uploader pill hands one over. A
  // guest's gallery opened directly has none, and leaving it pushes instead.
  const pushed = useRef(0);
  // Where the guest was standing in each order of the gallery on screen. Any
  // change to which photos an order holds — narrowing to a guest, widening
  // back, letting in the photos the pill announced — empties it, since the
  // places it keeps no longer name anything.
  const scrollMemory = useRef<SortScroll>({});
  // Where the next order is to be entered, applied once it has laid itself
  // out: the two orders deal the same photos into columns of different
  // heights, and a page still as tall as the outgoing one clamps the scroll.
  const landing = useRef<number | null>(null);
  // Where this gallery was standing when it narrowed to a guest's, to be found
  // again when that gallery is left. Nothing about the step back can be left to
  // the browser: it restores against a page still only as tall as the guest's
  // gallery, and a viewer that handed its entry over took scroll restoration
  // off this gallery's entry with it.
  const resumeAt = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (landing.current === null) return;
    window.scrollTo(0, landing.current);
    landing.current = null;
  }, [sort]);

  useLayoutEffect(() => {
    if (guestId !== null || resumeAt.current === null) return;
    window.scrollTo(0, resumeAt.current);
    resumeAt.current = null;
  }, [guestId]);

  const { photos, complete, held, reveal } = useFullGallery(headPhotos);
  // A view outside what the server rendered — another order of the gallery
  // head, or anything beyond a guest-scoped load — has nothing correct to
  // show until the full set lands, so the grid waits on the in-flight fetch
  // rather than asking the server again.
  const gridPending =
    !complete &&
    !headCoversView(
      { guestId: initialGuest?.publicId ?? null, sort: initialSort },
      { guestId, sort },
    );

  const ordered = useMemo(
    () => [...photos].sort(comparePhotos(sort)),
    [photos, sort],
  );

  const shown = useMemo(
    () =>
      guestId === null
        ? ordered
        : ordered.filter((photo) => photo.uploader?.publicId === guestId),
    [ordered, guestId],
  );

  // A guest's gallery announces only what it would itself show, and its pill
  // admits only that: the rest keep waiting for the pill of the gallery they
  // belong to, rather than entering under a scroll nobody was looking at.
  const heldHere = useMemo(
    () =>
      guestId === null
        ? held
        : held.filter((photo) => photo.uploader?.publicId === guestId),
    [held, guestId],
  );

  const revealHeldHere = useCallback(() => {
    scrollMemory.current = {};
    resumeAt.current = null;
    reveal(heldHere);
  }, [reveal, heldHere]);

  const likeTotal = useMemo(
    () => (complete ? sumLikes(photos) + sumLikes(held) : initialLikeTotal),
    [complete, photos, held, initialLikeTotal],
  );

  const guest = useMemo(() => {
    if (guestId === null) return null;
    const uploader = shown[0]?.uploader;
    return {
      displayName: uploader?.displayName ?? initialGuest?.displayName ?? "",
      photoCount: shown.length,
      // Their whole gallery's likes rather than the loaded photos' — the same
      // scope the header's total has, so neither gate turns on how much of the
      // gallery is here yet or on what waits behind the pill.
      likeTotal: uploader?.likeTotal ?? 0,
    };
  }, [guestId, shown, initialGuest]);

  // The viewer's uploader pill hands its own entry over rather than leaving
  // one behind to step through, so the guest's gallery takes that entry's
  // place instead of adding one; `over` says whether stepping back off it
  // lands on this view, which an entry the viewer never pushed need not.
  const selectGuest = useCallback(
    (publicId: string, over?: { steppable: boolean }) => {
      if (over === undefined || over.steppable) pushed.current += 1;
      scrollMemory.current = {};
      // The pill of the guest whose gallery this already is narrows nothing,
      // and the place kept is still the wide gallery's own.
      if (guestId === null) resumeAt.current = window.scrollY;
      setSelected((current) => ({ ...current, guestId: publicId }));
      const address = `/uploader/${publicId}${window.location.search}`;
      if (over === undefined) window.history.pushState(null, "", address);
      else window.history.replaceState(null, "", address);
      window.scrollTo(0, 0);
    },
    [guestId],
  );

  const leaveGuest = useCallback(() => {
    scrollMemory.current = {};
    if (pushed.current > 0) {
      pushed.current -= 1;
      window.history.back();
      return;
    }
    setSelected((current) => ({ ...current, guestId: null }));
    window.history.pushState(null, "", `/${window.location.search}`);
    if (resumeAt.current === null) window.scrollTo(0, 0);
  }, []);

  // The chosen order rides in the address so a reload and a shared link keep
  // it, without adding a step to go back through.
  const goToSort = useCallback(
    (next: SortMode, move: { memory: SortScroll; scrollTo: number }) => {
      scrollMemory.current = move.memory;
      resumeAt.current = null;
      // The order already on screen lays out no differently for being chosen
      // again, so its top is there to be reached straight away.
      if (next === sort) {
        window.scrollTo(0, move.scrollTo);
      } else {
        landing.current = move.scrollTo;
        setSort(next);
      }
      const url = new URL(window.location.href);
      if (next === "latest") url.searchParams.delete("sort");
      else url.searchParams.set("sort", next);
      window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    },
    [sort],
  );

  const changeSort = useCallback(
    (next: SortMode) =>
      goToSort(
        next,
        resumeSort(scrollMemory.current, sort, next, window.scrollY),
      ),
    [sort, goToSort],
  );

  const showLatest = useCallback(
    () =>
      goToSort(
        "latest",
        restartLatest(scrollMemory.current, sort, window.scrollY),
      ),
    [sort, goToSort],
  );

  return (
    <ScrubProvider>
      <SortProvider sort={sort} onChange={changeSort} onLatest={showLatest}>
        <NewPhotosProvider count={heldHere.length} reveal={revealHeldHere}>
          <GalleryStatsProvider
            count={complete || initialGuest === null ? photos.length : null}
            likeTotal={likeTotal}
          >
            {guest ? (
              <GuestBar
                displayName={guest.displayName}
                photoCount={guest.photoCount}
                likeTotal={guest.likeTotal}
                viewerName={viewerName}
                locale={locale}
                labels={guestLabels}
                onBack={leaveGuest}
              />
            ) : (
              header
            )}

            <div className="flex flex-1 flex-col pt-3.5">
              {gridPending ? (
                <GridSkeleton />
              ) : (
                <PhotoGrid
                  photos={shown}
                  emptyLabel={guest ? guestEmptyLabel : emptyLabel}
                  altLabels={altLabels}
                  likeLabels={likeLabels}
                  showUploadTiles={guest === null}
                  viewer={{
                    canManageAll,
                    labels: viewerLabels,
                    locale,
                    galleryCount: guest ? guest.photoCount : photos.length,
                  }}
                  showUploader
                  onSelectUploader={selectGuest}
                />
              )}

              {guest === null && footer}
            </div>

            <BackToTop label={backToTopLabel} />
            <ScrubRail
              photos={shown}
              sort={sort}
              locale={locale}
              labels={scrubLabels}
            />
          </GalleryStatsProvider>
        </NewPhotosProvider>
      </SortProvider>
    </ScrubProvider>
  );
}
