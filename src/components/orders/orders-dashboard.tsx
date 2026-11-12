"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  Clock,
  PackageCheck,
  ShoppingBag,
  Store,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  getOrderStatusMeta,
  getPaymentStatusMeta,
} from "@/features/orders/order-state-machine";
import { cn, formatRelativeTimeVi, formatVND } from "@/lib/utils";
import type { OrderSummary } from "@/types";

interface OrdersDashboardProps {
  buyerOrders: OrderSummary[];
  sellerOrders: OrderSummary[];
  initialTab?: "buying" | "selling";
}

export function OrdersDashboard({
  buyerOrders,
  sellerOrders,
  initialTab = "buying",
}: OrdersDashboardProps) {
  const [activeTab, setActiveTab] = useState<"buying" | "selling">(
    initialTab === "selling" ||
      (buyerOrders.length === 0 && sellerOrders.length > 0)
      ? "selling"
      : "buying",
  );

  const displayedOrders = activeTab === "buying" ? buyerOrders : sellerOrders;

  return (
    <div className="space-y-6">
      {/* Tabs Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-slate-200/90 bg-white p-3 shadow-sm sm:p-4">
        <div
          role="tablist"
          aria-label="Phân loại đơn hàng"
          className="grid w-full grid-cols-2 gap-2 sm:w-auto sm:flex"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "buying"}
            onClick={() => setActiveTab("buying")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-extrabold transition-all",
              activeTab === "buying"
                ? "bg-brand-blue text-white shadow-sm"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100",
            )}
          >
            <ShoppingBag className="h-4 w-4" />
            <span>Mua hàng</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold",
                activeTab === "buying"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700",
              )}
            >
              {buyerOrders.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === "selling"}
            onClick={() => setActiveTab("selling")}
            className={cn(
              "inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-extrabold transition-all",
              activeTab === "selling"
                ? "bg-brand-blue text-white shadow-sm"
                : "bg-slate-50 text-slate-700 hover:bg-slate-100",
            )}
          >
            <Store className="h-4 w-4" />
            <span>Bán hàng</span>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-bold",
                activeTab === "selling"
                  ? "bg-white/20 text-white"
                  : "bg-slate-200 text-slate-700",
              )}
            >
              {sellerOrders.length}
            </span>
          </button>
        </div>

        <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
          <PackageCheck className="h-4 w-4 text-brand-green" />
          <span>
            Đồng bộ trạng thái thời gian thực với Smart Locker Simulator &amp;
            Payment Simulator
          </span>
        </div>
      </div>

      {/* Orders List */}
      {displayedOrders.length === 0 ? (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-blue-light text-brand-blue">
            {activeTab === "buying" ? (
              <ShoppingBag className="h-7 w-7" />
            ) : (
              <Store className="h-7 w-7" />
            )}
          </div>
          <h2 className="mt-4 text-lg font-extrabold text-brand-navy">
            {activeTab === "buying"
              ? "Bạn chưa có đơn đặt mua nào"
              : "Bạn chưa có đơn bán hàng nào"}
          </h2>
          <p className="mx-auto mt-1.5 max-w-md text-xs leading-relaxed text-slate-600 sm:text-sm">
            {activeTab === "buying"
              ? "Khám phá giáo trình, máy tính cầm tay và đồ dùng KTX từ sinh viên cùng trường để đặt mua qua trạm Smart Locker mô phỏng."
              : "Khi có sinh viên đặt mua sản phẩm của bạn, đơn hàng sẽ xuất hiện tại đây để bạn xác nhận và gửi hàng vào Smart Locker."}
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button asChild>
              <Link href={activeTab === "buying" ? "/products" : "/sell"}>
                <span>
                  {activeTab === "buying"
                    ? "Khám phá Marketplace"
                    : "Đăng bán sản phẩm"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedOrders.map((order) => {
            const statusMeta = getOrderStatusMeta(order.status);
            const paymentMeta = getPaymentStatusMeta(order.paymentStatus);
            const isBuyerView = activeTab === "buying";

            let actionCtaLabel = "Xem chi tiết đơn hàng";
            if (!isBuyerView && order.status === "PENDING") {
              actionCtaLabel = "Xác nhận đơn & Cấp ngăn tủ";
            } else if (!isBuyerView && order.status === "AWAITING_DROPOFF") {
              actionCtaLabel = "Mô phỏng gửi hàng vào Locker";
            } else if (isBuyerView && order.status === "READY_FOR_PICKUP") {
              actionCtaLabel = "Lấy mã OTP & Mở Smart Locker";
            } else if (isBuyerView && order.status === "PICKED_UP") {
              actionCtaLabel = "Xác nhận hoàn tất giao dịch";
            }

            return (
              <article
                key={order.id}
                className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-sm transition-all hover:border-brand-blue/40 sm:p-6"
              >
                {/* Top bar: Order code, time, status badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono font-bold text-brand-navy">
                      #{order.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span>•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" />
                      {formatRelativeTimeVi(order.createdAt)}
                    </span>
                    <span>•</span>
                    <Badge variant="outline">
                      {isBuyerView ? "Đơn mua" : "Đơn bán"}
                    </Badge>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs font-extrabold",
                        statusMeta.badgeClass,
                      )}
                    >
                      {statusMeta.label}
                    </span>
                  </div>
                </div>

                {/* Middle: Product + Counterparty + Locker Info */}
                <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
                  <div className="flex gap-4">
                    <div className="relative h-20 w-24 shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100">
                      <Image
                        src={order.product.thumbnailUrl}
                        alt={order.product.title}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <Link
                        href={`/orders/${order.id}`}
                        className="line-clamp-1 text-base font-extrabold text-brand-navy hover:text-brand-blue"
                      >
                        {order.product.title}
                      </Link>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1">
                          <User className="h-3.5 w-3.5 text-brand-blue" />
                          {isBuyerView ? (
                            <>
                              Người bán:{" "}
                              <strong className="text-slate-900">
                                {order.seller.fullName}
                              </strong>
                            </>
                          ) : (
                            <>
                              Người mua:{" "}
                              <strong className="text-slate-900">
                                {order.buyer.fullName}
                              </strong>
                            </>
                          )}
                        </span>

                        <span className="inline-flex items-center gap-1">
                          <Box className="h-3.5 w-3.5 text-brand-green" />
                          <span>
                            {order.lockerLocationName ?? "Trạm Smart Locker Demo"}
                            {order.lockerCompartmentCode
                              ? ` • Ngăn ${order.lockerCompartmentCode}`
                              : " (Chờ cấp ngăn)"}
                          </span>
                        </span>
                      </div>

                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="text-base font-extrabold text-brand-blue">
                          {formatVND(order.totalAmount)}
                        </span>
                        <span
                          className={cn(
                            "rounded-lg border px-2 py-0.5 text-[11px] font-semibold",
                            paymentMeta.badgeClass,
                          )}
                        >
                          {paymentMeta.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Action CTA */}
                  <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
                    {isBuyerView &&
                      order.status === "READY_FOR_PICKUP" &&
                      order.lockerLocationId && (
                        <Button asChild variant="secondary" size="sm">
                          <Link
                            href={`/lockers/${order.lockerLocationId}?orderId=${order.id}`}
                          >
                            <Box className="h-4 w-4" />
                            <span>Mở Smart Locker</span>
                          </Link>
                        </Button>
                      )}

                    <Button asChild size="sm">
                      <Link href={`/orders/${order.id}`}>
                        <span>{actionCtaLabel}</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

