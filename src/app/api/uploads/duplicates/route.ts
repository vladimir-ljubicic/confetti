import { NextResponse } from "next/server";
import { isContentHash } from "@/lib/content-hash";
import { getDeviceId } from "@/lib/device";
import { env } from "@/lib/env";
import { jsonError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-server";

function parseHashes(body: unknown): string[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { hashes } = body as Record<string, unknown>;
  if (!Array.isArray(hashes)) return null;
  if (hashes.length > env.uploadLimits().maxBatch) return null;
  if (!hashes.every(isContentHash)) return null;
  return [...new Set(hashes)];
}

// An unfinished upload does not count: a cancelled or failed batch is exactly
// what the guest is re-picking.
export async function POST(request: Request) {
  const hashes = parseHashes(await request.json().catch(() => null));
  if (!hashes) return jsonError("Invalid duplicate check", 400);
  if (hashes.length === 0) return NextResponse.json({ duplicates: [] });

  const deviceId = await getDeviceId();
  if (!deviceId) return NextResponse.json({ duplicates: [] });

  const { data, error } = await supabaseAdmin()
    .from("photos")
    .select("content_hash")
    .eq("uploader_id", deviceId)
    .in("content_hash", hashes)
    .not("uploaded_at", "is", null)
    .is("deleted_at", null);
  if (error) return jsonError("Could not check for duplicates", 500);

  const duplicates = new Set(
    data.map((row) => row.content_hash).filter(isContentHash),
  );
  return NextResponse.json({ duplicates: [...duplicates] });
}
