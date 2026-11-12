import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CheckoutForm } from "@/components/orders/checkout-form";
import { getCurrentUserProfile } from "@/features/auth/auth-service";
import { fetchProductByIdOrSlug } from "@/features/marketplace/product-repository";
import { fetchLiveLockerLocations } from "@/features/orders/order-repository";

export const metadata: Metadata = {
  title: "Xác Nhận Đặt Mua Qua Smart Locker – EduLocker",
  description:
    "Xác nhận đặt mua sản phẩm sinh viên qua hệ thống Smart Locker Simulator và Payment Simulator.",
};

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;

  const { userProfile: user } = await getCurrentUserProfile();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/checkout/${productId}`)}`);
  }

  const [{ product }, lockers] = await Promise.all([
    fetchProductByIdOrSlug(productId),
    fetchLiveLockerLocations(),
  ]);

  if (!product) {
    notFound();
  }

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs
        items={[
          { label: "Khám phá", href: "/products" },
          { label: product.title, href: `/products/${product.slug}` },
          { label: "Đặt mua qua Smart Locker" },
        ]}
      />

      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
          Xác nhận đặt mua qua Smart Locker
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Kiểm tra thông tin sản phẩm, chọn trạm Smart Locker đề xuất và xác
          nhận tạo đơn hàng.
        </p>
      </div>

      <CheckoutForm
        product={product}
        lockers={lockers}
        currentUserId={user.id}
      />
    </div>
  );
}
