import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { viewerLabels } from "@/app/viewer-labels";
import { isAdmin } from "@/lib/admin-session";
import { pluralize } from "@/lib/i18n";
import { getDict, getLocale } from "@/lib/locale";
import { galleryImageUrl, originalDownloadUrl } from "@/lib/photo-urls";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { Visibility } from "@/lib/uploader-profile";
import { isUuid } from "@/lib/uploaders";
import { AdminTopRow, adminChromeLabels } from "../../admin-chrome";
import { AdminPhotoGrid, type AdminPhoto } from "../../admin-photo-grid";
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
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  size_bytes: number;
  visibility: Visibility;
  like_count: number;
  uploaded_at: string;
};

async function loadGuestPhotos(guest: Guest, publicId: string): Promise<AdminPhoto[]> {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select(
      "id, storage_path, thumbnail_path, original_filename, size_bytes, visibility, like_count, uploaded_at",
    )
    .eq("uploader_id", guest.id)
    .not("uploaded_at", "is", null)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Loading photos failed: ${error.message}`);
  return Promise.all(
    (data as unknown as GuestPhotoRow[]).map(async (photo) => ({
      id: photo.id,
      uploadedAt: photo.uploaded_at,
      imageUrl: await galleryImageUrl(photo),
      downloadUrl: await originalDownloadUrl(photo),
      likeCount: photo.like_count,
      likedByViewer: false,
      ownedByViewer: false,
      visibility: photo.visibility,
      uploader: { displayName: guest.displayName, publicId },
    })),
  );
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
  const photos = await loadGuestPhotos(guest, publicId);

  const rawFilter = Array.isArray(filterParam) ? filterParam[0] : filterParam;
  const filter =
    rawFilter === "public" || rawFilter === "private" ? rawFilter : null;
  const shown = filter
    ? photos.filter((photo) => photo.visibility === filter)
    : photos;
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

  const chips: { key: string; href: string; label: string; active: boolean }[] = [
    {
      key: "all",
      href: `/admin/guests/${publicId}`,
      label: labels.guestFilterAll.replace("{count}", String(photos.length)),
      active: filter === null,
    },
    {
      key: "public",
      href: `/admin/guests/${publicId}?filter=public`,
      label: labels.guestFilterPublic.replace("{count}", String(publicCount)),
      active: filter === "public",
    },
    {
      key: "private",
      href: `/admin/guests/${publicId}?filter=private`,
      label: labels.guestFilterPrivate.replace(
        "{count}",
        String(photos.length - publicCount),
      ),
      active: filter === "private",
    },
  ];
  const chipClass = (active: boolean) =>
    `shrink-0 rounded-pill px-3.5 py-[9px] text-[13px] whitespace-nowrap transition ${
      active
        ? "bg-gold-small text-card"
        : "border border-ink/18 text-ink/65 hover:text-ink"
    }`;

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

      <div className="flex gap-2 overflow-x-auto px-4 pb-3.5 [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {chips.map((chip) => (
          <Link key={chip.key} href={chip.href} className={chipClass(chip.active)}>
            {chip.label}
          </Link>
        ))}
      </div>

      {shown.length === 0 ? (
        <p className="px-4 py-16 text-center text-ink/50">{labels.empty}</p>
      ) : (
        <>
          <AdminPhotoGrid
            photos={shown}
            privateBadge={labels.privateBadge}
            viewerLabels={viewerLabels(dict)}
          />
          <p className="px-5 pt-3 text-meta text-ink/68">{labels.gridHint}</p>
        </>
      )}

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
          actionFailed: labels.actionFailed,
        }}
      />
    </main>
  );
}
