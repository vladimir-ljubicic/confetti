import { getDeviceId } from "@/lib/device";
import { getDict, getLocale } from "@/lib/locale";
import { galleryImageUrl, originalDownloadUrl } from "@/lib/photo-urls";
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
  size_bytes: number;
  visibility: Visibility;
  like_count: number;
  uploaded_at: string;
};

async function loadOwnPhotos(deviceId: string): Promise<OwnPhoto[]> {
  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select(
      "id, storage_path, thumbnail_path, original_filename, size_bytes, visibility, like_count, uploaded_at",
    )
    .eq("uploader_id", deviceId)
    .not("uploaded_at", "is", null)
    .is("deleted_at", null)
    .order("uploaded_at", { ascending: false });
  if (error) throw new Error(`Loading own photos failed: ${error.message}`);
  const rows = data as OwnPhotoRow[];
  const viewerLikes = await loadViewerLikes(
    deviceId,
    rows.map((row) => row.id),
  );
  return Promise.all(
    rows.map(async (photo) => ({
      id: photo.id,
      uploadedAt: photo.uploaded_at,
      imageUrl: await galleryImageUrl(photo),
      downloadUrl: await originalDownloadUrl(photo),
      visibility: photo.visibility,
      likeCount: photo.like_count,
      likedByViewer: viewerLikes.has(photo.id),
    })),
  );
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
        labels={dict.myPhotos}
        viewerLabels={viewerLabels(dict)}
      />
    </main>
  );
}
