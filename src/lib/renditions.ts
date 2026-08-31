import { StorageApiError, type SupabaseClient } from "@supabase/supabase-js";
import { PHOTOS_BUCKET, RENDITIONS_BUCKET } from "./env";
import { renditionPaths } from "./storage-path";

export type RenditionsHome = typeof PHOTOS_BUCKET | typeof RENDITIONS_BUCKET;

// Each move in flight holds one of the project's database connections on the
// storage service, which answers a burst beyond its pool with SlowDown.
export const MOVE_CONCURRENCY = 4;
// Photos per request of a bulk move: a few seconds of work at the concurrency
// above, so every request ends well inside its time budget.
export const BULK_MOVE_BATCH = 40;
const RETRY_DELAYS_MS = [200, 400, 800, 1600, 3200];

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

// A missing source means there is nothing to move: the photo never got that
// rendition, or it is already in the target bucket.
function isMissingSource(error: unknown): boolean {
  return error instanceof StorageApiError && error.code === "NoSuchKey";
}

function isThrottled(error: unknown): boolean {
  return (
    error instanceof StorageApiError &&
    (error.code === "SlowDown" || error.status === 429 || error.status === 503)
  );
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type MoveOptions = {
  concurrency?: number;
  sleep?: (ms: number) => Promise<void>;
};

// Photo ids by whether every rendition sits in the target bucket afterwards.
export type MoveOutcome = { moved: string[]; failed: string[] };

async function moveOne(
  supabase: SupabaseClient,
  from: RenditionsHome,
  to: RenditionsHome,
  path: string,
  sleep: (ms: number) => Promise<void>,
): Promise<boolean> {
  for (let attempt = 0; ; attempt++) {
    const { error } = await supabase.storage
      .from(from)
      .move(path, path, { destinationBucket: to });
    if (error === null || isMissingSource(error)) return true;
    const delay = RETRY_DELAYS_MS[attempt];
    if (isThrottled(error) && delay !== undefined) {
      await sleep(delay);
      continue;
    }
    console.error(`Moving ${from}/${path} to ${to} failed:`, error);
    return false;
  }
}

// Moves each photo's renditions into `bucket` from the other one, keeping
// their paths, a few at a time.
export async function moveRenditions(
  supabase: SupabaseClient,
  photos: { id: string }[],
  bucket: RenditionsHome,
  { concurrency = MOVE_CONCURRENCY, sleep = wait }: MoveOptions = {},
): Promise<MoveOutcome> {
  const from = otherBucket(bucket);
  const tasks = photos.flatMap((photo) =>
    renditionPaths(photo.id).map((path) => ({ id: photo.id, path })),
  );
  const failed = new Set<string>();
  let next = 0;
  async function work(): Promise<void> {
    while (next < tasks.length) {
      const task = tasks[next++];
      if (!(await moveOne(supabase, from, bucket, task.path, sleep))) {
        failed.add(task.id);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, tasks.length) }, work),
  );
  return {
    moved: photos.map((photo) => photo.id).filter((id) => !failed.has(id)),
    failed: [...failed],
  };
}
