import Link from "next/link";
import { getDeviceId } from "@/lib/device";
import { areUploadsFrozen } from "@/lib/event-settings";
import { getDict } from "@/lib/locale";
import { loadPublicPhotos } from "@/lib/public-photos";
import { isAdmin } from "@/lib/admin-session";
import { env } from "@/lib/env";
import { resolveSortMode } from "@/lib/sort-mode";
import { getUploaderProfile } from "@/lib/uploaders";
import { PhotoGrid } from "./photo-grid";
import { SortToggle } from "./sort-toggle";
import { UploadButton } from "./upload-button";

// The gallery reads the database directly; without this the page would be
// statically prerendered at build time and serve stale rows.
export const dynamic = "force-dynamic";

async function deviceHasProfile() {
  const deviceId = await getDeviceId();
  if (!deviceId) return false;
  return (await getUploaderProfile(deviceId)) !== null;
}

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ sort?: string | string[] }>;
}) {
  const dict = await getDict();
  const { sort: sortParam } = await searchParams;
  const sort = resolveSortMode(
    Array.isArray(sortParam) ? sortParam[0] : sortParam,
    new Date(),
  );
  const uploadLimits = env.uploadLimits();
  const [photos, hasProfile, uploadsFrozen, admin] = await Promise.all([
    loadPublicPhotos({ sort }),
    deviceHasProfile(),
    // Fail open: browsing must survive a settings outage.
    areUploadsFrozen().catch(() => false),
    isAdmin(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-10 px-4 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-serif text-5xl text-gold-deep">{dict.meta.title}</h1>
        <p className="text-sm tracking-widest text-ink/60 uppercase">{dict.gallery.date}</p>
        {hasProfile && (
          <Link
            href="/my-photos"
            className="text-sm text-gold-deep transition hover:underline"
          >
            {dict.gallery.myPhotos}
          </Link>
        )}
      </header>

      {uploadsFrozen ? (
        <p className="max-w-md rounded-lg bg-pearl px-6 py-4 text-center text-sm text-ink/70">
          {dict.gallery.uploadsFrozen}
        </p>
      ) : (
        <UploadButton
          labels={dict.upload}
          dialogLabels={dict.firstUploadDialog}
          needsProfile={!hasProfile}
          limits={{
            maxBatch: uploadLimits.maxBatch,
            maxFileBytes: uploadLimits.maxFileBytes,
          }}
          limitsExempt={admin}
        />
      )}

      {photos.length > 0 && (
        <SortToggle
          sort={sort}
          basePath="/"
          labels={{ live: dict.gallery.sortLive, chrono: dict.gallery.sortChrono }}
        />
      )}

      <PhotoGrid
        photos={photos}
        downloadLabel={dict.gallery.download}
        emptyLabel={dict.gallery.empty}
        showUploader
      />
    </main>
  );
}
