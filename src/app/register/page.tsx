"use client";

import React, { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertTriangle,
  Eye,
  EyeOff,
  GraduationCap,
  Info,
  Lock,
  Mail,
  User,
  UserPlus,
} from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  getAllCohorts,
  getAllMajors,
  getAllUniversities,
} from "@/features/marketplace/product-service";
import { useAppUI } from "@/hooks/use-app-ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { registerSchema, sanitizeRedirectPath } from "@/lib/validations/auth";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isSupabaseConfigured } = useAppUI();

  const rawNext = searchParams.get("next");
  const safeNext = sanitizeRedirectPath(rawNext, "/profile");

  const universities = useMemo(() => getAllUniversities(), []);
  const cohorts = useMemo(() => getAllCohorts(), []);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [universityId, setUniversityId] = useState("uni-ctu");
  const [majorId, setMajorId] = useState("major-cntt");
  const [cohort, setCohort] = useState("K49");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const filteredMajors = useMemo(
    () => getAllMajors(universityId),
    [universityId],
  );

  const handleUniversityChange = (nextUniId: string) => {
    setUniversityId(nextUniId);
    const nextMajors = getAllMajors(nextUniId);
    if (nextMajors.length > 0) {
      setMajorId(nextMajors[0].id);
    } else {
      setMajorId("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const parsed = registerSchema.safeParse({
      fullName,
      email,
      password,
      confirmPassword,
      universityId,
      majorId,
      cohort,
    });

    if (!parsed.success) {
      setErrorMessage(
        parsed.error.issues[0]?.message ?? "Thông tin đăng ký chưa hợp lệ.",
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
      const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

      const { data, error } = await supabase.auth.signUp({
        email: parsed.data.email,
        password: parsed.data.password,
        options: {
          emailRedirectTo: callbackUrl,
          data: {
            full_name: parsed.data.fullName,
            university_id: parsed.data.universityId,
            major_id: parsed.data.majorId || null,
            cohort: parsed.data.cohort || null,
          },
        },
      });

      if (error) {
        setErrorMessage(error.message);
        return;
      }

      if (data.session) {
        router.push(safeNext);
        router.refresh();
        return;
      }

      router.push(
        `/login?registered=1&next=${encodeURIComponent(safeNext)}`,
      );
    } catch {
      setErrorMessage("Đã xảy ra lỗi khi đăng ký tài khoản. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container flex min-h-[calc(100vh-9rem)] items-center justify-center py-10">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-8">
        <div className="flex flex-col items-center text-center">
          <BrandLogo size="md" href="/" />
          <Badge variant="default" className="mt-4 gap-1.5">
            <GraduationCap className="h-3.5 w-3.5" />
            Cộng đồng Sinh viên Cụm Đại học Cần Thơ
          </Badge>
          <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy">
            Tạo tài khoản EduLocker
          </h1>
          <p className="mt-1.5 text-sm text-slate-600">
            Kết nối cùng sinh viên nội khu để trao đổi giáo trình, dụng cụ học
            tập và đồ dùng KTX qua Smart Locker.
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
              Vui lòng cấu hình biến môi trường Supabase trong{" "}
              <code className="font-mono">.env.local</code> để tạo tài khoản
              thật trên PostgreSQL.
            </p>
          </div>
        )}

        {/* Clear distinction between Email Verification and Campus Verification */}
        <div className="mt-5 rounded-2xl border border-blue-200/80 bg-brand-blue-light/50 p-3.5 text-xs leading-relaxed text-slate-700">
          <p className="flex items-center gap-1.5 font-bold text-brand-navy">
            <Info className="h-4 w-4 shrink-0 text-brand-blue" />
            Chính sách xác minh minh bạch trên EduLocker
          </p>
          <ul className="mt-1.5 list-disc space-y-1 pl-5">
            <li>
              <strong>Email đã xác minh:</strong> kích hoạt tự động sau khi bạn
              xác nhận liên kết gửi tới hộp thư đăng ký.
            </li>
            <li>
              <strong>Chưa xác thực bởi nhà trường:</strong> ngay cả khi dùng
              email đuôi <code className="font-mono">.edu.vn</code>, trạng thái
              xác thực sinh viên chính thức chỉ được cấp sau khi đối soát thẻ
              sinh viên/hệ thống trường.
            </li>
          </ul>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-700"
          >
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-6 space-y-4" noValidate>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="reg-fullname"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Họ và tên *
              </label>
              <div className="relative mt-1.5">
                <User className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="reg-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="reg-email"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Email *
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="reg-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ban@student.ctu.edu.vn"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <label
                htmlFor="reg-university"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Trường đại học *
              </label>
              <select
                id="reg-university"
                value={universityId}
                onChange={(e) => handleUniversityChange(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              >
                {universities.map((u) => {
                  const hasMajors = getAllMajors(u.id).length > 0;
                  return (
                    <option key={u.id} value={u.id} disabled={!hasMajors}>
                      {u.shortName} – {u.name}
                      {!hasMajors ? " (Sắp hỗ trợ)" : ""}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label
                htmlFor="reg-major"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Khoa / Ngành *
              </label>
              <select
                id="reg-major"
                value={majorId}
                onChange={(e) => setMajorId(e.target.value)}
                disabled={filteredMajors.length === 0}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:bg-slate-100"
              >
                {filteredMajors.length === 0 ? (
                  <option value="">Chưa có ngành mẫu</option>
                ) : (
                  filteredMajors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div className="sm:col-span-1">
              <label
                htmlFor="reg-cohort"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Khóa sinh viên *
              </label>
              <select
                id="reg-cohort"
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
              >
                {cohorts.map((c) => (
                  <option key={c} value={c}>
                    Khóa {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="reg-password"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Mật khẩu *
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="reg-password"
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
                htmlFor="reg-confirm-password"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Xác nhận mật khẩu *
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  id="reg-confirm-password"
                  type={showPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="pl-10"
                />
              </div>
            </div>
          </div>

          <Button
            type="submit"
            size="lg"
            disabled={loading}
            className="w-full"
          >
            <UserPlus className="h-4 w-4" />
            <span>
              {loading ? "Đang khởi tạo tài khoản..." : "Đăng ký tài khoản"}
            </span>
          </Button>
        </form>

        <div className="mt-6 border-t border-slate-100 pt-5 text-center text-sm text-slate-600">
          Đã có tài khoản sinh viên?{" "}
          <Link
            href={
              rawNext
                ? `/login?next=${encodeURIComponent(safeNext)}`
                : "/login"
            }
            className="font-bold text-brand-blue hover:underline"
          >
            Đăng nhập tại đây
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="container py-16 text-center text-sm text-slate-500">
          Đang tải biểu mẫu đăng ký...
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}
