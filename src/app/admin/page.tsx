import Link from "next/link";
import { viewerLabels } from "@/app/viewer-labels";
import { groupPhotosByUploader } from "@/lib/admin-photos";
import { isAdmin } from "@/lib/admin-session";
import { areUploadsFrozen } from "@/lib/event-settings";
import { formatSize } from "@/lib/export";
import { exportJobStatus, getExportJob } from "@/lib/export-jobs";
import { pluralize } from "@/lib/i18n";
import { getDict, getLocale } from "@/lib/locale";
import { galleryImageUrl, originalDownloadUrl } from "@/lib/photo-urls";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { Visibility } from "@/lib/uploader-profile";
import { AdminChrome, AdminTopRow, adminChromeLabels } from "./admin-chrome";
import { AdminDownloadRow } from "./download-row";
import { AdminPhotoGrid, type AdminPhoto } from "./admin-photo-grid";
import { FreezeToggle } from "./freeze-toggle";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

type AdminPhotoRow = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  size_bytes: number;
  visibility: Visibility;
  like_count: number;
  uploaded_at: string;
  uploaders: { display_name: string | null; public_id: string } | null;
};

async function loadAllPhotos(): Promise<{ photos: AdminPhoto[]; totalBytes: number }> {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select(
      "id, storage_path, thumbnail_path, original_filename, size_bytes, visibility, like_count, uploaded_at, uploaders (display_name, public_id)",
    )
    .not("uploaded_at", "is", null)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Loading photos failed: ${error.message}`);
  const rows = data as unknown as AdminPhotoRow[];
  const totalBytes = rows.reduce((sum, photo) => sum + photo.size_bytes, 0);
  // The viewer's uploader pill shows the guest's public photo count, matching
  // their public gallery page.
  const publicCounts = new Map<string, number>();
  for (const row of rows) {
    const publicId = row.uploaders?.public_id;
    if (publicId && row.visibility === "public") {
      publicCounts.set(publicId, (publicCounts.get(publicId) ?? 0) + 1);
    }
  }
  const photos = await Promise.all(
    rows.map(async (photo) => ({
      id: photo.id,
      uploadedAt: photo.uploaded_at,
      imageUrl: await galleryImageUrl(photo),
      downloadUrl: await originalDownloadUrl(photo),
      likeCount: photo.like_count,
      likedByViewer: false,
      ownedByViewer: false,
      visibility: photo.visibility,
      uploader: photo.uploaders?.display_name
        ? {
            displayName: photo.uploaders.display_name,
            publicId: photo.uploaders.public_id,
            photoCount: publicCounts.get(photo.uploaders.public_id) ?? 0,
          }
        : null,
    })),
  );
  return { photos, totalBytes };
}

async function countBinPhotos(): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("photos")
    .select("id", { count: "exact", head: true })
    .not("deleted_at", "is", null);
  if (error) throw new Error(`Counting deleted photos failed: ${error.message}`);
  return count ?? 0;
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ uploader?: string | string[]; filter?: string | string[] }>;
}) {
  const [locale, dict] = await Promise.all([getLocale(), getDict()]);
  const labels = dict.admin;

  if (!(await isAdmin())) {
    return (
      <main className="mx-auto flex w-full max-w-xl flex-1 flex-col">
        <AdminTopRow locale={locale} labels={adminChromeLabels(dict)} />
        <div className="flex flex-1 flex-col items-center justify-center px-5 pb-24">
          <AdminLoginForm
            labels={{
              passcodeLabel: labels.passcodeLabel,
              submit: labels.submit,
              wrongPasscode: labels.wrongPasscode,
            }}
          />
        </div>
      </main>
    );
  }

  const [{ photos, totalBytes }, binCount, uploadsFrozen, exportJob, params] =
    await Promise.all([
      loadAllPhotos(),
      countBinPhotos(),
      areUploadsFrozen(),
      getExportJob("admin").catch(() => null),
      searchParams,
    ]);
  const uploaderFilter = Array.isArray(params.uploader)
    ? params.uploader[0]
    : params.uploader;
  const privateFilter =
    (Array.isArray(params.filter) ? params.filter[0] : params.filter) === "private";

  const exportSizeBytes = exportJob?.zip_size_bytes ?? totalBytes;
  const groups = groupPhotosByUploader(photos);
  const namedGroups = groups.filter((group) => group.uploader !== null);
  const privateCount = photos.filter((photo) => photo.visibility === "private").length;
  const shown = privateFilter
    ? photos.filter((photo) => photo.visibility === "private")
    : uploaderFilter
      ? photos.filter((photo) => photo.uploader?.publicId === uploaderFilter)
      : photos;

  const count = (total: number, forms: { one: string; few: string; many: string }) =>
    pluralize(locale, total, forms);
  const title = count(photos.length, {
    one: labels.photosOne,
    few: labels.photosFew,
    many: labels.photosMany,
  });
  const sub = `${count(groups.length, {
    one: labels.guestsOne,
    few: labels.guestsFew,
    many: labels.guestsMany,
  })} · ${count(privateCount, {
    one: labels.privateOne,
    few: labels.privateFew,
    many: labels.privateMany,
  })}`;

  const chipClass = (active: boolean) =>
    `shrink-0 rounded-pill px-3.5 py-[9px] text-[13px] whitespace-nowrap transition ${
      active
        ? "bg-gold-small text-card"
        : "border border-ink/18 text-ink/65 hover:text-ink active:text-ink"
    }`;

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <AdminChrome
        locale={locale}
        active="photos"
        binCount={binCount}
        title={title}
        sub={sub}
        labels={adminChromeLabels(dict)}
      />

      {photos.length === 0 ? (
        <p className="px-4 py-16 text-center text-ink/50">{labels.empty}</p>
      ) : (
        <>
          <div className="flex gap-2 overflow-x-auto px-4 pb-3.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <Link href="/admin" className={chipClass(!privateFilter && !uploaderFilter)}>
              {labels.filterAll}
            </Link>
            <Link href="/admin?filter=private" className={chipClass(privateFilter)}>
              {labels.filterPrivate.replace("{count}", String(privateCount))}
            </Link>
            {namedGroups.map(
              (group) =>
                group.uploader && (
                  <Link
                    key={group.uploader.publicId}
                    href={`/admin?uploader=${group.uploader.publicId}`}
                    className={chipClass(uploaderFilter === group.uploader.publicId)}
                  >
                    {`${group.uploader.displayName} ${group.photos.length}`}
                  </Link>
                ),
            )}
          </div>

          <AdminPhotoGrid
            photos={shown}
            privateBadge={labels.privateBadge}
            locale={locale}
            viewerLabels={viewerLabels(dict)}
          />

          <p className="px-5 pt-3 text-meta text-ink/68">{labels.gridHint}</p>
        </>
      )}

      <div className="sticky bottom-0 mt-auto flex flex-col gap-0.5 bg-paper-alt px-3.5 pt-4 pb-[22px]">
        <FreezeToggle
          frozen={uploadsFrozen}
          labels={{
            title: labels.guestUploads,
            open: labels.uploadsOpen,
            frozen: labels.uploadsFrozen,
            actionFailed: labels.actionFailed,
          }}
        />
        <AdminDownloadRow
          rowLabel={labels.downloadAll}
          rowValue={
            exportSizeBytes > 0
              ? labels.downloadAllValue.replace("{size}", formatSize(exportSizeBytes))
              : labels.downloadAllValue.replace(", {size}", "")
          }
          labels={dict.downloadSheet}
          locale={locale}
          photoCount={exportJob?.total_count ?? photos.length}
          privateCount={privateCount}
          sizeBytes={exportSizeBytes > 0 ? exportSizeBytes : null}
          initialStatus={exportJob ? exportJobStatus(exportJob) : null}
        />
      </div>
    </main>
  );
}
