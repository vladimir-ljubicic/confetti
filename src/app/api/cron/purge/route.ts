import { NextResponse } from "next/server";
import { env, PHOTOS_BUCKET, RENDITIONS_BUCKET } from "@/lib/env";
import { purgeExpiredExports } from "@/lib/export-jobs";
import { jsonError } from "@/lib/http";
import { purgeCutoff, purgeRenditionPaths, purgeStoragePaths } from "@/lib/recycle-bin";
import { supabaseAdmin } from "@/lib/supabase-server";

// Permanently purges photos whose recycle-bin retention has lapsed and export
// zips whose link validity has: storage objects first, rows after — a storage
// failure leaves the rows for the next run.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return jsonError("Unauthorized", 401);
  }

  const now = new Date();
  const [photos, exports] = await Promise.allSettled([
    purgeExpiredPhotos(now),
    purgeExpiredExports(now),
  ]);
  const failed = [photos, exports].filter((r) => r.status === "rejected");
  for (const r of failed) console.error("Purge failed", r.reason);
  if (failed.length > 0) return jsonError("Purge failed", 500);
  return NextResponse.json({
    purged: photos.status === "fulfilled" ? photos.value : null,
    exports: exports.status === "fulfilled" ? exports.value : null,
  });
}

async function purgeExpiredPhotos(now: Date): Promise<number> {
  const supabase = supabaseAdmin();
  const cutoff = purgeCutoff(now);
  const { data: expired, error } = await supabase
    .from("photos")
    .select("id, storage_path")
    .lt("deleted_at", cutoff);
  if (error) throw new Error(`Listing expired photos failed: ${error.message}`);
  if (expired.length === 0) return 0;

  const { error: storageError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove(purgeStoragePaths(expired));
  if (storageError) throw new Error(`Removing photo objects failed: ${storageError.message}`);

  const { error: renditionsError } = await supabase.storage
    .from(RENDITIONS_BUCKET)
    .remove(purgeRenditionPaths(expired));
  if (renditionsError) {
    throw new Error(`Removing rendition objects failed: ${renditionsError.message}`);
  }

  // Re-asserts the cutoff so a photo restored mid-run keeps its row.
  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .in(
      "id",
      expired.map((photo) => photo.id),
    )
    .lt("deleted_at", cutoff);
  if (deleteError) throw new Error(`Deleting photo rows failed: ${deleteError.message}`);

  return expired.length;
}
