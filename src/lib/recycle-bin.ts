export const RECYCLE_RETENTION_DAYS = 30;

// Deleted photos older than this moment are eligible for permanent purge.
export function purgeCutoff(now: Date): string {
  return new Date(
    now.getTime() - RECYCLE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function purgeStoragePaths(
  photos: { storage_path: string; thumbnail_path: string | null }[],
): string[] {
  return photos.flatMap((photo) =>
    photo.thumbnail_path
      ? [photo.storage_path, photo.thumbnail_path]
      : [photo.storage_path],
  );
}
