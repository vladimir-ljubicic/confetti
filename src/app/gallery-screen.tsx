import { getDeviceId } from "@/lib/device";
import {
  DEFAULT_EVENT_DATE_ISO,
  DEFAULT_FREEZE_OFFSET_DAYS,
} from "@/lib/event-schedule";
import { getEventSettings } from "@/lib/event-settings";
import { exportJobStatus, getExportJob } from "@/lib/export-jobs";
import { getDict, getLocale } from "@/lib/locale";
import { loadPublicPhotos } from "@/lib/public-photos";
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
import { UploadQueueProvider } from "./upload-queue";
import { uploadWindowLine } from "./upload-window";
import { photoAltLabels, viewerLabels } from "./viewer-labels";

// Every route that shows the gallery renders this: the first screens of tiles,
// with the client fetching the rest in the background and deciding locally
// whether it is showing all of them or one guest's. Both entries therefore
// leave and re-enter a guest's gallery without asking the server for anything.
export async function GalleryScreen({
  sort,
  guestName = null,
}: {
  sort: SortMode;
  // Set when the route names a guest, so their header has a name even before
  // one of their photos is on screen.
  guestName?: string | null;
}) {
  const locale = await getLocale();
  const dict = await getDict();
  const uploadLimits = env.uploadLimits();
  const deviceId = await getDeviceId();
  const [photos, profile, settings, admin, job] = await Promise.all([
    loadPublicPhotos({ sort, viewerDeviceId: deviceId, head: true }),
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

  if (photos.length === 0) {
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
      <UploadQueueProvider
        labels={{
          retry: dict.upload.retry,
          cancelled: dict.upload.cancelled,
          restore: dict.upload.restore,
          cancelUpload: dict.upload.cancelUpload,
          waiting: dict.upload.waiting,
        }}
      >
        <GalleryView
          photos={photos}
          initialSort={sort}
          initialGuestName={guestName}
          locale={locale}
          viewerName={profile?.displayName ?? null}
          canManageAll={admin}
          altLabels={photoAltLabels(dict)}
          likeLabels={{ like: dict.gallery.like, unlike: dict.gallery.unlike }}
          viewerLabels={viewerLabels(dict)}
          emptyLabel={dict.gallery.empty}
          guestEmptyLabel={dict.uploaderPage.empty}
          guestLabels={guestBarLabels(dict)}
          header={
            <GalleryHeader
              displayName={profile?.displayName ?? null}
              photoCount={photos.length}
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
                buttonLabel={dict.gallery.downloadAll}
                labels={dict.downloadSheet}
                locale={locale}
                photoCount={exportJob?.total_count ?? null}
                sizeBytes={exportJob?.zip_size_bytes ?? null}
                initialStatus={exportJob ? exportJobStatus(exportJob) : null}
              />
            ) : uploadsBlocked ? null : (
              <UploadButton
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
