import { after, NextResponse } from "next/server";
import { isAdmin } from "@/lib/admin-session";
import { setUploadsFrozen } from "@/lib/event-settings";
import { EXPORT_KINDS, kickExportBuild } from "@/lib/export-jobs";
import { jsonError } from "@/lib/http";
import { parseUploadsFrozenField } from "@/lib/upload-freeze";

export async function PATCH(request: Request) {
  if (!(await isAdmin())) return jsonError("Admin only", 403);

  const uploadsFrozen = parseUploadsFrozenField(await request.json().catch(() => null));
  if (uploadsFrozen === null) return jsonError("Invalid settings", 400);

  const saved = await setUploadsFrozen(uploadsFrozen)
    .then(() => true)
    .catch(() => false);
  if (!saved) return jsonError("Could not save settings", 500);

  // Freezing starts the one-time export zip builds (idempotent once built).
  if (uploadsFrozen) {
    const origin = new URL(request.url).origin;
    after(async () => {
      for (const kind of EXPORT_KINDS) await kickExportBuild(origin, kind);
    });
  }

  return NextResponse.json({ ok: true });
}
