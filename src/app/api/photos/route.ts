import { NextResponse } from "next/server";
import { getDeviceId } from "@/lib/device";
import { loadPublicPhotos } from "@/lib/public-photos";

// The whole public gallery's metadata in one response, fetched by the client
// after hydration so sorting and per-guest filtering happen locally behind the
// server-rendered first screen. Order is immaterial: the client re-sorts the
// array itself.
export async function GET() {
  const photos = await loadPublicPhotos({
    sort: "latest",
    viewerDeviceId: await getDeviceId(),
  });
  return NextResponse.json({ photos });
}
