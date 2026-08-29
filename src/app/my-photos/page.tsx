import { getDeviceId } from "@/lib/device";
import { getDict, getLocale } from "@/lib/locale";
import { galleryImageUrls } from "@/lib/photo-urls";
import { loadViewerLikes } from "@/lib/public-photos";
import { supabaseAdmin } from "@/lib/supabase-server";
import type { Visibility } from "@/lib/uploader-profile";
import { getUploaderProfile, type UploaderProfile } from "@/lib/uploaders";
import { viewerLabels } from "../viewer-labels";
import { ProfileView, type OwnPhoto } from "./profile-view";

export const dynamic = "force-dynamic";

type OwnPhotoRow = {
  id: string;
  storage_path: string;
  thumbnail_path: string | null;
  original_filename: string;
  visibility: Visibility;
  like_count: number;
  uploaded_at: string;
  image_width: number | null;
  image_height: number | null;
};

async function loadOwnPhotos(deviceId: string): Promise<OwnPhoto[]> {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select(
      "id, storage_path, thumbnail_path, original_filename, visibility, like_count, uploaded_at, image_width, image_height",
    )
    .eq("uploader_id", deviceId)
    .not("uploaded_at", "is", null)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Loading own photos failed: ${error.message}`);
  const rows = data as OwnPhotoRow[];
  const [viewerLikes, imageUrls] = await Promise.all([
    loadViewerLikes(deviceId),
    galleryImageUrls(rows),
  ]);
  return rows.map((photo, index) => ({
    id: photo.id,
    uploadedAt: photo.uploaded_at,
    imageUrl: imageUrls[index],
    width: photo.image_width,
    height: photo.image_height,
    originalFilename: photo.original_filename,
    visibility: photo.visibility,
    likeCount: photo.like_count,
    likedByViewer: viewerLikes.has(photo.id),
  }));
}

export default async function MyPhotosPage() {
  const locale = await getLocale();
  const dict = await getDict();

  const deviceId = await getDeviceId();
  let profile: UploaderProfile | null = null;
  let photos: OwnPhoto[] = [];
  if (deviceId) {
    [profile, photos] = await Promise.all([
      getUploaderProfile(deviceId),
      loadOwnPhotos(deviceId),
    ]);
  }

  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col">
      <ProfileView
        photos={photos}
        defaultVisibility={profile?.defaultVisibility ?? null}
        displayName={profile?.displayName ?? null}
        locale={locale}
        labels={{ ...dict.myPhotos, localeAriaLabel: dict.localeToggle.ariaLabel }}
        viewerLabels={viewerLabels(dict)}
      />
    </main>
  );
}
