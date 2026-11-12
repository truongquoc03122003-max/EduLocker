"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Box,
  CheckCircle2,
  Clock,
  CreditCard,
  GraduationCap,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { createOrderAction } from "@/features/orders/order-actions";
import { formatVND } from "@/lib/utils";
import type { LockerLocation, Product } from "@/types";

interface CheckoutFormProps {
  product: Product;
  lockers: LockerLocation[];
  currentUserId: string;
}

export function CheckoutForm({
  product,
  lockers,
  currentUserId,
}: CheckoutFormProps) {
  const router = useRouter();
  const [selectedLockerId, setSelectedLockerId] = useState<string>(
    product.preferredLockerId || lockers[0]?.id || "locker-thu-vien",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const isOwnProduct = product.sellerId === currentUserId;
  const isAvailable = product.status === "AVAILABLE";
  const selectedStation =
    lockers.find((l) => l.id === selectedLockerId) ?? lockers[0];

  const handleConfirmOrder = () => {
    setErrorMessage(null);

    if (product.isDemo) {
      setErrorMessage(
        "Đây là sản phẩm mẫu (Mock Data) dùng để trình diễn giao diện. Vui lòng chọn sản phẩm thật từ cơ sở dữ liệu hoặc đăng sản phẩm mới tại trang Đăng bán để tạo đơn hàng thật.",
      );
      return;
    }

    startTransition(async () => {
      const result = await createOrderAction(product.id, selectedLockerId);
      if (!result.success || !result.orderId) {
        setErrorMessage(
          result.error ?? "Không thể tạo đơn hàng. Vui lòng thử lại.",
        );
        router.refresh();
        return;
      }

      router.push(`/orders/${result.orderId}`);
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left Column: Product Summary, Locker Station & 5-Step Flow (7 cols) */}
      <div className="space-y-6 lg:col-span-7">
        {/* Product Card */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <h2 className="text-base font-extrabold text-brand-navy">
              1. Thông tin sản phẩm đặt mua
            </h2>
            <Badge variant="default">{product.categoryName}</Badge>
          </div>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <div className="relative aspect-[4/3] w-full shrink-0 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 sm:w-40">
              <Image
                src={product.thumbnailUrl}
                alt={product.title}
                fill
                sizes="160px"
                className="object-cover"
              />
            </div>

            <div className="min-w-0 flex-1">
              <Link
                href={`/products/${product.slug}`}
                className="text-lg font-extrabold text-brand-navy hover:text-brand-blue"
              >
                {product.title}
              </Link>

              <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 font-semibold text-slate-700">
                  Tình trạng: {product.conditionLabel} ({product.conditionPercent}
                  %)
                </span>
                <span className="inline-flex items-center gap-1 rounded-lg bg-brand-blue-light px-2.5 py-1 font-semibold text-brand-blue">
                  <GraduationCap className="h-3.5 w-3.5" />
                  {product.universityName} • {product.cohort}
                </span>
              </div>

              <div className="mt-3 flex items-center gap-2 text-xs text-slate-600">
                <User className="h-3.5 w-3.5 text-brand-blue" />
                <span>
                  Người bán:{" "}
                  <strong className="text-brand-navy">
                    {product.seller.fullName}
                  </strong>{" "}
                  ({product.seller.majorName} – {product.seller.cohort})
                </span>
              </div>

              <p className="mt-3 text-xl font-extrabold text-brand-blue">
                {formatVND(product.price)}
              </p>
            </div>
          </div>
        </section>

        {/* Smart Locker Station Selector */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <h2 className="flex items-center gap-2 text-base font-extrabold text-brand-navy">
                <Box className="h-5 w-5 text-brand-blue" />
                2. Điểm trạm Smart Locker dự kiến nhận hàng
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Vị trí đề xuất / Trạm Demo phục vụ mô phỏng giao nhận nội khu
                Campus
              </p>
            </div>
            <Badge variant="warning">Smart Locker Simulator</Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {lockers.map((station) => {
              const isSelected = station.id === selectedLockerId;
              return (
                <button
                  key={station.id}
                  type="button"
                  onClick={() => setSelectedLockerId(station.id)}
                  className={`flex flex-col justify-between rounded-2xl border-2 p-4 text-left transition-all ${
                    isSelected
                      ? "border-brand-blue bg-brand-blue-light/40 ring-2 ring-brand-blue/15"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">
                        {station.code} • Trạm Demo
                      </span>
                      <Badge
                        variant={
                          station.availableCompartments > 0 ? "eco" : "warning"
                        }
                      >
                        Trống {station.availableCompartments}/
                        {station.totalCompartments} ngăn
                      </Badge>
                    </div>
                    <p className="mt-1.5 text-sm font-extrabold text-brand-navy">
                      {station.name}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-600">
                      <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-green" />
                      Vị trí đề xuất: {station.campusArea}
                    </p>
                  </div>
                  <p className="mt-2.5 flex items-center gap-1 border-t border-slate-200/70 pt-2 text-[11px] font-medium text-slate-500">
                    <Clock className="h-3 w-3 text-brand-blue" />
                    {station.operatingHours}
                  </p>
                </button>
              );
            })}
          </div>

          {selectedStation && (
            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-50 p-3.5 text-xs text-slate-600">
              <p className="font-bold text-brand-navy">
                Trạm đã chọn: {selectedStation.name} (Vị trí đề xuất / Demo)
              </p>
              <p className="mt-1">
                Khi người bán bấm <strong>Xác nhận đơn</strong>, hệ thống sẽ tự
                động giữ 1 ngăn tủ trống tại trạm này để người bán gửi sản phẩm
                và cấp mã OTP 6 số cho bạn.
              </p>
            </div>
          )}
        </section>

        {/* 5-Step Delivery Process */}
        <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-extrabold text-brand-navy">
            <ShieldCheck className="h-5 w-5 text-brand-green" />
            3. Quy trình giao nhận qua Smart Locker Simulator
          </h2>
          <ol className="mt-4 space-y-2.5 text-xs leading-relaxed text-slate-700">
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
                1
              </span>
              <span>
                <strong>Tạo đơn &amp; Tạm giữ thanh toán mô phỏng:</strong> Sản
                phẩm chuyển sang trạng thái <code className="font-mono">RESERVED</code>,
                khoản tiền ở trạng thái <code className="font-mono">HELD_DEMO</code>.
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
                2
              </span>
              <span>
                <strong>Người bán xác nhận &amp; Cấp ngăn tủ:</strong> Hệ thống
                cấp ngăn tủ trống (<code className="font-mono">AWAITING_DROPOFF</code>).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
                3
              </span>
              <span>
                <strong>Người bán gửi hàng &amp; Tạo mã OTP:</strong> Ngăn tủ
                chuyển sang <code className="font-mono">OCCUPIED</code>, hệ
                thống sinh mã OTP 6 số một lần (<code className="font-mono">READY_FOR_PICKUP</code>).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-blue text-[11px] font-bold text-white">
                4
              </span>
              <span>
                <strong>Mở Smart Locker Simulator &amp; Nhận hàng:</strong> Bạn
                nhập mã OTP để mở cửa tủ và lấy sản phẩm (<code className="font-mono">PICKED_UP</code>).
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green text-[11px] font-bold text-white">
                5
              </span>
              <span>
                <strong>Xác nhận hoàn tất:</strong> Sau khi kiểm tra đúng mô tả,
                bạn bấm hoàn tất để giải ngân mô phỏng (<code className="font-mono">RELEASED_DEMO</code>).
              </span>
            </li>
          </ol>
        </section>
      </div>

      {/* Right Column: Payment Simulator & Order Confirmation CTA (5 cols) */}
      <div className="lg:col-span-5">
        <div className="sticky top-24 rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-7">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <h2 className="flex items-center gap-2 text-lg font-extrabold text-brand-navy">
              <CreditCard className="h-5 w-5 text-brand-blue" />
              Chi tiết thanh toán
            </h2>
            <Badge variant="warning" className="gap-1">
              <Sparkles className="h-3 w-3" />
              Payment Simulator
            </Badge>
          </div>

          {/* Transparent Payment Simulator Notice */}
          <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/90 p-3.5 text-xs leading-relaxed text-amber-950">
            <p className="font-extrabold">
              Mô phỏng thanh toán – Không phải giao dịch tài chính thật
            </p>
            <p className="mt-1 text-amber-900">
              Hệ thống không thu tiền thật, không kết nối cổng thanh toán và
              không lưu thông tin thẻ ngân hàng. Khoản tiền của đơn hàng sẽ được
              ghi nhận ở trạng thái mô phỏng{" "}
              <strong className="font-mono">HELD_DEMO</strong>.
            </p>
          </div>

          <div className="mt-5 space-y-3 text-sm">
            <div className="flex items-center justify-between text-slate-600">
              <span>Giá sản phẩm</span>
              <span className="font-bold text-slate-900">
                {formatVND(product.price)}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-600">
              <span>Phí sử dụng trạm Smart Locker (Demo)</span>
              <span className="font-bold text-brand-green">0 ₫ (Miễn phí)</span>
            </div>
            <div className="border-t border-slate-200 pt-3">
              <div className="flex items-baseline justify-between">
                <span className="text-base font-extrabold text-brand-navy">
                  Tổng thanh toán (Mô phỏng)
                </span>
                <span className="text-2xl font-extrabold text-brand-blue">
                  {formatVND(product.price)}
                </span>
              </div>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-semibold text-rose-700"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isOwnProduct ? (
            <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs text-amber-900">
              <p className="font-bold">
                Bạn là người đăng bán sản phẩm này nên không thể tự đặt mua.
              </p>
              <div className="mt-3 flex gap-2">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/my-products">Quản lý sản phẩm của tôi</Link>
                </Button>
              </div>
            </div>
          ) : !isAvailable ? (
            <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-900">
              <p className="font-bold">
                {product.status === "RESERVED"
                  ? "Sản phẩm vừa được người khác đặt mua."
                  : product.status === "SOLD"
                    ? "Sản phẩm này đã được bán."
                    : "Sản phẩm hiện không khả dụng để đặt mua."}
              </p>
              <div className="mt-3">
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href="/products">Khám phá sản phẩm khác</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <Button
                type="button"
                size="lg"
                disabled={isPending}
                onClick={handleConfirmOrder}
                className="h-12 w-full text-base font-extrabold"
              >
                <ShoppingBag className="h-5 w-5" />
                <span>
                  {isPending
                    ? "Đang khởi tạo đơn hàng..."
                    : "Xác nhận đặt mua"}
                </span>
              </Button>

              <p className="flex items-center justify-center gap-1.5 text-center text-[11px] text-slate-500">
                <CheckCircle2 className="h-3.5 w-3.5 text-brand-green" />
                Bạn có thể hủy đơn miễn phí trước khi người bán gửi hàng vào tủ.
              </p>
            </div>
          )}

          <div className="mt-4 border-t border-slate-100 pt-4 text-center">
            <Link
              href={`/products/${product.slug}`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-blue"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại trang chi tiết sản phẩm
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

