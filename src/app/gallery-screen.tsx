import { getDeviceId } from "@/lib/device";
import {
  DEFAULT_EVENT_DATE_ISO,
  DEFAULT_FREEZE_OFFSET_DAYS,
} from "@/lib/event-schedule";
import { getEventSettings } from "@/lib/event-settings";
import { exportJobStatus, getExportJob } from "@/lib/export-jobs";
import { getDict, getLocale } from "@/lib/locale";
import { hasPublicPhotos, loadPublicPhotos } from "@/lib/public-photos";
import { isAdmin } from "@/lib/admin-session";
import { env } from "@/lib/env";
import { getUploaderProfile } from "@/lib/uploaders";
import type { SortMode } from "@/lib/sort-mode";
import { DownloadAllButton } from "./download-all-button";
import { EmptyGallery } from "./empty-gallery";
import { GalleryHeader } from "./gallery-header";
import { GalleryView } from "./gallery-view";
import { guestBarLabels } from "./guest-labels";
import { UploadButton } from "./upload-button";
import { uploadTileLabels } from "./upload-labels";
import { UploadQueueProvider } from "./upload-queue";
import { uploadWindowLine } from "./upload-window";
import { photoAltLabels, viewerLabels } from "./viewer-labels";

// Every route that shows the gallery renders this: a first paint's worth of
// tiles, with the client fetching the rest in the background and deciding
// locally whether it is showing all of them or one guest's. Both entries
// therefore leave and re-enter a guest's gallery without asking the server for
// anything.
export type GalleryGuest = {
  publicId: string;
  uploaderId: string;
  displayName: string;
};

export async function GalleryScreen({
  sort,
  guest = null,
}: {
  sort: SortMode;
  // Set when the route names a guest: the first paint is their photos alone,
  // queried by their id rather than filtered out of the whole gallery.
  guest?: GalleryGuest | null;
}) {
  const locale = await getLocale();
  const dict = await getDict();
  const uploadLimits = env.uploadLimits();
  const deviceId = await getDeviceId();
  const [photos, profile, settings, admin, job] = await Promise.all([
    guest
      ? loadPublicPhotos({ sort, viewerDeviceId: deviceId, uploaderId: guest.uploaderId })
      : loadPublicPhotos({ sort, viewerDeviceId: deviceId, head: true }),
    deviceId ? getUploaderProfile(deviceId) : null,
    // Fail open: browsing must survive a settings outage.
    getEventSettings().catch(() => ({
      uploadsFrozen: false,
      eventDateIso: DEFAULT_EVENT_DATE_ISO,
      freezeOffsetDays: DEFAULT_FREEZE_OFFSET_DAYS,
    })),
    isAdmin(),
    // Only the frozen gallery shows it, but asking alongside the rest keeps it
    // off the critical path once frozen — which is where the gallery stays.
    getExportJob("public").catch(() => null),
  ]);
  const uploadsFrozen = settings.uploadsFrozen;

  const uploadsBlocked = profile?.uploadsBlocked ?? false;
  const exportJob = uploadsFrozen ? job : null;

  // An empty guest-scoped load says nothing about the gallery at large: a
  // guest with no public photos gets their named, empty gallery, and only an
  // event with no public photos anywhere gets the welcome screen.
  if (photos.length === 0 && (!guest || !(await hasPublicPhotos()))) {
    return (
      <EmptyGallery
        dict={dict}
        locale={locale}
        eventDateIso={settings.eventDateIso}
        uploadsFrozen={uploadsFrozen}
        uploadsBlocked={uploadsBlocked}
        needsProfile={!profile}
        limits={{
          maxBatch: uploadLimits.maxBatch,
          maxFileBytes: uploadLimits.maxFileBytes,
        }}
        limitsExempt={admin}
      />
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col">
      <UploadQueueProvider labels={uploadTileLabels(dict)}>
        <GalleryView
          photos={photos}
          initialSort={sort}
          initialGuest={
            guest ? { publicId: guest.publicId, displayName: guest.displayName } : null
          }
          locale={locale}
          viewerName={profile?.displayName ?? null}
          canManageAll={admin}
          altLabels={photoAltLabels(dict)}
          likeLabels={{ like: dict.gallery.like, unlike: dict.gallery.unlike }}
          viewerLabels={viewerLabels(dict)}
          emptyLabel={dict.gallery.empty}
          guestEmptyLabel={dict.uploaderPage.empty}
          guestLabels={guestBarLabels(dict)}
          // Keyed: these stream in after the grid's photos, and React's
          // development build otherwise reports a missing key on a node that
          // arrives late next to the view's own.
          header={
            <GalleryHeader
              key="header"
              displayName={profile?.displayName ?? null}
              locale={locale}
              eventDateIso={settings.eventDateIso}
              uploadWindowLine={uploadWindowLine(dict, locale, settings, new Date())}
              labels={{
                eyebrow: dict.gallery.eyebrow,
                myPhotos: dict.gallery.myPhotos,
                sortLatest: dict.gallery.sortLatest,
                sortPopular: dict.gallery.sortPopular,
                localeAriaLabel: dict.localeToggle.ariaLabel,
                coachMark: dict.gallery.coachMark,
                coachMarkDismiss: dict.gallery.coachMarkDismiss,
              }}
              frozenNotice={
                uploadsFrozen
                  ? { title: dict.gallery.frozenTitle, body: dict.gallery.frozenBody }
                  : null
              }
              offlineNotice={{
                title: dict.upload.offlineTitle,
                bodyOne: dict.upload.offlineBodyOne,
                bodyFew: dict.upload.offlineBodyFew,
                bodyMany: dict.upload.offlineBodyMany,
                retry: dict.upload.offlineRetry,
              }}
            />
          }
          footer={
            uploadsFrozen ? (
              <DownloadAllButton
                key="footer"
                buttonLabel={dict.gallery.downloadAll}
                labels={dict.downloadSheet}
                locale={locale}
                photoCount={exportJob?.total_count ?? null}
                sizeBytes={exportJob?.zip_size_bytes ?? null}
                initialStatus={exportJob ? exportJobStatus(exportJob) : null}
              />
            ) : uploadsBlocked ? null : (
              <UploadButton
                key="footer"
                labels={dict.upload}
                sheetLabels={dict.introSheet}
                locale={locale}
                needsProfile={!profile}
                limits={{
                  maxBatch: uploadLimits.maxBatch,
                  maxFileBytes: uploadLimits.maxFileBytes,
                }}
                limitsExempt={admin}
              />
            )
          }
        />
      </UploadQueueProvider>
    </main>
  );
}
