import React from "react";
import Link from "next/link";
import { fetchAdminOverviewStats } from "@/features/admin/admin-repository";
import { formatVND } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOverviewPage() {
  const stats = await fetchAdminOverviewStats();
  const lockerUtil =
    stats.lockerTotalCompartments > 0
      ? Math.round(
          (stats.lockerUsedCompartments / stats.lockerTotalCompartments) * 100,
        )
      : 0;

  const cards = [
    { label: "Tổng người dùng", value: stats.totalUsers, sub: `+${stats.newUsers7d} trong 7 ngày` },
    { label: "Tổng sản phẩm", value: stats.totalProducts, sub: `${stats.availableProducts} AVAILABLE • ${stats.soldProducts} SOLD` },
    { label: "Tổng đơn hàng", value: stats.totalOrders, sub: `${stats.completedOrders} hoàn tất • ${stats.cancelledOrders} đã hủy` },
    { label: "Đơn đang khiếu nại", value: stats.disputedOrders, sub: `${stats.openDisputes} dispute đang mở`, href: "/admin/disputes" },
    { label: "Tổng giao dịch Demo", value: formatVND(stats.totalDemoVolume), sub: "Payment Simulator (RELEASED_DEMO)" },
    { label: "Tỷ lệ dùng Smart Locker", value: `${lockerUtil}%`, sub: `${stats.lockerUsedCompartments}/${stats.lockerTotalCompartments} ngăn đang giữ/chứa hàng`, href: "/admin/lockers" },
    { label: "Báo cáo chờ xử lý", value: stats.pendingReports, sub: "PENDING / REVIEWING", href: "/admin/reports" },
    { label: "Sản phẩm đã tái sử dụng", value: stats.reusedItemCount, sub: "Đơn hàng COMPLETED (Kinh tế tuần hoàn)", href: "/admin/statistics" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-brand-navy">
          Tổng quan hệ thống EduLocker
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Số liệu thực tế truy vấn từ Supabase PostgreSQL. Payment Simulator và
          Smart Locker Simulator được gắn nhãn minh bạch.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => {
          const inner = (
            <div className="h-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
              <p className="text-xs font-semibold text-slate-500">{c.label}</p>
              <p className="mt-1.5 text-2xl font-extrabold text-brand-navy">
                {c.value}
              </p>
              <p className="mt-1 text-[11px] text-slate-500">{c.sub}</p>
            </div>
          );
          return c.href ? (
            <Link key={c.label} href={c.href}>
              {inner}
            </Link>
          ) : (
            <div key={c.label}>{inner}</div>
          );
        })}
      </div>
    </div>
  );
}

