import { redirect } from "next/navigation";
import { thumbSrc } from "@/app/photo-image";
import { isAdmin } from "@/lib/admin-session";
import { getDict, getLocale } from "@/lib/locale";
import { supabaseAdmin } from "@/lib/supabase-server";
import { INTL_LOCALES, pluralize, type Locale } from "@/lib/i18n";
import { RECYCLE_RETENTION_DAYS } from "@/lib/recycle-bin";
import type { Dictionary } from "@/lib/dictionaries";
import { AdminChrome, adminChromeLabels } from "../admin-chrome";
import { BinActions } from "./bin-actions";
import { RestoreButton } from "./restore-button";

export const dynamic = "force-dynamic";

type BinPhotoRow = {
  id: string;
  deleted_at: string;
  uploaders: { display_name: string | null } | null;
};

async function loadDeletedPhotos() {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select("id, deleted_at, uploaders (display_name)")
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(`Loading deleted photos failed: ${error.message}`);
  const rows = data as unknown as BinPhotoRow[];
  return rows.map((photo) => ({
    id: photo.id,
    deletedAt: photo.deleted_at,
    uploaderName: photo.uploaders?.display_name ?? null,
  }));
}

function deletedTime(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function deletedLine(
  iso: string,
  now: Date,
  locale: Locale,
  labels: Dictionary["adminBin"],
): string {
  const dayStart = (date: Date) =>
    new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const days = Math.max(
    0,
    Math.round((dayStart(now) - dayStart(new Date(iso))) / 86_400_000),
  );
  if (days === 0) return labels.deletedToday;
  if (days === 1) return labels.deletedYesterday;
  return pluralize(locale, days, {
    one: labels.deletedDaysAgoOne,
    few: labels.deletedDaysAgoFew,
    many: labels.deletedDaysAgoMany,
  });
}

export default async function AdminBinPage() {
  if (!(await isAdmin())) redirect("/admin");

  const [dict, locale, photos] = await Promise.all([
    getDict(),
    getLocale(),
    loadDeletedPhotos(),
  ]);
  const labels = dict.adminBin;
  const now = new Date();

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <AdminChrome
        locale={locale}
        binCount={photos.length}
        title={labels.title}
        sub={labels.sub.replace("{days}", String(RECYCLE_RETENTION_DAYS))}
        labels={adminChromeLabels(dict)}
      />

      {photos.length === 0 ? (
        <p className="px-4 py-16 text-center text-ink-muted">{labels.empty}</p>
      ) : (
        <>
          <ul className="flex flex-col gap-2 px-3.5">
            {photos.map((photo) => (
              <li
                key={photo.id}
                className="flex items-center gap-3 rounded-card bg-card px-3.5 py-3"
              >
                <span className="relative size-14 shrink-0 overflow-hidden rounded-thumb bg-sand">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbSrc(photo.id)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  <span aria-hidden className="absolute inset-0 bg-stage/40" />
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="truncate text-sm text-ink">
                    {photo.uploaderName ?? labels.unknownUploader} ·{" "}
                    {deletedTime(photo.deletedAt, locale)}
                  </span>
                  <span className="text-meta text-ink-muted">
                    {deletedLine(photo.deletedAt, now, locale, labels)}
                  </span>
                </div>
                <RestoreButton
                  photoId={photo.id}
                  labels={{
                    restore: labels.restore,
                    actionFailed: labels.actionFailed,
                  }}
                />
              </li>
            ))}
          </ul>

          <BinActions
            countLine={`${pluralize(locale, photos.length, {
              one: dict.admin.photosOne,
              few: dict.admin.photosFew,
              many: dict.admin.photosMany,
            })} →`}
            labels={{
              restoreAll: labels.restoreAll,
              restoring: labels.restoring,
              bulkProgress: labels.bulkProgress,
              emptyBin: labels.emptyBin,
              emptying: labels.emptying,
              confirmEmptyBin: labels.confirmEmptyBin,
              actionFailed: labels.actionFailed,
            }}
          />
        </>
      )}
    </main>
  );
}
