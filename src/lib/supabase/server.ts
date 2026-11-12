import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./config";

/**
 * Server Supabase Client dành cho Server Components, Server Actions và Route Handlers.
 * Sử dụng async `cookies()` của Next.js 15 App Router.
 * Trả về `null` nếu biến môi trường Supabase chưa được cấu hình.
 */
export async function createSupabaseServerClient(): Promise<SupabaseClient<Database> | null> {
  const env = getSupabasePublicEnv();
  if (!env) {
    return null;
  }

  const cookieStore = await cookies();

  return createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Được gọi từ Server Component (read-only cookies).
          // Middleware sẽ đảm nhận việc refresh session cookies.
        }
      },
    },
  });
}

