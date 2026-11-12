import React from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AdminShell } from "@/components/admin/admin-shell";
import { getCurrentUserProfile } from "@/features/auth/auth-service";
import { requireActiveAdmin } from "@/features/admin/admin-repository";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userProfile } = await getCurrentUserProfile();
  if (!userProfile) {
    redirect("/login?next=/admin");
  }

  const admin = await requireActiveAdmin();
  if (!admin) {
    return (
      <div className="container max-w-lg py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-rose-600">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-extrabold text-brand-navy">
          403 – Không có quyền truy cập
        </h1>
        <p className="mt-2 text-sm text-slate-600">
          Khu vực này chỉ dành cho tài khoản quản trị viên (role:{" "}
          <code className="font-mono">admin</code>). Quyền truy cập được kiểm
          tra ở tầng Server và PostgreSQL RLS.
        </p>
        <Button asChild className="mt-6">
          <Link href="/">Quay về trang chủ</Link>
        </Button>
      </div>
    );
  }

  return <AdminShell adminName={admin.fullName}>{children}</AdminShell>;
}

