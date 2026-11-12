"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Mail,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppUI } from "@/hooks/use-app-ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { forgotPasswordSchema } from "@/lib/validations/auth";

export default function ForgotPasswordPage() {
  const { isSupabaseConfigured } = useAppUI();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const parsed = forgotPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Email không hợp lệ.",
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
      const redirectTo = `${window.location.origin}/auth/callback?next=/update-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(
        parsed.data.email,
        { redirectTo },
      );

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      setSuccessMessage(
        "Đã gửi hướng dẫn đặt lại mật khẩu tới hộp thư của bạn. Vui lòng kiểm tra email.",
      );
    } catch {
      setErrorMessage("Không thể gửi yêu cầu đặt lại mật khẩu lúc này.");
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
            <KeyRound className="h-6 w-6" />
          </div>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy">
            Khôi phục mật khẩu
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Nhập email tài khoản EduLocker để nhận liên kết đặt lại mật khẩu.
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

        {successMessage && (
          <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-3 text-xs font-medium text-emerald-900">
            <p className="flex items-center gap-1.5 font-bold">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              Yêu cầu thành công
            </p>
            <p className="mt-1">{successMessage}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div>
            <label
              htmlFor="forgot-email"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Email đăng ký
            </label>
            <div className="relative mt-1.5">
              <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                id="forgot-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="ban@student.ctu.edu.vn"
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
              {loading ? "Đang gửi liên kết..." : "Gửi liên kết đặt lại mật khẩu"}
            </span>
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Quay lại trang Đăng nhập</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
