import "server-only";
import { removeZipObject } from "./export-jobs";
import { supabaseAdmin } from "./supabase-server";

export type Redemption =
  | { outcome: "ok"; uploaderId: string; displayName: string | null }
  | { outcome: "unknown" }
  | { outcome: "rate-limited" };

export async function redeemRecoveryCode(
  code: string,
  deviceId: string,
): Promise<Redemption> {
  const { data, error } = await supabaseAdmin().rpc("redeem_recovery_code", {
    code,
    device_id: deviceId,
  });
  if (error) throw new Error(`Redeeming recovery code failed: ${error.message}`);

  const result = data as {
    outcome: Redemption["outcome"];
    uploader_id?: string;
    display_name?: string | null;
    discarded_zip_path?: string | null;
  };
  // Best-effort: an object left behind costs storage, never correctness, and
  // the identity has already changed hands.
  if (result.discarded_zip_path) {
    await removeZipObject(result.discarded_zip_path).catch((error) =>
      console.error("Removing the merged device's zip failed", error),
    );
  }
  return result.outcome === "ok"
    ? {
        outcome: "ok",
        uploaderId: result.uploader_id as string,
        displayName: result.display_name ?? null,
      }
    : { outcome: result.outcome };
}
