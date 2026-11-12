import React from "react";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { OrdersDashboard } from "@/components/orders/orders-dashboard";
import { getCurrentUserProfile } from "@/features/auth/auth-service";
import { fetchUserOrders } from "@/features/orders/order-repository";

export const metadata: Metadata = {
  title: "Quản Lý Đơn Hàng Mua & Bán – EduLocker",
  description:
    "Theo dõi đơn hàng mua và bán qua hệ thống Smart Locker Simulator và Payment Simulator.",
};

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { userProfile: user } = await getCurrentUserProfile();
  if (!user) {
    redirect("/login?next=/orders");
  }

  const resolvedParams = await searchParams;
  const initialTab = resolvedParams.tab === "selling" ? "selling" : "buying";

  const { buyerOrders, sellerOrders } = await fetchUserOrders(user.id);

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs items={[{ label: "Đơn hàng của tôi" }]} />

      <div className="mt-2 mb-6">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
          Quản lý đơn hàng EduLocker
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Theo dõi tiến trình giao dịch 5 bước qua trạm Smart Locker mô phỏng và
          Payment Simulator.
        </p>
      </div>

      <OrdersDashboard
        buyerOrders={buyerOrders}
        sellerOrders={sellerOrders}
        initialTab={initialTab}
      />
    </div>
  );
}
