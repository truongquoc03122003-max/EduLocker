"use client";

import React, { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  LogIn,
  Mail,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useAppUI } from "@/hooks/use-app-ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { loginSchema, sanitizeRedirectPath } from "@/lib/validations/auth";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSupabaseConfigured } = useAppUI();

  const rawNext = searchParams.get("next");
  const safeNext = sanitizeRedirectPath(rawNext, "/profile");
  const urlError = searchParams.get("error");
  const urlRegistered = searchParams.get("registered");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(urlError);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsed = loginSchema.safeParse({ email, password });
    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Thông tin đăng nhập chưa hợp lệ.",
      );
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage(
        "Supabase chưa được cấu hình cho môi trường này. Vui lòng thiết lập NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY trong .env.local.",
      );
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrorMessage("Supabase chưa được cấu hình cho môi trường này.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: parsed.data.email,
        password: parsed.data.password,
      });

      if (error) {
        setErrorMessage(
          error.message === "Invalid login credentials"
            ? "Email hoặc mật khẩu không chính xác. Vui lòng kiểm tra lại."
            : error.message,
        );
        return;
      }

      router.push(safeNext);
      router.refresh();
    } catch {
      setErrorMessage("Đã xảy ra lỗi kết nối khi đăng nhập. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex min-h-[calc(100vh-9rem)] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size="md" href="/" />
          <Badge variant="default" className="mt-4 gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" />
            Tài khoản Sinh viên EduLocker
          </Badge>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy">
            Đăng nhập vào EduLocker
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Đăng bán giáo trình, quản lý tin đăng và đồng bộ danh sách yêu thích
            nội khu Campus.
          </p>
        </div>

        {!isSupabaseConfigured && (
          <div
            role="alert"
            className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs leading-relaxed text-amber-900"
          >
            <p className="flex items-center gap-1.5 font-bold text-amber-950">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-600" />
              Supabase chưa được cấu hình cho môi trường này.
            </p>
            <p className="mt-1 text-amber-800">
              Hệ thống không giả lập đăng nhập khi thiếu cấu hình. Hãy khai báo{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">
                NEXT_PUBLIC_SUPABASE_URL
              </code>{" "}
              và{" "}
              <code className="rounded bg-amber-100 px-1 py-0.5 font-mono">
                NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
              </code>{" "}
              trong <code className="font-mono">.env.local</code> để kích hoạt
              Supabase Auth thật.
            </p>
          </div>
        )}

        {urlRegistered === "1" && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-medium text-emerald-900">
            <p className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              Đăng ký tài khoản thành công!
            </p>
            <p className="mt-1">
              Vui lòng kiểm tra hộp thư email để xác minh tài khoản trước khi
              đăng nhập (nếu dự án Supabase bật xác thực email).
            </p>
          </div>
        )}

        {rawNext && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-brand-blue-light/60 px-3.5 py-2.5 text-xs text-slate-700">
            Sau khi đăng nhập, bạn sẽ được chuyển tiếp an toàn đến:{" "}
            <strong className="font-bold text-brand-blue">{safeNext}</strong>
          </div>
        )}

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="login-email"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Email sinh viên / cá nhân
            </label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="login-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@student.ctu.edu.vn"
                className="pl-10"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="login-password"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Mật khẩu
              </label>
              <Link
                href="/forgot-password"
                className="text-xs font-semibold text-brand-blue hover:underline"
              >
                Quên mật khẩu?
              </Link>
            </div>
            <div className="relative mt-1.5">
              <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="login-password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nhập mật khẩu (tối thiểu 8 ký tự)"
                className="pl-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            <LogIn className="h-4 w-4" />
            <span>{loading ? "Đang xử lý đăng nhập..." : "Đăng nhập"}</span>
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
          Chưa có tài khoản EduLocker?{" "}
          <Link
            href={
              rawNext
                ? `/register?next=${encodeURIComponent(safeNext)}`
                : "/register"
            }
            className="inline-flex items-center gap-1 font-bold text-brand-blue hover:underline"
          >
            <span>Đăng ký ngay</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-16 text-center text-sm text-slate-500">
          Đang tải biểu mẫu đăng nhập...
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
