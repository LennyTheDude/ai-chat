import { createBrowserClient } from "@supabase/ssr";
import { getSupabaseEnv } from "./shared";

export function createSupabaseBrowserClient() {
  const env = getSupabaseEnv();
  return createBrowserClient(env.supabaseUrl, env.supabaseAnonKey);
}
