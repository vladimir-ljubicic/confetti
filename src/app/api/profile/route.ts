import { NextResponse } from "next/server";
import { getDeviceId, getOrCreateDeviceId } from "@/lib/device";
import { jsonError } from "@/lib/http";
import { supabaseAdmin } from "@/lib/supabase-server";
import { parseProfileRequest, parseVisibilityField } from "@/lib/uploader-profile";

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

export async function PATCH(request: Request) {
  const visibility = parseVisibilityField(
    await request.json().catch(() => null),
    "defaultVisibility",
  );
  if (!visibility) return jsonError("Invalid visibility", 400);

  const deviceId = await getDeviceId();
  if (!deviceId) return jsonError("Unknown device", 403);

  const { data, error } = await supabaseAdmin()
    .from("uploaders")
    .update({ default_visibility: visibility })
    .eq("id", deviceId)
    .select("id")
    .maybeSingle();
  if (error) return jsonError("Could not save profile", 500);
  if (!data) return jsonError("No profile", 404);

  return NextResponse.json({ ok: true });
}
