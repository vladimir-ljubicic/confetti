import "server-only";
import { supabaseAdmin } from "./supabase-server";
import type { Visibility } from "./uploader-profile";

export type UploaderProfile = {
  displayName: string;
  defaultVisibility: Visibility;
};

export type PublicUploader = {
  displayName: string;
  uploaderId: string;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getUploaderByPublicId(
  publicId: string,
): Promise<PublicUploader | null> {
  // Postgres rejects non-uuid values with an error rather than an empty match.
  if (!UUID_PATTERN.test(publicId)) return null;
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
    .select("display_name, default_visibility")
    .eq("id", deviceId)
    .maybeSingle();
  if (error) throw new Error(`Loading uploader failed: ${error.message}`);
  if (!data?.display_name) return null;
  return {
    displayName: data.display_name,
    defaultVisibility: data.default_visibility as Visibility,
  };
}
