import { StorageApiError, type SupabaseClient } from "@supabase/supabase-js";
import { PHOTOS_BUCKET, RENDITIONS_BUCKET } from "./env";

export type RenditionsHome = typeof PHOTOS_BUCKET | typeof RENDITIONS_BUCKET;

// The bucket a photo's renditions belong in: public live photos serve theirs
// straight from the public CDN bucket; private or deleted photos keep theirs
// in the private bucket, reachable only through the signed proxy.
export function renditionsBucket(photo: {
  visibility: string;
  deleted_at: string | null;
}): RenditionsHome {
  return photo.visibility === "public" && photo.deleted_at === null
    ? RENDITIONS_BUCKET
    : PHOTOS_BUCKET;
}

function otherBucket(bucket: RenditionsHome): RenditionsHome {
  return bucket === PHOTOS_BUCKET ? RENDITIONS_BUCKET : PHOTOS_BUCKET;
}

// A missing source means there is nothing to move: the photo has no thumbnail
// object, or its renditions are already in the target bucket.
function isMissingSource(error: unknown): boolean {
  return error instanceof StorageApiError && error.code === "NoSuchKey";
}

// Moves each photo's renditions into `bucket` from the other one, keeping
// their paths. True when every rendition is in place afterwards.
export async function moveRenditions(
  supabase: SupabaseClient,
  photos: { thumbnail_path: string | null }[],
  bucket: RenditionsHome,
): Promise<boolean> {
  const results = await Promise.all(
    photos.flatMap((photo) =>
      photo.thumbnail_path === null
        ? []
        : [
            supabase.storage
              .from(otherBucket(bucket))
              .move(photo.thumbnail_path, photo.thumbnail_path, {
                destinationBucket: bucket,
              }),
          ],
    ),
  );
  return results.every(({ error }) => error === null || isMissingSource(error));
}
