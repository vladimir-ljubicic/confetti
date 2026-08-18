import "server-only";
import { supabaseAdmin } from "./supabase-server";
import type { Visibility } from "./uploader-profile";

export type UploaderProfile = {
  displayName: string;
  defaultVisibility: Visibility;
};

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
