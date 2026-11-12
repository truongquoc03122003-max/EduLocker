export interface SupabasePublicEnv {
  url: string;
  key: string;
}

/**
 * Đọc cấu hình Supabase từ biến môi trường:
 * - Ưu tiên `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` theo chuẩn mới của Supabase SSR.
 * - Tương thích hợp lý với `NEXT_PUBLIC_SUPABASE_ANON_KEY` nếu project người dùng dùng legacy anon key.
 * - Tuyệt đối không sử dụng hay expose SUPABASE_SERVICE_ROLE_KEY ở đây.
 */
export function getSupabasePublicEnv(): SupabasePublicEnv | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

export function isSupabaseConfigured(): boolean {
  return getSupabasePublicEnv() !== null;
}

