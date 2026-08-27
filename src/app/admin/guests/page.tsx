import { redirect } from "next/navigation";
import { groupPhotosByUploader } from "@/lib/admin-photos";
import { isAdmin } from "@/lib/admin-session";
import { pluralize } from "@/lib/i18n";
import { getDict, getLocale } from "@/lib/locale";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { Visibility } from "@/lib/uploader-profile";
import { AdminChrome, adminChromeLabels } from "../admin-chrome";
import { GuestRow } from "./guest-row";

export const dynamic = "force-dynamic";

type GuestPhotoRow = {
  id: string;
  visibility: Visibility;
  uploaders: { display_name: string | null; public_id: string } | null;
};

async function loadGuestGroups() {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select("id, visibility, uploaders (display_name, public_id)")
    .not("uploaded_at", "is", null)
    .is("deleted_at", null);
  if (error) throw new Error(`Loading photos failed: ${error.message}`);
  return groupPhotosByUploader(
    (data as unknown as GuestPhotoRow[]).map((photo) => ({
      id: photo.id,
      visibility: photo.visibility,
      uploader: photo.uploaders?.display_name
        ? {
            displayName: photo.uploaders.display_name,
            publicId: photo.uploaders.public_id,
          }
        : null,
    })),
  );
}

async function countBinPhotos(): Promise<number> {
  const { count, error } = await supabaseAdmin()
    .from("photos")
    .select("id", { count: "exact", head: true })
    .not("deleted_at", "is", null);
  if (error) throw new Error(`Counting deleted photos failed: ${error.message}`);
  return count ?? 0;
}

export default async function AdminGuestsPage() {
  if (!(await isAdmin())) redirect("/admin");

  const [locale, dict, groups, binCount] = await Promise.all([
    getLocale(),
    getDict(),
    loadGuestGroups(),
    countBinPhotos(),
  ]);
  const labels = dict.admin;

  const countsLine = (photos: { visibility: Visibility }[]) => {
    const total = pluralize(locale, photos.length, {
      one: labels.photosOne,
      few: labels.photosFew,
      many: labels.photosMany,
    });
    const privateCount = photos.filter((photo) => photo.visibility === "private").length;
    if (privateCount === 0) return total;
    return `${total} · ${pluralize(locale, privateCount, {
      one: labels.privateOne,
      few: labels.privateFew,
      many: labels.privateMany,
    })}`;
  };

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <AdminChrome
        locale={locale}
        active="guests"
        binCount={binCount}
        title={pluralize(locale, groups.length, {
          one: labels.guestsOne,
          few: labels.guestsFew,
          many: labels.guestsMany,
        })}
        sub={labels.guestsSub}
        labels={adminChromeLabels(dict)}
      />

      {groups.length === 0 ? (
        <p className="px-4 py-16 text-center text-ink/50">{labels.empty}</p>
      ) : (
        <ul className="flex flex-col gap-2 px-3.5 pb-8">
          {groups.map((group) =>
            group.uploader ? (
              <GuestRow
                key={group.uploader.publicId}
                publicId={group.uploader.publicId}
                name={group.uploader.displayName}
                countsLine={countsLine(group.photos)}
                labels={{
                  rename: labels.rename,
                  renameSave: labels.renameSave,
                  renameCancel: labels.renameCancel,
                  actionFailed: labels.actionFailed,
                }}
              />
            ) : (
              <li
                key="unknown"
                className="flex items-center justify-between gap-3 rounded-card bg-card px-3.5 py-3"
              >
                <span className="text-[15px] text-ink">{labels.unknownUploader}</span>
                <span className="text-meta whitespace-nowrap text-ink/55">
                  {countsLine(group.photos)}
                </span>
              </li>
            ),
          )}
        </ul>
      )}
    </main>
  );
}
