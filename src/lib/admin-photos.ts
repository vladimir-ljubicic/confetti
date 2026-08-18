export type PhotoUploader = {
  publicId: string;
  displayName: string;
};

export type UploaderGroup<T> = {
  uploader: PhotoUploader | null;
  photos: T[];
};

export function groupPhotosByUploader<T extends { uploader: PhotoUploader | null }>(
  photos: T[],
): UploaderGroup<T>[] {
  const groups = new Map<string | null, UploaderGroup<T>>();
  for (const photo of photos) {
    const key = photo.uploader?.publicId ?? null;
    let group = groups.get(key);
    if (!group) {
      group = { uploader: photo.uploader, photos: [] };
      groups.set(key, group);
    }
    group.photos.push(photo);
  }
  return [...groups.values()].sort((a, b) => {
    if (!a.uploader) return 1;
    if (!b.uploader) return -1;
    return a.uploader.displayName.localeCompare(b.uploader.displayName);
  });
}
