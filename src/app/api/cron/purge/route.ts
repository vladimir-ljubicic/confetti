import { NextResponse } from "next/server";
import { env, PHOTOS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { purgeCutoff, purgeStoragePaths } from "@/lib/recycle-bin";
import { supabaseAdmin } from "@/lib/supabase-server";

// Permanently purges photos whose recycle-bin retention has lapsed: storage
// objects first, rows after — a storage failure leaves the rows for the next
// run.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return jsonError("Unauthorized", 401);
  }

  const supabase = supabaseAdmin();
  const cutoff = purgeCutoff(new Date());
  const { data: expired, error } = await supabase
    .from("photos")
    .select("id, storage_path, thumbnail_path")
    .lt("deleted_at", cutoff);
  if (error) return jsonError("Could not list expired photos", 500);
  if (expired.length === 0) return NextResponse.json({ purged: 0 });

  const { error: storageError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove(purgeStoragePaths(expired));
  if (storageError) return jsonError("Could not remove storage objects", 500);

  // Re-asserts the cutoff so a photo restored mid-run keeps its row.
  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .in(
      "id",
      expired.map((photo) => photo.id),
    )
    .lt("deleted_at", cutoff);
  if (deleteError) return jsonError("Could not delete photo rows", 500);

  return NextResponse.json({ purged: expired.length });
}
