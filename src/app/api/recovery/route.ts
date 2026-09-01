import { NextResponse } from "next/server";
import { getOrCreateDeviceId, setDeviceId } from "@/lib/device";
import { jsonError } from "@/lib/http";
import { redeemRecoveryCode } from "@/lib/recovery";
import { normalizeRecoveryCode } from "@/lib/recovery-code";

function parseCode(body: unknown): string | null {
  if (typeof body !== "object" || body === null) return null;
  const { code } = body as Record<string, unknown>;
  return typeof code === "string" ? normalizeRecoveryCode(code) : null;
}

// Hands this device the identity the code names, folding anything the device
// had already gathered into it.
export async function POST(request: Request) {
  const code = parseCode(await request.json().catch(() => null));
  if (!code) return jsonError("Invalid code", 400);

  const deviceId = await getOrCreateDeviceId();
  const redemption = await redeemRecoveryCode(code, deviceId).catch((error) => {
    console.error("Redeeming recovery code failed", error);
    return null;
  });
  if (!redemption) return jsonError("Could not redeem code", 500);
  if (redemption.outcome === "rate-limited") return jsonError("Too many attempts", 429);
  if (redemption.outcome === "unknown") return jsonError("Unknown code", 404);

  await setDeviceId(redemption.uploaderId);
  return NextResponse.json({ displayName: redemption.displayName });
}
