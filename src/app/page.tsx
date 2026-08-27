import { getDeviceId } from "@/lib/device";
import { areUploadsFrozen } from "@/lib/event-settings";
import { getDict, getLocale } from "@/lib/locale";
import { loadPublicPhotos } from "@/lib/public-photos";
import { isAdmin } from "@/lib/admin-session";
import { env } from "@/lib/env";
import { resolveSortMode } from "@/lib/sort-mode";
import { getUploaderProfile } from "@/lib/uploaders";
import { DownloadAllButton } from "./download-all-button";
import { EmptyGallery } from "./empty-gallery";
import { GalleryHeader } from "./gallery-header";
import { PhotoGrid } from "./photo-grid";
import { UploadButton } from "./upload-button";
import { UploadQueueProvider } from "./upload-queue";

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
  const sort = resolveSortMode(
    Array.isArray(sortParam) ? sortParam[0] : sortParam,
    new Date(),
  );
  const uploadLimits = env.uploadLimits();
  const deviceId = await getDeviceId();
  const [photos, profile, uploadsFrozen, admin] = await Promise.all([
    loadPublicPhotos({ sort, viewerDeviceId: deviceId }),
    deviceId ? getUploaderProfile(deviceId) : null,
    // Fail open: browsing must survive a settings outage.
    areUploadsFrozen().catch(() => false),
    isAdmin(),
  ]);

  if (photos.length === 0) {
    return (
      <EmptyGallery
        dict={dict}
        locale={locale}
        uploadsFrozen={uploadsFrozen}
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
        <GalleryHeader
          displayName={profile?.displayName ?? null}
          photoCount={photos.length}
          sort={sort}
          locale={locale}
          labels={{
            eyebrow: dict.gallery.eyebrow,
            myPhotos: dict.gallery.myPhotos,
            sortLive: dict.gallery.sortLive,
            sortChrono: dict.gallery.sortChrono,
            localeAriaLabel: dict.localeToggle.ariaLabel,
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
            photos={photos}
            emptyLabel={dict.gallery.empty}
            likeLabels={{ like: dict.gallery.like, unlike: dict.gallery.unlike }}
          />

          {uploadsFrozen ? (
            <DownloadAllButton
              buttonLabel={dict.gallery.downloadAll}
              labels={dict.downloadSheet}
              photoCount={photos.length}
            />
          ) : (
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
    </main>
  );
}
