import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { env } from "./env";

// Service-role client: bypasses RLS. Server-only — never import from client code.
let client: SupabaseClient | undefined;

export function supabaseAdmin(): SupabaseClient {
  client ??= createClient(env.supabaseUrl(), env.supabaseServiceRoleKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
