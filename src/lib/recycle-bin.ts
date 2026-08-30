import { renditionPaths } from "./storage-path";

export const RECYCLE_RETENTION_DAYS = 30;

// Deleted photos older than this moment are eligible for permanent purge.
export function purgeCutoff(now: Date): string {
  return new Date(
    now.getTime() - RECYCLE_RETENTION_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
}

export function purgeStoragePaths(
  photos: { id: string; storage_path: string }[],
): string[] {
  return photos.flatMap((photo) => [
    photo.storage_path,
    ...renditionPaths(photo.id),
  ]);
}

// Renditions live in either the private or the public bucket depending on the
// photo's visibility; purging removes the same paths from both, and removing
// a path that is not there is a no-op.
export function purgeRenditionPaths(photos: { id: string }[]): string[] {
  return photos.flatMap((photo) => renditionPaths(photo.id));
}
