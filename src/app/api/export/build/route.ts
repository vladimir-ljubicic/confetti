import { after, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { kickExportBuild, runExportJob } from "@/lib/export-jobs";
import { jsonError } from "@/lib/http";

export const maxDuration = 300;

// Leave the tail of the invocation window for the chained kick.
const BUDGET_MS = 240_000;

// Packs one time-budgeted slice of a zip and re-invokes itself until the
// archive is complete, so builds survive serverless duration limits. The
// response returns immediately; the slice runs after it.
export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret()}`) {
    return jsonError("Unauthorized", 401);
  }
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  if (kind !== "public" && kind !== "admin") {
    return jsonError("Unknown export kind", 400);
  }

  after(async () => {
    const result = await runExportJob(kind, Date.now() + BUDGET_MS);
    if (!result.finished && result.retry) await kickExportBuild(url.origin, kind);
  });
  return NextResponse.json({ started: true }, { status: 202 });
}
