import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Package, PlusCircle } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProfileForm } from "@/components/profile/profile-form";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/features/auth/auth-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Hồ sơ cá nhân",
  description:
    "Quản lý thông tin sinh viên, trường, ngành học, khóa và trạng thái xác thực trên EduLocker.",
};

export default async function ProfilePage() {
  const { userProfile } = await getCurrentUserProfile();

  if (!userProfile) {
    redirect("/login?next=%2Fprofile");
  }

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs items={[{ label: "Hồ sơ cá nhân" }]} />

      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
            Hồ sơ sinh viên EduLocker
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Quản lý thông tin học thuật và theo dõi chỉ số uy tín giao dịch nội
            khu của bạn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/my-products">
              <Package className="h-4 w-4" />
              <span>Sản phẩm của tôi</span>
            </Link>
          </Button>
          <Button asChild>
            <Link href="/sell">
              <PlusCircle className="h-4 w-4" />
              <span>Đăng bán sản phẩm</span>
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <ProfileForm profile={userProfile} />
      </div>
    </div>
  );
}
