import { NextResponse } from "next/server";
import { parseVisibilitySelection, resolveSelection } from "@/lib/bulk-selection";
import { getDeviceId } from "@/lib/device";
import { jsonError } from "@/lib/http";
import { BULK_MOVE_BATCH, moveRenditions, renditionsBucket } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";

// Changes the visibility of one batch of the guest's selection per request and
// reports how many selected photos still differ; the client keeps calling
// with the same selection until none do.
export async function POST(request: Request) {
  const deviceId = await getDeviceId();
  if (!deviceId) return jsonError("Not your photos", 403);

  const selection = parseVisibilitySelection(await request.json().catch(() => null));
  if (!selection) return jsonError("Invalid selection", 400);
  const { ids, visibility } = selection;

  const supabase = supabaseAdmin();
  const pending = (await resolveSelection(supabase, deviceId, ids)).filter(
    (photo) => photo.visibility !== visibility,
  );
  const batch = pending.slice(0, BULK_MOVE_BATCH);

  // Renditions cross buckets before the rows change, and a row changes only
  // once its own renditions have moved, so a failure leaves every row
  // consistent with where its renditions are.
  const { moved, failed } = await moveRenditions(
    supabase,
    batch,
    renditionsBucket({ visibility, deleted_at: null }),
  );
  if (moved.length > 0) {
    const { error } = await supabase
      .from("photos")
      .update({ visibility })
      .in("id", moved)
      .eq("uploader_id", deviceId)
      .is("deleted_at", null);
    if (error) return jsonError("Could not update photos", 500);
  }

  const progress = { done: moved.length, remaining: pending.length - moved.length };
  if (failed.length > 0) {
    return NextResponse.json(
      { error: "Could not update photos", ...progress },
      { status: 500 },
    );
  }
  return NextResponse.json(progress);
}
