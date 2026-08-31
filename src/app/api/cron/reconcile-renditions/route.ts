import { NextResponse } from "next/server";
import { env, PHOTOS_BUCKET, RENDITIONS_BUCKET } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { moveRenditions, type RenditionsHome } from "@/lib/renditions";
import { supabaseAdmin } from "@/lib/supabase-server";

// Photos per run: a few seconds of moves at the bounded concurrency.
const BATCH = 100;

export const maxDuration = 60;

// Moves any rendition sitting in the bucket its row no longer calls for — a
// move that failed after the row had already changed — to where it belongs.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return jsonError("Unauthorized", 401);
  }

  const supabase = supabaseAdmin();
  const { data, error } = await supabase.rpc("rendition_mismatches", {
    max_rows: BATCH,
  });
  if (error) return jsonError("Could not list mismatched renditions", 500);
  const rows = (data ?? []) as { photo_id: string; bucket: RenditionsHome }[];

  const photosFor = (bucket: RenditionsHome) =>
    rows.filter((row) => row.bucket === bucket).map((row) => ({ id: row.photo_id }));
  const toPrivate = await moveRenditions(supabase, photosFor(PHOTOS_BUCKET), PHOTOS_BUCKET);
  const toPublic = await moveRenditions(
    supabase,
    photosFor(RENDITIONS_BUCKET),
    RENDITIONS_BUCKET,
  );

  return NextResponse.json({
    found: rows.length,
    moved: toPrivate.moved.length + toPublic.moved.length,
    failed: toPrivate.failed.length + toPublic.failed.length,
  });
}
