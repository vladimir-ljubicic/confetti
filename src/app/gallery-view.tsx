"use client";

import { usePathname } from "next/navigation";
import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n";
import type { PhotoAltLabels } from "@/lib/photo-alt";
import type { PublicPhoto } from "@/lib/public-photos";
import { comparePhotos, type SortMode } from "@/lib/sort-mode";
import { GalleryCountProvider } from "./gallery-count";
import { GuestBar, type GuestBarLabels } from "./guest-bar";
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
  initialGuestName = null,
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
  // The server-rendered head of the gallery: the first screens of tiles in
  // `initialSort` order.
  photos: PublicPhoto[];
  initialSort: SortMode;
  // Whose gallery a cold load landed on, for the header of a guest whose
  // photos are all private and so absent from `photos`.
  initialGuestName?: string | null;
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

  const { photos, complete } = useFullGallery(headPhotos);
  // The head holds only its own order; another one has nothing correct to
  // show until the full set lands, so the grid waits on the in-flight fetch
  // rather than asking the server for a re-sorted head.
  const sortPending = !complete && sort !== initialSort;

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

  const guest = useMemo(() => {
    if (guestId === null) return null;
    return {
      displayName: shown[0]?.uploader?.displayName ?? initialGuestName ?? "",
      photoCount: shown.length,
      likeTotal: shown.reduce((sum, photo) => sum + photo.likeCount, 0),
    };
  }, [guestId, shown, initialGuestName]);

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
  // it, without adding a step to go back through.
  const changeSort = useCallback((next: SortMode) => {
    setSort(next);
    const url = new URL(window.location.href);
    if (next === "latest") url.searchParams.delete("sort");
    else url.searchParams.set("sort", next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }, []);

  return (
    <SortProvider sort={sort} onChange={changeSort}>
      <GalleryCountProvider count={photos.length}>
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
          {/* While the toggled order waits on the background fetch the grid
              area stands empty, as it does under the gallery's loading
              screen: a tile's height is its photo's, and those photos are
              not known yet. */}
          {!sortPending && (
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
      </GalleryCountProvider>
    </SortProvider>
  );
}
