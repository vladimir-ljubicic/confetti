import "server-only";
import { supabaseAdmin } from "./supabase-server";

export async function areUploadsFrozen(): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("event_settings")
    .select("uploads_frozen")
    .eq("id", 1)
    .maybeSingle();
  if (error) throw new Error(`Loading event settings failed: ${error.message}`);
  return data?.uploads_frozen ?? false;
}

export async function setUploadsFrozen(frozen: boolean): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("event_settings")
    .upsert({ id: 1, uploads_frozen: frozen });
  if (error) throw new Error(`Saving event settings failed: ${error.message}`);
}
