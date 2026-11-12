import React from "react";
import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { OrderDetailView } from "@/components/orders/order-detail-view";
import { getCurrentUserProfile } from "@/features/auth/auth-service";
import {
  fetchLiveLockerLocations,
  fetchOrderDetail,
} from "@/features/orders/order-repository";

export const metadata: Metadata = {
  title: "Chi Tiết Đơn Hàng & Smart Locker – EduLocker",
  description:
    "Theo dõi timeline đơn hàng, nhận mã OTP Demo, mở tủ Smart Locker Simulator và xác nhận hoàn tất giao dịch.",
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { userProfile: user } = await getCurrentUserProfile();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/orders/${id}`)}`);
  }

  const [order, lockers] = await Promise.all([
    fetchOrderDetail(id, user.id),
    fetchLiveLockerLocations(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs
        items={[
          { label: "Đơn hàng của tôi", href: "/orders" },
          { label: `Đơn #${order.id.slice(0, 8).toUpperCase()}` },
        ]}
      />

      <div className="mt-2">
        <OrderDetailView
          order={order}
          currentUserId={user.id}
          lockers={lockers}
        />
      </div>
    </div>
  );
}
