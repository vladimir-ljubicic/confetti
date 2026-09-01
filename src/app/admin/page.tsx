import { viewerLabels } from "@/app/viewer-labels";
import {
  adminFilterUrl,
  adminGalleryFilter,
  parseAdminFilter,
  type AdminFilter,
} from "@/lib/admin-filter";
import { loadAdminPhotos, loadAdminSummary } from "@/lib/admin-gallery";
import { isAdmin } from "@/lib/admin-session";
import { getEventSettings } from "@/lib/event-settings";
import { ADMIN_EXPORT, formatSize } from "@/lib/export";
import { exportJobStatus, liveExportJob } from "@/lib/export-jobs";
import { pluralize } from "@/lib/i18n";
import { getDict, getLocale } from "@/lib/locale";
import { AdminChrome, AdminTopRow, adminChromeLabels } from "./admin-chrome";
import { AdminDownloadRow } from "./download-row";
import { AdminPhotoGrid, type AdminFilterChip } from "./admin-photo-grid";
import { FreezeToggle } from "./freeze-toggle";
import { AdminLoginForm } from "./login-form";

export const dynamic = "force-dynamic";

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

  const filter = adminGalleryFilter(parseAdminFilter(await searchParams));
  const [summary, page, settings, exportJob] = await Promise.all([
    loadAdminSummary(),
    loadAdminPhotos({ filter }),
    getEventSettings(),
    liveExportJob(ADMIN_EXPORT),
  ]);

  const exportSizeBytes = exportJob?.zip_size_bytes ?? summary.totalBytes;
  const guestCount = summary.uploaders.length + (summary.unnamed ? 1 : 0);
  const chip = (filter: AdminFilter, label: string, count: number): AdminFilterChip => ({
    filter,
    label,
    count,
    href: adminFilterUrl(filter),
  });
  const chips: AdminFilterChip[] = [
    chip({}, labels.filterAll, summary.totalCount),
    chip(
      { visibility: "private" },
      labels.filterPrivate.replace("{count}", String(summary.privateCount)),
      summary.privateCount,
    ),
    ...summary.uploaders.map((uploader) =>
      chip(
        { uploader: uploader.publicId },
        `${uploader.displayName} ${uploader.photoCount}`,
        uploader.photoCount,
      ),
    ),
  ];

  const count = (total: number, forms: { one: string; few: string; many: string }) =>
    pluralize(locale, total, forms);
  const title = count(summary.totalCount, {
    one: labels.photosOne,
    few: labels.photosFew,
    many: labels.photosMany,
  });
  const sub = `${count(guestCount, {
    one: labels.guestsOne,
    few: labels.guestsFew,
    many: labels.guestsMany,
  })} · ${count(summary.privateCount, {
    one: labels.privateOne,
    few: labels.privateFew,
    many: labels.privateMany,
  })}`;

  const footer = (
    <div className="sticky bottom-0 mt-auto flex flex-col gap-0.5 bg-paper-alt px-3.5 pt-4 pb-[22px]">
      <FreezeToggle
        frozen={settings.uploadsFrozen}
        eventDateIso={settings.eventDateIso}
        freezeOffsetDays={settings.freezeOffsetDays}
        labels={{
          title: labels.guestUploads,
          open: labels.uploadsOpen,
          frozen: labels.uploadsFrozen,
          eventDate: labels.eventDate,
          freezeAfterDays: labels.freezeAfterDays,
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
        summary={summary}
        liveZip={
          exportJob
            ? {
                includePrivate: exportJob.include_private,
                photoCount: exportJob.total_count,
                sizeBytes: exportJob.zip_size_bytes,
              }
            : null
        }
        initialStatus={exportJob ? exportJobStatus(exportJob) : null}
      />
    </div>
  );

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <AdminChrome
        locale={locale}
        binCount={summary.binCount}
        title={title}
        sub={sub}
        labels={adminChromeLabels(dict)}
      />

      {summary.totalCount === 0 ? (
        <>
          <p className="px-4 py-16 text-center text-ink-muted">{labels.empty}</p>
          {footer}
        </>
      ) : (
        <AdminPhotoGrid
          photos={page.photos}
          nextCursor={page.nextCursor}
          total={summary.totalCount}
          chips={chips}
          initialFilter={filter}
          labels={labels}
          locale={locale}
          viewerLabels={viewerLabels(dict)}
        >
          <p className="px-5 pt-3 text-meta text-ink-muted">{labels.gridHint}</p>
          {footer}
        </AdminPhotoGrid>
      )}

    </main>
  );
}
