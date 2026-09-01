"use client";

import { usePathname } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { headCoversView } from "@/lib/gallery-head";
import type { Locale } from "@/lib/i18n";
import type { PhotoAltLabels } from "@/lib/photo-alt";
import type { PublicPhoto } from "@/lib/public-photos";
import { comparePhotos, sumLikes, type SortMode } from "@/lib/sort-mode";
import { GalleryStatsProvider } from "./gallery-stats";
import { GridSkeleton } from "./grid-skeleton";
import { GuestBar, type GuestBarLabels } from "./guest-bar";
import { NewPhotosProvider } from "./new-photos";
import type { ViewerLabels } from "./photo-viewer";
import { PhotoGrid } from "./photo-grid";
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
  // History entries this view pushed itself, and so may step back through. A
  // guest's gallery opened directly has none, and leaving it pushes instead.
  const pushed = useRef(0);

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

  const revealHeldHere = useCallback(() => reveal(heldHere), [reveal, heldHere]);

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

  const selectGuest = useCallback((publicId: string) => {
    pushed.current += 1;
    setSelected((current) => ({ ...current, guestId: publicId }));
    window.history.pushState(
      null,
      "",
      `/uploader/${publicId}${window.location.search}`,
    );
    window.scrollTo(0, 0);
  }, []);

  const leaveGuest = useCallback(() => {
    if (pushed.current > 0) {
      pushed.current -= 1;
      window.history.back();
      return;
    }
    setSelected((current) => ({ ...current, guestId: null }));
    window.history.pushState(null, "", `/${window.location.search}`);
    window.scrollTo(0, 0);
  }, []);

  // The chosen order rides in the address so a reload and a shared link keep
  // it, without adding a step to go back through. Choosing the current order
  // again still brings the top of the gallery on screen.
  const changeSort = useCallback((next: SortMode) => {
    setSort(next);
    const url = new URL(window.location.href);
    if (next === "latest") url.searchParams.delete("sort");
    else url.searchParams.set("sort", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
    window.scrollTo(0, 0);
  }, []);

  return (
    <SortProvider sort={sort} onChange={changeSort}>
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
        </GalleryStatsProvider>
      </NewPhotosProvider>
    </SortProvider>
  );
}
