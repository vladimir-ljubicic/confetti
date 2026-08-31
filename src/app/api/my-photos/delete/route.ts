import { NextResponse } from "next/server";
import { parseSelection, resolveSelection } from "@/lib/bulk-selection";
import { getDeviceId } from "@/lib/device";
import { PHOTOS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { BULK_MOVE_BATCH, moveRenditions } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";

// Deletes one batch of the guest's selection per request and reports how many
// selected photos are still live; the client keeps calling with the same
// selection until none are.
export async function POST(request: Request) {
  const deviceId = await getDeviceId();
  if (!deviceId) return jsonError("Not your photos", 403);

  const ids = parseSelection(await request.json().catch(() => null));
  if (!ids) return jsonError("Invalid selection", 400);

  const supabase = supabaseAdmin();
  const pending = await resolveSelection(supabase, deviceId, ids);
  const batch = pending.slice(0, BULK_MOVE_BATCH);

  // Deleted photos render only through the signed proxy: public photos'
  // renditions leave the public CDN before their rows mark them deleted, and
  // a row does so only once its renditions have moved.
  const { failed } = await moveRenditions(
    supabase,
    batch.filter((photo) => photo.visibility === "public"),
    PHOTOS_BUCKET,
  );
  const deletable = batch
    .map((photo) => photo.id)
    .filter((id) => !failed.includes(id));
  if (deletable.length > 0) {
    const { error } = await supabase
      .from("photos")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", deletable)
      .eq("uploader_id", deviceId)
      .is("deleted_at", null);
    if (error) return jsonError("Could not delete photos", 500);
  }

  const progress = { done: deletable.length, remaining: pending.length - deletable.length };
  if (failed.length > 0) {
    return NextResponse.json(
      { error: "Could not delete photos", ...progress },
      { status: 500 },
    );
  }
  return NextResponse.json(progress);
}
