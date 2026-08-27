import Link from "next/link";
import { getDeviceId } from "@/lib/device";
import { getDict } from "@/lib/locale";
import { galleryImageUrl } from "@/lib/photo-urls";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { Visibility } from "@/lib/uploader-profile";
import { getUploaderProfile, type UploaderProfile } from "@/lib/uploaders";
import { LocaleCorner } from "@/app/locale-corner";
import { PhotoControls } from "@/app/photo-controls";
import { DefaultVisibilityPicker } from "./controls";

export const dynamic = "force-dynamic";

type OwnPhotoRow = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  size_bytes: number;
  visibility: Visibility;
  uploaded_at: string;
};

async function loadOwnPhotos(deviceId: string) {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select(
      "id, storage_path, thumbnail_path, original_filename, size_bytes, visibility, uploaded_at",
    )
    .eq("uploader_id", deviceId)
    .not("uploaded_at", "is", null)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Loading own photos failed: ${error.message}`);
  return Promise.all(
    (data as OwnPhotoRow[]).map(async (photo) => ({
      ...photo,
      imageUrl: await galleryImageUrl(photo),
    })),
  );
}

export default async function MyPhotosPage() {
  const dict = await getDict();
  const labels = dict.myPhotos;

  const deviceId = await getDeviceId();
  let profile: UploaderProfile | null = null;
  let photos: Awaited<ReturnType<typeof loadOwnPhotos>> = [];
  if (deviceId) {
    [profile, photos] = await Promise.all([
      getUploaderProfile(deviceId),
      loadOwnPhotos(deviceId),
    ]);
  }

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center gap-8 px-4 py-12">
      <LocaleCorner />
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="font-serif text-4xl text-gold-small">{labels.title}</h1>
        <Link href="/" className="text-sm text-ink/60 transition hover:text-ink">
          ← {labels.backToGallery}
        </Link>
      </header>

      {profile && <DefaultVisibilityPicker value={profile.defaultVisibility} labels={labels} />}

      {photos.length === 0 ? (
        <p className="py-16 text-ink/50">{labels.empty}</p>
      ) : (
        <ul className="grid w-full grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {photos.map((photo) => (
            <li key={photo.id} className="relative overflow-hidden rounded-lg bg-sand">
              {photo.imageUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={photo.imageUrl}
                  alt=""
                  loading="lazy"
                  className="aspect-square w-full object-cover"
                />
              )}
              <PhotoControls photoId={photo.id} visibility={photo.visibility} labels={labels} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
