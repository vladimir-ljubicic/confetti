import { notFound, redirect } from "next/navigation";
import { viewerLabels } from "@/app/viewer-labels";
import { isAdmin } from "@/lib/admin-session";
import { uploaderExport } from "@/lib/export";
import { exportJobStatus, liveExportJob } from "@/lib/export-jobs";
import { pluralize } from "@/lib/i18n";
import { getDict, getLocale } from "@/lib/locale";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { Visibility } from "@/lib/uploader-profile";
import { isUuid } from "@/lib/uploaders";
import { AdminTopRow, adminChromeLabels } from "../../admin-chrome";
import {
  AdminPhotoGrid,
  type AdminPhoto,
  type VisibilityChip,
  type VisibilityKey,
} from "../../admin-photo-grid";
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

type GuestPhotoRow = {
  id: string;
  original_filename: string;
  visibility: Visibility;
  like_count: number;
  uploaded_at: string;
  image_width: number | null;
  image_height: number | null;
  size_bytes: number;
};

type GuestPhotos = { photos: AdminPhoto[]; totalBytes: number };

async function loadGuestPhotos(guest: Guest, publicId: string): Promise<GuestPhotos> {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select(
      "id, original_filename, visibility, like_count, uploaded_at, image_width, image_height, size_bytes",
    )
    .eq("uploader_id", guest.id)
    .not("uploaded_at", "is", null)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Loading photos failed: ${error.message}`);
  const rows = data as unknown as GuestPhotoRow[];
  // The viewer's uploader pill shows the guest's public photo count, matching
  // their public gallery page.
  const publicRows = rows.filter((row) => row.visibility === "public");
  return {
    photos: rows.map((photo) => ({
      id: photo.id,
      uploadedAt: photo.uploaded_at,
      width: photo.image_width,
      height: photo.image_height,
      originalFilename: photo.original_filename,
      likeCount: photo.like_count,
      likedByViewer: false,
      ownedByViewer: false,
      visibility: photo.visibility,
      uploader: {
        displayName: guest.displayName,
        publicId,
        photoCount: publicRows.length,
        likeTotal: publicRows.reduce((sum, row) => sum + row.like_count, 0),
      },
    })),
    totalBytes: rows.reduce((sum, row) => sum + row.size_bytes, 0),
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
  const [{ photos, totalBytes }, exportJob] = await Promise.all([
    loadGuestPhotos(guest, publicId),
    liveExportJob(uploaderExport(guest.id)),
  ]);

  const rawFilter = Array.isArray(filterParam) ? filterParam[0] : filterParam;
  const filter: VisibilityKey =
    rawFilter === "public" || rawFilter === "private" ? rawFilter : "all";
  const publicCount = photos.filter((photo) => photo.visibility === "public").length;
  const likeTotal = photos.reduce((total, photo) => total + photo.likeCount, 0);

  const countsLine = `${pluralize(locale, photos.length, {
    one: labels.photosOne,
    few: labels.photosFew,
    many: labels.photosMany,
  })} · ${pluralize(locale, likeTotal, {
    one: labels.likesOne,
    few: labels.likesFew,
    many: labels.likesMany,
  })}`;

  const chips: VisibilityChip[] = [
    { key: "all", label: labels.guestFilterAll.replace("{count}", String(photos.length)) },
    {
      key: "public",
      label: labels.guestFilterPublic.replace("{count}", String(publicCount)),
    },
    {
      key: "private",
      label: labels.guestFilterPrivate.replace(
        "{count}",
        String(photos.length - publicCount),
      ),
    },
  ];

  const settings = (
    <GuestSettings
      publicId={publicId}
      blocked={guest.uploadsBlocked}
      publicCount={publicCount}
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
          photoCount={photos.length}
          sizeBytes={totalBytes}
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

      {photos.length === 0 ? (
        <>
          <p className="px-4 py-16 text-center text-ink/50">{labels.empty}</p>
          {settings}
        </>
      ) : (
        <AdminPhotoGrid
          photos={photos}
          visibilityChips={chips}
          initialVisibility={filter}
          labels={labels}
          locale={locale}
          viewerLabels={viewerLabels(dict)}
        >
          <p className="px-5 pt-3 text-meta text-ink/68">{labels.gridHint}</p>
          {settings}
        </AdminPhotoGrid>
      )}

    </main>
  );
}
