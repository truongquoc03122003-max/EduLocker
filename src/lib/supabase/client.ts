import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./config";

let browserClient: SupabaseClient<Database> | null = null;

/**
 * Browser Supabase Client dành cho Client Components.
 * Trả về `null` nếu môi trường hiện tại chưa cấu hình biến môi trường Supabase.
 */
export function createSupabaseBrowserClient(): SupabaseClient<Database> | null {
  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }

  if (!browserClient) {
    browserClient = createBrowserClient<Database>(env.url, env.key);
  }

  return browserClient;
}

