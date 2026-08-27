import Link from "next/link";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin-session";
import { getDict, getLocale } from "@/lib/locale";
import { galleryImageUrl } from "@/lib/photo-urls";
import { supabaseAdmin } from "@/lib/supabase-server";
import { INTL_LOCALES, type Locale } from "@/lib/i18n";
import { RECYCLE_RETENTION_DAYS } from "@/lib/recycle-bin";
import { LocaleCorner } from "@/app/locale-corner";
import { RestoreButton } from "./restore-button";

export const dynamic = "force-dynamic";

type BinPhotoRow = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  size_bytes: number;
  deleted_at: string;
  uploaders: { display_name: string | null } | null;
};

async function loadDeletedPhotos() {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select(
      "id, storage_path, thumbnail_path, original_filename, size_bytes, deleted_at, uploaders (display_name)",
    )
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });
  if (error) throw new Error(`Loading deleted photos failed: ${error.message}`);
  return Promise.all(
    (data as unknown as BinPhotoRow[]).map(async (photo) => ({
      id: photo.id,
      deletedAt: photo.deleted_at,
      imageUrl: await galleryImageUrl(photo),
      uploaderName: photo.uploaders?.display_name ?? null,
    })),
  );
}

function formatDeletedAt(iso: string, locale: Locale): string {
  return new Intl.DateTimeFormat(INTL_LOCALES[locale], {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

export default async function AdminBinPage() {
  if (!(await isAdmin())) redirect("/admin");

  const [dict, locale] = await Promise.all([getDict(), getLocale()]);
  const labels = dict.adminBin;
  const photos = await loadDeletedPhotos();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-8 px-4 py-12">
      <LocaleCorner />
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-serif text-4xl text-gold-small">{labels.title}</h1>
        <Link href="/admin" className="text-sm text-ink/60 transition hover:text-ink">
          ← {labels.backToAdmin}
        </Link>
        <p className="text-sm text-ink/50">
          {labels.retentionNote.replace("{days}", String(RECYCLE_RETENTION_DAYS))}
        </p>
      </header>

      {photos.length === 0 ? (
        <p className="py-16 text-ink/50">{labels.empty}</p>
      ) : (
        <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="overflow-hidden rounded-lg bg-sand">
              {photo.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.imageUrl}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              )}
              <div className="flex flex-col gap-1 px-2 py-2 text-xs">
                <span className="font-medium text-ink">
                  {photo.uploaderName ?? labels.unknownUploader}
                </span>
                <span className="text-ink/50">
                  {labels.deletedAt}: {formatDeletedAt(photo.deletedAt, locale)}
                </span>
                <RestoreButton
                  photoId={photo.id}
                  labels={{
                    restore: labels.restore,
                    actionFailed: labels.actionFailed,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
