import { NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { RENDITIONS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { BULK_MOVE_BATCH, moveRenditions } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";

// Restores one batch of the bin per request and reports how many photos
// remain in it; the client keeps calling until none do.
export async function POST() {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const supabase = supabaseAdmin();
  const { data: batch, error: listError } = await supabase
    .from("photos")
    .select("id, visibility")
    .not("deleted_at", "is", null)
    .order("id")
    .limit(BULK_MOVE_BATCH);
  if (listError) return jsonError("Could not restore photos", 500);

  // Public photos' renditions return to the public bucket before their rows
  // come back, and a row comes back only once its renditions are in place:
  // a failure leaves the rest in the bin for the next request.
  const { failed } = await moveRenditions(
    supabase,
    batch.filter((photo) => photo.visibility === "public"),
    RENDITIONS_BUCKET,
  );
  const restorable = batch
    .map((photo) => photo.id)
    .filter((id) => !failed.includes(id));
  if (restorable.length > 0) {
    const { error } = await supabase
      .from("photos")
      .update({ deleted_at: null })
      .in("id", restorable)
      .not("deleted_at", "is", null);
    if (error) return jsonError("Could not restore photos", 500);
  }

  const { count, error: countError } = await supabase
    .from("photos")
    .select("id", { count: "exact", head: true })
    .not("deleted_at", "is", null);
  if (countError || count === null) return jsonError("Could not restore photos", 500);

  const progress = { done: restorable.length, remaining: count };
  if (failed.length > 0) {
    return NextResponse.json(
      { error: "Could not restore photos", ...progress },
      { status: 500 },
    );
  }
  return NextResponse.json(progress);
}
