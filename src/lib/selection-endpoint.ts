import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  parseSelection,
  parseVisibilitySelection,
  resolveSelection,
  type SelectedPhoto,
  type SelectionScope,
} from "./bulk-selection";
import { PHOTOS_BUCKET } from "./env";
import { jsonError } from "./http";
import { BULK_MOVE_BATCH, moveRenditions, renditionsBucket } from "./renditions";
import { supabaseAdmin } from "./supabase-server";

function scopedUpdate(
  supabase: SupabaseClient,
  values: Record<string, unknown>,
  ids: string[],
  scope: SelectionScope,
) {
  let query = supabase.from("photos").update(values).in("id", ids).is("deleted_at", null);
  if (scope.uploaderId !== null) query = query.eq("uploader_id", scope.uploaderId);
  return query;
}

function progressResponse(
  done: string[],
  failed: string[],
  pending: SelectedPhoto[],
  failure: string,
): NextResponse {
  const progress = { done: done.length, remaining: pending.length - done.length };
  if (failed.length > 0) {
    return NextResponse.json({ error: failure, ...progress }, { status: 500 });
  }
  return NextResponse.json(progress);
}

// Deletes one batch of the selection per request and reports how many
// selected photos are still live; the client keeps calling with the same
// selection until none are.
export async function deleteSelectionResponse(
  request: Request,
  scope: SelectionScope,
): Promise<NextResponse> {
  const ids = parseSelection(await request.json().catch(() => null));
  if (!ids) return jsonError("Invalid selection", 400);

  const supabase = supabaseAdmin();
  const pending = await resolveSelection(supabase, ids, scope);
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
    const { error } = await scopedUpdate(
      supabase,
      { deleted_at: new Date().toISOString() },
      deletable,
      scope,
    );
    if (error) return jsonError("Could not delete photos", 500);
  }
  return progressResponse(deletable, failed, pending, "Could not delete photos");
}

// Changes the visibility of one batch of the selection per request and
// reports how many selected photos still differ; the client keeps calling
// with the same selection until none do.
export async function visibilitySelectionResponse(
  request: Request,
  scope: SelectionScope,
): Promise<NextResponse> {
  const selection = parseVisibilitySelection(await request.json().catch(() => null));
  if (!selection) return jsonError("Invalid selection", 400);
  const { ids, visibility } = selection;

  const supabase = supabaseAdmin();
  const pending = (await resolveSelection(supabase, ids, scope)).filter(
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
    const { error } = await scopedUpdate(
      supabase,
      { visibility },
      moved,
      scope,
    );
    if (error) return jsonError("Could not update photos", 500);
  }
  return progressResponse(moved, failed, pending, "Could not update photos");
}
