import { NextResponse } from "next/server";
import { PHOTOS_BUCKET } from "@/lib/env";
import { isAdmin } from "@/lib/admin-session";
import { jsonError } from "@/lib/http";
import { purgeStoragePaths } from "@/lib/recycle-bin";
import { supabaseAdmin } from "@/lib/supabase-server";

// Storage objects first, rows after — a storage failure leaves the rows
// intact so the bin still lists the photos.
export async function POST() {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const supabase = supabaseAdmin();
  const { data: deleted, error } = await supabase
    .from("photos")
    .select("id, storage_path, thumbnail_path")
    .not("deleted_at", "is", null);
  if (error) return jsonError("Could not list deleted photos", 500);
  if (deleted.length === 0) return NextResponse.json({ purged: 0 });

  const { error: storageError } = await supabase.storage
    .from(PHOTOS_BUCKET)
    .remove(purgeStoragePaths(deleted));
  if (storageError) return jsonError("Could not remove storage objects", 500);

  // Re-asserts deletion so a photo restored mid-run keeps its row.
  const { error: deleteError } = await supabase
    .from("photos")
    .delete()
    .in(
      "id",
      deleted.map((photo) => photo.id),
    )
    .not("deleted_at", "is", null);
  if (deleteError) return jsonError("Could not delete photo rows", 500);

  return NextResponse.json({ purged: deleted.length });
}
