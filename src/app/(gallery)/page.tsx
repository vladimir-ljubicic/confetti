import { getDeviceId } from "@/lib/device";
import {
  DEFAULT_EVENT_DATE_ISO,
  DEFAULT_FREEZE_OFFSET_DAYS,
  daysUntilFreeze,
} from "@/lib/event-schedule";
import { getEventSettings } from "@/lib/event-settings";
import { exportJobStatus, getExportJob } from "@/lib/export-jobs";
import { pluralize } from "@/lib/i18n";
import { getDict, getLocale } from "@/lib/locale";
import { loadPublicPhotos } from "@/lib/public-photos";
import { isAdmin } from "@/lib/admin-session";
import { env } from "@/lib/env";
import { resolveSortMode } from "@/lib/sort-mode";
import { getUploaderProfile } from "@/lib/uploaders";
import { DownloadAllButton } from "../download-all-button";
import { EmptyGallery } from "../empty-gallery";
import { GalleryHeader } from "../gallery-header";
import { PhotoGrid } from "../photo-grid";
import { SortProvider } from "../sort-context";
import { UploadButton } from "../upload-button";
import { UploadQueueProvider } from "../upload-queue";
import { viewerLabels } from "../viewer-labels";

// The gallery reads the database directly; without this the page would be
// statically prerendered at build time and serve stale rows.
export const dynamic = "force-dynamic";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const locale = await getLocale();
  const dict = await getDict();
  const { sort: sortParam } = await searchParams;
  const sort = resolveSortMode(Array.isArray(sortParam) ? sortParam[0] : sortParam);
  const uploadLimits = env.uploadLimits();
  const deviceId = await getDeviceId();
  const [page, profile, settings, admin, job] = await Promise.all([
    loadPublicPhotos({ sort, viewerDeviceId: deviceId }),
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
  const photoCount = page.totalCount ?? 0;

  const uploadDaysLeft = daysUntilFreeze(settings, new Date());
  const uploadWindowLine =
    uploadsFrozen || uploadDaysLeft <= 0
      ? null
      : uploadDaysLeft === 1
        ? dict.gallery.uploadWindowToday
        : pluralize(locale, uploadDaysLeft, {
            one: dict.gallery.uploadWindowOne,
            few: dict.gallery.uploadWindowFew,
            many: dict.gallery.uploadWindowMany,
          });

  const uploadsBlocked = profile?.uploadsBlocked ?? false;
  const exportJob = uploadsFrozen ? job : null;

  if (page.photos.length === 0) {
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
      <SortProvider initial={sort}>
      <UploadQueueProvider
        labels={{
          retry: dict.upload.retry,
          cancelled: dict.upload.cancelled,
          restore: dict.upload.restore,
          cancelUpload: dict.upload.cancelUpload,
          waiting: dict.upload.waiting,
        }}
      >
        <GalleryHeader
          displayName={profile?.displayName ?? null}
          photoCount={photoCount}
          locale={locale}
          eventDateIso={settings.eventDateIso}
          uploadWindowLine={uploadWindowLine}
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

        <div className="flex flex-1 flex-col pt-3.5">
          <PhotoGrid
            photos={page.photos}
            feed={{
              endpoint: "/api/photos",
              search: `sort=${sort}`,
              nextCursor: page.nextCursor,
            }}
            emptyLabel={dict.gallery.empty}
            likeLabels={{ like: dict.gallery.like, unlike: dict.gallery.unlike }}
            viewer={{
              canManageAll: admin,
              labels: viewerLabels(dict),
              locale,
              galleryCount: photoCount,
            }}
            showUploader
          />

          {uploadsFrozen ? (
            <DownloadAllButton
              buttonLabel={dict.gallery.downloadAll}
              labels={dict.downloadSheet}
              locale={locale}
              photoCount={exportJob?.total_count ?? photoCount}
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
          )}
        </div>
      </UploadQueueProvider>
      </SortProvider>
    </main>
  );
}
