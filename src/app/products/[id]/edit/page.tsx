import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProductForm } from "@/components/products/product-form";
import { Button } from "@/components/ui/button";
import { getCurrentUserProfile } from "@/features/auth/auth-service";
import { fetchProductByIdOrSlug } from "@/features/marketplace/product-repository";
import { canManageProduct } from "@/lib/validations/product";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Chỉnh sửa tin đăng",
  description: "Cập nhật thông tin sản phẩm của bạn trên EduLocker.",
};

interface EditProductPageProps {
  params: Promise<{ id: string }>;
}

export default async function EditProductPage({
  params,
}: EditProductPageProps) {
  const { id } = await params;
  const { userProfile } = await getCurrentUserProfile();

  if (!userProfile) {
    redirect(`/login?next=${encodeURIComponent(`/products/${id}/edit`)}`);
  }

  const { product } = await fetchProductByIdOrSlug(id);
  if (!product || product.isDemo) {
    notFound();
  }

  if (!canManageProduct(userProfile.id, product.sellerId)) {
    return (
      <div className="container py-16">
        <div className="mx-auto max-w-lg rounded-3xl border border-rose-200 bg-white p-8 text-center shadow-card">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <ShieldAlert className="h-7 w-7" />
          </div>
          <h1 className="mt-4 text-xl font-extrabold text-brand-navy">
            403 – Không có quyền chỉnh sửa sản phẩm này
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Chỉ chủ sở hữu tin đăng mới được phép chỉnh sửa hoặc xóa sản phẩm.
            Chính sách bảo mật Row Level Security (RLS) đã chặn truy cập trái
            phép.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild variant="outline">
              <Link href="/my-products">Về sản phẩm của tôi</Link>
            </Button>
            <Button asChild>
              <Link href={`/products/${product.slug}`}>Xem sản phẩm</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs
        items={[
          { label: "Sản phẩm của tôi", href: "/my-products" },
          { label: product.title, href: `/products/${product.slug}` },
          { label: "Chỉnh sửa" },
        ]}
      />

      <div className="mt-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
          Chỉnh sửa tin đăng
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Cập nhật mức giá, mô tả, học phần hoặc hình ảnh cho sản phẩm của bạn.
        </p>
      </div>

      <div className="mt-6">
        <ProductForm mode="edit" initialProduct={product} />
      </div>
    </div>
  );
}
