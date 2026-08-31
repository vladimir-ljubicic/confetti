import { after, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { updateEventSettings } from "@/lib/event-settings";
import { startFrozenExportBuilds } from "@/lib/export-jobs";
import { jsonError } from "@/lib/http";
import { parseSettingsPatch } from "@/lib/upload-freeze";

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const patch = parseSettingsPatch(await request.json().catch(() => null));
  if (patch === null) return jsonError("Invalid settings", 400);

  const saved = await updateEventSettings(patch)
    .then(() => true)
    .catch(() => false);
  if (!saved) return jsonError("Could not save settings", 500);

  if (patch.uploadsFrozen) {
    const origin = new URL(request.url).origin;
    after(() => startFrozenExportBuilds(origin));
  }

  return NextResponse.json({ ok: true });
}
