import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createServerComponentSafeSetAll } from "./cookieAdapters";
import { getSupabaseEnv } from "./shared";

export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = getSupabaseEnv();
  const setAll = createServerComponentSafeSetAll((name, value, options) => {
    cookieStore.set(name, value, options);
  });

  return createServerClient(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll,
    },
  });
}
