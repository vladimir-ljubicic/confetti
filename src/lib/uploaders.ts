import "server-only";
import { generateRecoveryCode } from "./recovery-code";
import { supabaseAdmin } from "./supabase-server";
import type { ProfileRequest, Visibility } from "./uploader-profile";

export type UploaderProfile = {
  displayName: string;
  defaultVisibility: Visibility;
  uploadsBlocked: boolean;
  recoveryCode: string;
};

export type PublicUploader = {
  displayName: string;
  uploaderId: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Postgres rejects non-uuid values with an error rather than an empty match,
// so callers must screen route params before querying uuid columns.
export function isUuid(value: string): boolean {
  return UUID_PATTERN.test(value);
}

export async function getUploaderByPublicId(
  publicId: string,
): Promise<PublicUploader | null> {
  if (!isUuid(publicId)) return null;
  const { data, error } = await supabaseAdmin()
    .from("uploaders")
    .select("id, display_name")
    .eq("public_id", publicId)
    .maybeSingle();
  if (error) throw new Error(`Loading uploader failed: ${error.message}`);
  if (!data?.display_name) return null;
  return { displayName: data.display_name, uploaderId: data.id };
}

// A row without a display name is not a usable profile; uploads require one.
export async function getUploaderProfile(
  deviceId: string,
): Promise<UploaderProfile | null> {
  const { data, error } = await supabaseAdmin()
    .from("uploaders")
    .select("display_name, default_visibility, uploads_blocked, recovery_code")
    .eq("id", deviceId)
    .maybeSingle();
  if (error) throw new Error(`Loading uploader failed: ${error.message}`);
  if (!data?.display_name) return null;
  return {
    displayName: data.display_name,
    defaultVisibility: data.default_visibility as Visibility,
    uploadsBlocked: data.uploads_blocked as boolean,
    recoveryCode: data.recovery_code as string,
  };
}

// Postgres unique_violation: two devices drew the same recovery code.
const UNIQUE_VIOLATION = "23505";
const MINT_RETRIES = 3;

// Returns the guest's recovery code, minted on the way in and unchanged by
// every later save.
export async function saveUploaderProfile(
  deviceId: string,
  profile: ProfileRequest,
): Promise<string> {
  for (let attempt = 0; ; attempt += 1) {
    const { data, error } = await supabaseAdmin().rpc("save_uploader_profile", {
      device_id: deviceId,
      display_name: profile.displayName,
      default_visibility: profile.defaultVisibility,
      recovery_code: generateRecoveryCode(),
    });
    if (!error) return data as string;
    if (error.code !== UNIQUE_VIOLATION || attempt >= MINT_RETRIES) {
      throw new Error(`Saving profile failed: ${error.message}`);
    }
  }
}
