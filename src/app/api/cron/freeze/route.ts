import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { freezeDue } from "@/lib/event-schedule";
import { getEventSettings, updateEventSettings } from "@/lib/event-settings";
import { startFrozenExportBuilds } from "@/lib/export-jobs";
import { jsonError } from "@/lib/http";

// Freezes uploads once the post-event window lapses and makes sure both
// export zips get built; also restarts builds that lost their worker.
export async function GET(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return jsonError("Unauthorized", 401);
  }

  const settings = await getEventSettings();
  let frozen = settings.uploadsFrozen;
  let froze = false;
  if (!frozen && freezeDue(settings, new Date())) {
    await updateEventSettings({ uploadsFrozen: true });
    frozen = true;
    froze = true;
  }

  const kicked = frozen
    ? await startFrozenExportBuilds(new URL(request.url).origin)
    : [];
  return NextResponse.json({ frozen, froze, kicked });
}
