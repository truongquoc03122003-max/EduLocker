"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  Lock,
  ShieldCheck,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppUI } from "@/hooks/use-app-ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { updatePasswordSchema } from "@/lib/validations/auth";

export default function UpdatePasswordPage() {
  const router = useRouter();
  const { isSupabaseConfigured } = useAppUI();

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsed = updatePasswordSchema.safeParse({
      password,
      confirmPassword,
    });
    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Mật khẩu mới không hợp lệ.",
      );
      return;
    }

    if (!isSupabaseConfigured) {
      setErrorMessage("Supabase chưa được cấu hình cho môi trường này.");
      return;
    }

    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setErrorMessage("Supabase chưa được cấu hình cho môi trường này.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: parsed.data.password,
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/profile");
        router.refresh();
      }, 1500);
    } catch {
      setErrorMessage("Không thể cập nhật mật khẩu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex min-h-[calc(100vh-9rem)] items-center justify-center py-10">
      <div className="w-full max-w-md rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size="md" href="/" />
          <div className="mt-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue-light text-brand-blue">
            <ShieldCheck className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy">
            Đặt mật khẩu mới
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Thiết lập mật khẩu mới an toàn cho tài khoản EduLocker của bạn.
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

        {success ? (
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-center text-sm text-emerald-900">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600" />
            <p className="mt-2 font-bold">Đã cập nhật mật khẩu thành công!</p>
            <p className="mt-1 text-xs">
              Đang chuyển hướng về hồ sơ cá nhân...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
            <div>
              <label
                htmlFor="new-password"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Mật khẩu mới *
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Tối thiểu 8 ký tự"
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

            <div>
              <label
                htmlFor="confirm-new-password"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Xác nhận mật khẩu mới *
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="confirm-new-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu mới"
                  className="pl-10"
                />
              </div>
            </div>

            <Button
              type="submit"
              size="lg"
              disabled={loading}
              className="w-full"
            >
              <span>
                {loading ? "Đang lưu mật khẩu..." : "Lưu mật khẩu mới"}
              </span>
            </Button>
          </form>
        )}

        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm">
          <Link
            href="/login"
            className="font-bold text-brand-blue hover:underline"
          >
            Quay về Đăng nhập
          </Link>
        </div>
      </div>
    </div>
  );
}
