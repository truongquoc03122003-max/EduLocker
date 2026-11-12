import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { PlusCircle, User } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MyProductsManager } from "@/components/products/my-products-manager";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/features/auth/auth-service";
import { fetchMyProducts } from "@/features/marketplace/product-repository";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Sản phẩm của tôi",
  description:
    "Quản lý các tin đăng giáo trình, dụng cụ học tập và đồ dùng KTX của bạn trên EduLocker.",
};

export default async function MyProductsPage() {
  const { userProfile } = await getCurrentUserProfile();

  if (!userProfile) {
    redirect("/login?next=%2Fmy-products");
  }

  const myProducts = await fetchMyProducts(userProfile.id);

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs items={[{ label: "Sản phẩm của tôi" }]} />

      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
            Sản phẩm của tôi ({myProducts.length})
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Quản lý hiển thị, cập nhật thông tin hoặc xóa tin đăng của bạn trên
            Marketplace.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button asChild variant="outline">
            <Link href="/profile">
              <User className="h-4 w-4" />
              <span>Hồ sơ cá nhân</span>
            </Link>
          </Button>
          <Button asChild>
            <Link href="/sell">
              <PlusCircle className="h-4 w-4" />
              <span>Đăng sản phẩm mới</span>
            </Link>
          </Button>
        </div>
      </div>

      <MyProductsManager initialProducts={myProducts} />
    </div>
  );
}
