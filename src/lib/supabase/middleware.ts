import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";
import { getSupabasePublicEnv } from "./config";

const PROTECTED_PREFIXES = [
  "/sell",
  "/profile",
  "/my-products",
  "/checkout",
  "/orders",
  "/messages",
  "/notifications",
  "/admin",
];

export function isProtectedRoutePath(pathname: string): boolean {
  if (pathname === "/profile") {
    return true;
  }
  if (
    PROTECTED_PREFIXES.filter((p) => p !== "/profile").some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return true;
  }
  if (/^\/products\/[^/]+\/edit(?:\/|$)/.test(pathname)) {
    return true;
  }
  return false;
}

function redirectToLogin(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.searchParams.set("next", `${pathname}${search}`);
  return NextResponse.redirect(loginUrl);
}

/**
 * Middleware helper cho Next.js 15 + @supabase/ssr:
 * - Tự động refresh session token qua cookies.
 * - Bảo vệ các route yêu cầu đăng nhập (/sell, /profile, /my-products, /products/[id]/edit):
 *   Nếu chưa có phiên đăng nhập thật -> redirect về `/login?next=...`.
 */
export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const env = getSupabasePublicEnv();

  if (!env) {
    // Khi chưa cấu hình Supabase, không tồn tại phiên đăng nhập thật -> chặn ngay các route cần xác thực
    if (isProtectedRoutePath(pathname)) {
      return redirectToLogin(request);
    }
    return NextResponse.next({ request });
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(env.url, env.key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        supabaseResponse = NextResponse.next({
          request,
        });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedRoutePath(pathname)) {
    return redirectToLogin(request);
  }

  return supabaseResponse;
}
