import { notFound, redirect } from "next/navigation";
import { viewerLabels } from "@/app/viewer-labels";
import {
  adminGuestUrl,
  parseAdminFilter,
  type AdminFilter,
} from "@/lib/admin-filter";
import { loadAdminGuestSummary, loadAdminPhotos } from "@/lib/admin-gallery";
import { isAdmin } from "@/lib/admin-session";
import { uploaderExport } from "@/lib/export";
import { exportJobStatus, liveExportJob } from "@/lib/export-jobs";
import { pluralize } from "@/lib/i18n";
import { getDict, getLocale } from "@/lib/locale";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { Visibility } from "@/lib/uploader-profile";
import { isUuid } from "@/lib/uploaders";
import { AdminTopRow, adminChromeLabels } from "../../admin-chrome";
import { AdminPhotoGrid, type AdminFilterChip } from "../../admin-photo-grid";
import { GuestDownloadRow } from "./guest-download-row";
import { GuestHeader } from "./guest-header";
import { GuestSettings } from "./guest-settings";

export const dynamic = "force-dynamic";

type Guest = {
  id: string;
  displayName: string;
  uploadsBlocked: boolean;
};

async function loadGuest(publicId: string): Promise<Guest | null> {
  if (!isUuid(publicId)) return null;
  const { data, error } = await supabaseAdmin()
    .from("uploaders")
    .select("id, display_name, uploads_blocked")
    .eq("public_id", publicId)
    .maybeSingle();
  if (error) throw new Error(`Loading uploader failed: ${error.message}`);
  if (!data?.display_name) return null;
  return {
    id: data.id,
    displayName: data.display_name,
    uploadsBlocked: data.uploads_blocked as boolean,
  };
}

export default async function AdminGuestPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<{ filter?: string | string[] }>;
}) {
  if (!(await isAdmin())) redirect("/admin");

  const [locale, dict, { publicId }, { filter: filterParam }] = await Promise.all([
    getLocale(),
    getDict(),
    params,
    searchParams,
  ]);
  const labels = dict.admin;

  const guest = await loadGuest(publicId);
  if (!guest) notFound();

  const filter: AdminFilter = {
    uploader: publicId,
    visibility: parseAdminFilter({ filter: filterParam }).visibility,
  };
  const [summary, page, exportJob] = await Promise.all([
    loadAdminGuestSummary(guest.id),
    loadAdminPhotos({ filter }),
    liveExportJob(uploaderExport(guest.id)),
  ]);

  const countsLine = `${pluralize(locale, summary.photoCount, {
    one: labels.photosOne,
    few: labels.photosFew,
    many: labels.photosMany,
  })} · ${pluralize(locale, summary.likeTotal, {
    one: labels.likesOne,
    few: labels.likesFew,
    many: labels.likesMany,
  })}`;

  const privateCount = summary.photoCount - summary.publicCount;
  const chip = (
    visibility: Visibility | undefined,
    label: string,
    count: number,
  ): AdminFilterChip => {
    const chipFilter = { uploader: publicId, visibility };
    return { filter: chipFilter, label, count, href: adminGuestUrl(chipFilter) };
  };
  const chips: AdminFilterChip[] = [
    chip(
      undefined,
      labels.guestFilterAll.replace("{count}", String(summary.photoCount)),
      summary.photoCount,
    ),
    chip(
      "public",
      labels.guestFilterPublic.replace("{count}", String(summary.publicCount)),
      summary.publicCount,
    ),
    chip(
      "private",
      labels.guestFilterPrivate.replace("{count}", String(privateCount)),
      privateCount,
    ),
  ];

  const settings = (
    <GuestSettings
      publicId={publicId}
      blocked={guest.uploadsBlocked}
      publicCount={summary.publicCount}
      labels={{
        uploadsTitle: labels.guestUploadsTitle,
        uploadsHint: labels.guestUploadsHint,
        allow: labels.uploadsAllow,
        block: labels.uploadsBlock,
        hideAll: labels.hideAllFromGuest,
        hiding: labels.hiding,
        bulkProgress: labels.bulkProgress,
        actionFailed: labels.actionFailed,
      }}
      download={
        <GuestDownloadRow
          publicId={publicId}
          rowLabel={labels.downloadGuest}
          rowValue={labels.downloadGuestValue}
          labels={{
            ...dict.downloadSheet,
            title: labels.downloadGuest,
            intro: labels.downloadGuestIntro,
          }}
          locale={locale}
          photoCount={summary.photoCount}
          sizeBytes={summary.totalBytes}
          initialStatus={exportJob ? exportJobStatus(exportJob) : null}
        />
      }
    />
  );

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <AdminTopRow
        locale={locale}
        labels={adminChromeLabels(dict)}
        back={{ href: "/admin/guests", label: labels.tabGuests }}
      />

      <GuestHeader
        publicId={publicId}
        name={guest.displayName}
        countsLine={countsLine}
        labels={{
          rename: labels.rename,
          renameSave: labels.renameSave,
          renameCancel: labels.renameCancel,
          actionFailed: labels.actionFailed,
        }}
      />

      {summary.photoCount === 0 ? (
        <>
          <p className="px-4 py-16 text-center text-ink-muted">{labels.empty}</p>
          {settings}
        </>
      ) : (
        <AdminPhotoGrid
          photos={page.photos}
          nextCursor={page.nextCursor}
          total={summary.photoCount}
          chips={chips}
          initialFilter={filter}
          labels={labels}
          locale={locale}
          viewerLabels={viewerLabels(dict)}
        >
          <p className="px-5 pt-3 text-meta text-ink-muted">{labels.gridHint}</p>
          {settings}
        </AdminPhotoGrid>
      )}
    </main>
  );
}
