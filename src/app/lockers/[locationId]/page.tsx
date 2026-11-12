import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SmartLockerSimulator } from "@/components/lockers/smart-locker-simulator";
import { getCurrentUserProfile } from "@/features/auth/auth-service";
import {
  fetchLiveLockerLocations,
  fetchOrderDetail,
} from "@/features/orders/order-repository";

export const metadata: Metadata = {
  title: "Smart Locker Simulator – Mở Tủ Bằng Mã OTP – EduLocker",
  description:
    "Trải nghiệm mô phỏng cụm tủ Smart Locker nội khu Campus, nhập mã OTP 6 số mở ngăn tủ và nhận sản phẩm.",
};

export default async function LockerStationSimulatorPage({
  params,
  searchParams,
}: {
  params: Promise<{ locationId: string }>;
  searchParams: Promise<{ orderId?: string }>;
}) {
  const [{ locationId }, { orderId }, lockers, { userProfile: user }] =
    await Promise.all([
      params,
      searchParams,
      fetchLiveLockerLocations(),
      getCurrentUserProfile(),
    ]);

  const station =
    lockers.find(
      (l) =>
        l.id === locationId ||
        l.code.toLowerCase() === locationId.toLowerCase(),
    ) ?? null;

  if (!station) {
    notFound();
  }

  const activeOrder =
    orderId && user ? await fetchOrderDetail(orderId, user.id) : null;

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs
        items={[
          { label: "Hệ thống Smart Locker", href: "/lockers" },
          { label: `${station.name} (Simulator)` },
        ]}
      />

      <div className="mt-2">
        <SmartLockerSimulator
          station={station}
          activeOrder={activeOrder}
          currentUserId={user?.id ?? null}
        />
      </div>
    </div>
  );
}
