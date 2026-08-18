import Link from "next/link";
import { getDeviceId } from "@/lib/device";
import { getDict } from "@/lib/locale";
import { galleryImageUrl, originalDownloadUrl } from "@/lib/photo-urls";
import { resolveSortMode, type SortMode } from "@/lib/sort-mode";
import { supabaseAdmin } from "@/lib/supabase-server";
import { getUploaderProfile } from "@/lib/uploaders";
import { UploadButton } from "./upload-button";

// The gallery reads the database directly; without this the page would be
// statically prerendered at build time and serve stale rows.
export const dynamic = "force-dynamic";

type PhotoRow = {
  id: string;
  storage_path: string;
  original_filename: string;
  size_bytes: number;
  uploaded_at: string;
};

async function loadGallery(sort: SortMode) {
  let query = supabaseAdmin()
    .from("photos")
    .select("id, storage_path, original_filename, size_bytes, uploaded_at")
    .eq("visibility", "public")
    .not("uploaded_at", "is", null)
    .is("deleted_at", null);
  query =
    sort === "chrono"
      ? query.order("effective_taken_at", { ascending: true })
      : query.order("uploaded_at", { ascending: false });
  const { data, error } = await query.limit(200);
  if (error) throw new Error(`Loading gallery failed: ${error.message}`);
  return Promise.all(
    (data as PhotoRow[]).map(async (photo) => ({
      ...photo,
      imageUrl: await galleryImageUrl(photo),
      downloadUrl: await originalDownloadUrl(photo),
    })),
  );
}

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
  const [photos, hasProfile] = await Promise.all([loadGallery(sort), deviceHasProfile()]);

  const sortOptions = [
    { mode: "live", label: dict.gallery.sortLive },
    { mode: "chrono", label: dict.gallery.sortChrono },
  ] as const;

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

      <UploadButton
        labels={dict.upload}
        dialogLabels={dict.firstUploadDialog}
        needsProfile={!hasProfile}
      />

      {photos.length > 0 && (
        <nav className="flex rounded-full bg-pearl p-1 text-sm">
          {sortOptions.map((option) => (
            <Link
              key={option.mode}
              href={`/?sort=${option.mode}`}
              aria-current={sort === option.mode ? "true" : undefined}
              className={`rounded-full px-4 py-1.5 transition ${
                sort === option.mode
                  ? "bg-white text-gold-deep shadow-sm"
                  : "text-ink/60 hover:text-ink"
              }`}
            >
              {option.label}
            </Link>
          ))}
        </nav>
      )}

      {photos.length === 0 ? (
        <p className="py-16 text-ink/50">{dict.gallery.empty}</p>
      ) : (
        <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="group relative overflow-hidden rounded-lg bg-pearl">
              {photo.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.imageUrl}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              )}
              {photo.downloadUrl && (
                <a
                  href={photo.downloadUrl}
                  className="absolute right-2 bottom-2 rounded-full bg-white/80 px-3 py-1 text-xs text-ink opacity-0 shadow-sm transition group-hover:opacity-100 focus:opacity-100"
                >
                  {dict.gallery.download}
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
