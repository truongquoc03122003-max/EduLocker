import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProductForm } from "@/components/products/product-form";
import { getCurrentUserProfile } from "@/features/auth/auth-service";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Đăng bán giáo trình & đồ dùng sinh viên",
  description:
    "Đăng bán lại giáo trình, máy tính cầm tay, dụng cụ thí nghiệm và đồ dùng KTX qua hệ thống Smart Locker tại Đại học Cần Thơ.",
};

export default async function SellPage() {
  const { userProfile } = await getCurrentUserProfile();

  if (!userProfile) {
    redirect("/login?next=%2Fsell");
  }

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs items={[{ label: "Đăng bán sản phẩm" }]} />

      <div className="mt-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
          Đăng bán đồ dùng &amp; giáo trình sinh viên
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Điền thông tin học phần và chọn trạm Smart Locker thuận tiện nhất để
          ký gửi sản phẩm nội khu.
        </p>
      </div>

      <div className="mt-6">
        <ProductForm
          mode="create"
          defaultUniversityId={userProfile.universityId}
          defaultMajorId={userProfile.majorId}
          defaultCohort={userProfile.cohort}
        />
      </div>
    </div>
  );
}
