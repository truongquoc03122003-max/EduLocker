"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  GraduationCap,
  Leaf,
  Mail,
  Save,
  ShieldAlert,
  ShieldCheck,
  Star,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { updateMyProfileAction } from "@/features/auth/actions";
import {
  getAllCohorts,
  getAllMajors,
  getAllUniversities,
} from "@/features/marketplace/product-service";
import type { AuthenticatedUserProfile } from "@/types";

interface ProfileFormProps {
  profile: AuthenticatedUserProfile;
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const router = useRouter();
  const universities = useMemo(() => getAllUniversities(), []);
  const cohorts = useMemo(() => getAllCohorts(), []);

  const [fullName, setFullName] = useState(profile.fullName);
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl ?? "");
  const [universityId, setUniversityId] = useState(
    profile.universityId ?? "uni-ctu",
  );
  const [majorId, setMajorId] = useState(
    profile.majorId ??
      getAllMajors(profile.universityId ?? "uni-ctu")[0]?.id ??
      "major-cntt",
  );
  const [cohort, setCohort] = useState(profile.cohort ?? "K49");
  const [bio, setBio] = useState(profile.bio ?? "");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

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
    setSuccessMessage(null);
    setLoading(true);

    try {
      const result = await updateMyProfileAction({
        fullName,
        avatarUrl,
        universityId,
        majorId,
        cohort,
        bio: bio || undefined,
      });

      if (!result.success) {
        setErrorMessage(result.error ?? "Không thể cập nhật hồ sơ.");
        return;
      }

      setSuccessMessage("Đã cập nhật hồ sơ cá nhân thành công!");
      router.refresh();
    } catch {
      setErrorMessage("Đã xảy ra lỗi khi lưu hồ sơ.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Read-Only Identity, Verification & Trust Stats */}
      <div className="space-y-5 lg:col-span-4">
        <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-brand-blue text-lg font-extrabold text-white">
              {profile.fullName
                .split(" ")
                .map((p) => p[0])
                .slice(-2)
                .join("")
                .toUpperCase()}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-extrabold text-brand-navy">
                {profile.fullName}
              </h2>
              <p className="truncate text-xs text-slate-500">{profile.email}</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                <Badge variant="default">{profile.role}</Badge>
                {profile.cohort && (
                  <Badge variant="outline">Khóa {profile.cohort}</Badge>
                )}
              </div>
            </div>
          </div>

          {/* Verification Status Box */}
          <div className="mt-5 space-y-2.5 border-t border-slate-100 pt-4 text-xs">
            <p className="font-bold uppercase tracking-wider text-brand-navy">
              Trạng thái xác thực (Chỉ đọc)
            </p>

            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <Mail className="h-3.5 w-3.5 text-brand-blue" />
                Xác minh Email
              </span>
              {profile.emailVerified ? (
                <Badge variant="eco" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Email đã xác minh
                </Badge>
              ) : (
                <Badge variant="warning">Chờ xác minh email</Badge>
              )}
            </div>

            <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
              <span className="flex items-center gap-1.5 font-medium text-slate-700">
                <GraduationCap className="h-3.5 w-3.5 text-brand-blue" />
                Xác thực Campus
              </span>
              {profile.campusVerified ? (
                <Badge variant="eco" className="gap-1">
                  <ShieldCheck className="h-3 w-3" />
                  Đã xác thực bởi nhà trường
                </Badge>
              ) : (
                <Badge variant="outline" className="gap-1 text-slate-600">
                  <ShieldAlert className="h-3 w-3 text-amber-600" />
                  Chưa xác thực bởi nhà trường
                </Badge>
              )}
            </div>
          </div>

          {/* Read-only reputation metrics */}
          <div className="mt-5 grid grid-cols-3 gap-2 border-t border-slate-100 pt-4 text-center">
            <div className="rounded-xl bg-slate-50 p-2.5">
              <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-brand-navy">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                {profile.ratingAvg.toFixed(1)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Đánh giá</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-2.5">
              <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-brand-navy">
                <Award className="h-3.5 w-3.5 text-brand-blue" />
                {profile.completedTransactions}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">Giao dịch</p>
            </div>
            <div className="rounded-xl bg-emerald-50/70 p-2.5">
              <p className="flex items-center justify-center gap-1 text-sm font-extrabold text-brand-green">
                <Leaf className="h-3.5 w-3.5" />
                {profile.ecoPoints}
              </p>
              <p className="mt-0.5 text-[11px] text-emerald-700">Eco Points</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Editable Profile Fields */}
      <div className="lg:col-span-8">
        <form
          onSubmit={handleSubmit}
          className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8"
        >
          <div className="border-b border-slate-100 pb-4">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-brand-navy">
              <User className="h-5 w-5 text-brand-blue" />
              Cập nhật thông tin sinh viên
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Các trường đặc quyền như Vai trò, Điểm uy tín, Giao dịch hoàn tất
              và Xác thực nhà trường được bảo vệ bởi cơ sở dữ liệu (RLS Trigger)
              và không thể tự sửa từ phía client.
            </p>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
            >
              {errorMessage}
            </div>
          )}

          {successMessage && (
            <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
              {successMessage}
            </div>
          )}

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="profile-fullname"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Họ và tên *
              </label>
              <Input
                id="profile-fullname"
                type="text"
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="mt-1.5"
              />
            </div>

            <div>
              <label
                htmlFor="profile-email-readonly"
                className="block text-xs font-bold uppercase tracking-wider text-slate-500"
              >
                Email đăng nhập (Chỉ đọc)
              </label>
              <Input
                id="profile-email-readonly"
                type="email"
                disabled
                value={profile.email}
                className="mt-1.5 bg-slate-100 text-slate-500"
              />
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="profile-avatar"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              URL Ảnh đại diện (Tùy chọn)
            </label>
            <Input
              id="profile-avatar"
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="mt-1.5"
            />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label
                htmlFor="profile-university"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Trường đại học *
              </label>
              <select
                id="profile-university"
                value={universityId}
                onChange={(e) => handleUniversityChange(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none"
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

            <div>
              <label
                htmlFor="profile-major"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Khoa / Ngành *
              </label>
              <select
                id="profile-major"
                value={majorId}
                onChange={(e) => setMajorId(e.target.value)}
                disabled={filteredMajors.length === 0}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none disabled:bg-slate-100"
              >
                {filteredMajors.length === 0 ? (
                  <option value="">Chưa có ngành hỗ trợ</option>
                ) : (
                  filteredMajors.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))
                )}
              </select>
            </div>

            <div>
              <label
                htmlFor="profile-cohort"
                className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
              >
                Khóa sinh viên *
              </label>
              <select
                id="profile-cohort"
                value={cohort}
                onChange={(e) => setCohort(e.target.value)}
                className="mt-1.5 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none"
              >
                {cohorts.map((c) => (
                  <option key={c} value={c}>
                    Khóa {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="mt-4">
            <label
              htmlFor="profile-bio"
              className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
            >
              Giới thiệu ngắn (Tối đa 300 ký tự)
            </label>
            <textarea
              id="profile-bio"
              rows={3}
              maxLength={300}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Ví dụ: Sinh viên K49 CNTT – Trường CNTT&TT (CTU). Thường giao dịch giáo trình qua Smart Locker Khu II."
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
            />
          </div>

          <div className="mt-6 flex justify-end">
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4" />
              <span>{loading ? "Đang lưu thay đổi..." : "Lưu hồ sơ"}</span>
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
