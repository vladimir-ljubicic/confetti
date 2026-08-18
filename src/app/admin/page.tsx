import Link from "next/link";
import { PhotoControls } from "@/app/photo-controls";
import { groupPhotosByUploader } from "@/lib/admin-photos";
import { isAdmin } from "@/lib/admin-session";
import type { Dictionary } from "@/lib/dictionaries";
import { getDict } from "@/lib/locale";
import { galleryImageUrl } from "@/lib/photo-urls";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { Visibility } from "@/lib/uploader-profile";
import { AdminLoginForm } from "./login-form";
import { UploaderRename } from "./uploader-rename";

export const dynamic = "force-dynamic";

type AdminPhotoRow = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  size_bytes: number;
  visibility: Visibility;
  uploaded_at: string;
  uploaders: { display_name: string | null; public_id: string } | null;
};

async function loadAllPhotos() {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select(
      "id, storage_path, thumbnail_path, original_filename, size_bytes, visibility, uploaded_at, uploaders (display_name, public_id)",
    )
    .not("uploaded_at", "is", null)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Loading photos failed: ${error.message}`);
  return Promise.all(
    (data as unknown as AdminPhotoRow[]).map(async (photo) => ({
      id: photo.id,
      visibility: photo.visibility,
      imageUrl: await galleryImageUrl(photo),
      uploader: photo.uploaders?.display_name
        ? {
            displayName: photo.uploaders.display_name,
            publicId: photo.uploaders.public_id,
          }
        : null,
    })),
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ uploader?: string | string[] }>;
}) {
  const dict = await getDict();
  const labels = dict.admin;
  const admin = await isAdmin();

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-8 px-4 py-12">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-serif text-4xl text-gold-deep">{labels.title}</h1>
        <div className="flex items-center gap-4 text-sm">
          <Link href="/" className="text-ink/60 transition hover:text-ink">
            ← {labels.backToGallery}
          </Link>
          {admin && (
            <Link href="/admin/bin" className="text-ink/60 transition hover:text-ink">
              {labels.recycleBin}
            </Link>
          )}
        </div>
      </header>

      {admin ? (
        <AdminGallery labels={labels} searchParams={searchParams} />
      ) : (
        <AdminLoginForm
          labels={{
            passcodeLabel: labels.passcodeLabel,
            submit: labels.submit,
            wrongPasscode: labels.wrongPasscode,
          }}
        />
      )}
    </main>
  );
}

async function AdminGallery({
  labels,
  searchParams,
}: {
  labels: Dictionary["admin"];
  searchParams: Promise<{ uploader?: string | string[] }>;
}) {
  const [photos, { uploader: uploaderParam }] = await Promise.all([
    loadAllPhotos(),
    searchParams,
  ]);
  const filter = Array.isArray(uploaderParam) ? uploaderParam[0] : uploaderParam;
  const groups = groupPhotosByUploader(photos);
  const visibleGroups = filter
    ? groups.filter((group) => group.uploader?.publicId === filter)
    : groups;

  if (photos.length === 0) {
    return <p className="py-16 text-ink/50">{labels.empty}</p>;
  }

  const photoLabels = {
    privateBadge: labels.privateBadge,
    makePublic: labels.makePublic,
    makePrivate: labels.makePrivate,
    delete: labels.delete,
    confirmDelete: labels.confirmDelete,
    actionFailed: labels.actionFailed,
  };
  const renameLabels = {
    rename: labels.rename,
    renameSave: labels.renameSave,
    renameCancel: labels.renameCancel,
    actionFailed: labels.actionFailed,
  };

  const chipClass = (active: boolean) =>
    `rounded-full px-3 py-1 text-sm transition ${
      active ? "bg-gold-deep text-white" : "bg-pearl text-ink hover:bg-pearl/70"
    }`;

  return (
    <div className="flex w-full flex-col gap-8">
      <nav className="flex flex-wrap justify-center gap-2">
        <Link href="/admin" className={chipClass(!filter)}>
          {labels.allUploaders} ({photos.length})
        </Link>
        {groups.map(
          (group) =>
            group.uploader && (
              <Link
                key={group.uploader.publicId}
                href={`/admin?uploader=${group.uploader.publicId}`}
                className={chipClass(filter === group.uploader.publicId)}
              >
                {group.uploader.displayName} ({group.photos.length})
              </Link>
            ),
        )}
      </nav>

      {visibleGroups.map((group) => (
        <section
          key={group.uploader?.publicId ?? "unknown"}
          className="flex flex-col gap-3"
        >
          <header className="flex items-center gap-2">
            {group.uploader ? (
              <UploaderRename
                publicId={group.uploader.publicId}
                name={group.uploader.displayName}
                labels={renameLabels}
              />
            ) : (
              <span className="font-medium text-ink">{labels.unknownUploader}</span>
            )}
            <span className="text-sm text-ink/50">({group.photos.length})</span>
          </header>
          <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {group.photos.map((photo) => (
              <li key={photo.id} className="relative overflow-hidden rounded-lg bg-pearl">
                {photo.imageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo.imageUrl}
                    alt=""
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                )}
                <PhotoControls
                  photoId={photo.id}
                  visibility={photo.visibility}
                  labels={photoLabels}
                />
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
