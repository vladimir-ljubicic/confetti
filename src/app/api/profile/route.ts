import { NextResponse } from "next/server";
import { getOrCreateDeviceId } from "@/lib/device";
import { jsonError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-server";
import { parseProfileRequest } from "@/lib/uploader-profile";

export async function POST(request: Request) {
  const profile = parseProfileRequest(await request.json().catch(() => null));
  if (!profile) return jsonError("Invalid profile", 400);

  const deviceId = await getOrCreateDeviceId();
  const { error } = await supabaseAdmin().from("uploaders").upsert(
    {
      id: deviceId,
      display_name: profile.displayName,
      default_visibility: profile.defaultVisibility,
    },
    { onConflict: "id" },
  );
  if (error) return jsonError("Could not save profile", 500);

  return NextResponse.json({ ok: true });
}
