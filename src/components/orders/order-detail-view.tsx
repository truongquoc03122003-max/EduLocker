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
  Copy,
  CreditCard,
  Flag,
  KeyRound,
  LockOpen,
  MapPin,
  PackageCheck,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  User,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { OrderReviewSection } from "@/components/orders/order-review-form";
import {
  cancelOrderAction,
  completeOrderAction,
  confirmPickupOrderAction,
  openDisputeOrderAction,
  regenerateLockerOtpAction,
  sellerConfirmOrderAction,
  sellerDropoffOrderAction,
} from "@/features/orders/order-actions";
import {
  canCancelOrder,
  canOpenDispute,
  canRegenerateLockerOtp,
  getOrderEventLabel,
  getOrderStatusMeta,
  getPaymentStatusMeta,
} from "@/features/orders/order-state-machine";
import { cn, formatRelativeTimeVi, formatVND } from "@/lib/utils";
import type { LockerLocation, OrderDetailData } from "@/types";

interface OrderDetailViewProps {
  order: OrderDetailData;
  currentUserId: string;
  lockers: LockerLocation[];
}

export function OrderDetailView({
  order,
  currentUserId,
  lockers,
}: OrderDetailViewProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isBuyer = order.buyerId === currentUserId;
  const isSeller = order.sellerId === currentUserId;

  const [selectedLockerId, setSelectedLockerId] = useState<string>(
    order.lockerLocationId || lockers[0]?.id || "locker-thu-vien",
  );
  const [confirmedReceived, setConfirmedReceived] = useState(false);
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const statusMeta = getOrderStatusMeta(order.status);
  const paymentMeta = getPaymentStatusMeta(order.paymentStatus);

  const handleSellerConfirm = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await sellerConfirmOrderAction(order.id, selectedLockerId);
      if (!res.success) {
        setErrorMessage(res.error ?? "Không thể xác nhận đơn hàng.");
        return;
      }
      setSuccessMessage(
        res.compartmentCode
          ? `Đã xác nhận đơn và cấp ngăn tủ ${res.compartmentCode} thành công!`
          : "Đã xác nhận đơn hàng thành công!",
      );
      router.refresh();
    });
  };

  const handleSellerDropoff = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await sellerDropoffOrderAction(order.id);
      if (!res.success) {
        setErrorMessage(res.error ?? "Không thể mô phỏng gửi hàng vào tủ.");
        return;
      }
      setSuccessMessage(
        "Đã mô phỏng gửi hàng vào Smart Locker thành công! Mã OTP một lần đã được tạo cho người mua.",
      );
      router.refresh();
    });
  };

  const handleConfirmPickup = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await confirmPickupOrderAction(order.id);
      if (!res.success) {
        setErrorMessage(res.error ?? "Không thể xác nhận lấy hàng.");
        return;
      }
      setSuccessMessage(
        "Đã xác nhận lấy sản phẩm khỏi ngăn tủ! Ngăn tủ đã được giải phóng về trạng thái Trống (AVAILABLE).",
      );
      router.refresh();
    });
  };

  const handleCompleteOrder = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await completeOrderAction(order.id, confirmedReceived);
      if (!res.success) {
        setErrorMessage(res.error ?? "Không thể hoàn tất đơn hàng.");
        return;
      }
      setSuccessMessage(
        "Giao dịch đã hoàn tất! Khoản thanh toán mô phỏng đã được giải ngân cho người bán.",
      );
      router.refresh();
    });
  };

  const handleCancelOrder = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await cancelOrderAction(
        order.id,
        isBuyer ? "Người mua hủy đơn hàng" : "Người bán hủy đơn hàng",
      );
      if (!res.success) {
        setErrorMessage(res.error ?? "Không thể hủy đơn hàng.");
        return;
      }
      setSuccessMessage(
        "Đơn hàng đã được hủy. Sản phẩm và ngăn tủ (nếu có) đã được giải phóng.",
      );
      router.refresh();
    });
  };

  const handleRegenerateOtp = () => {
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await regenerateLockerOtpAction(order.id);
      if (!res.success) {
        setErrorMessage(res.error ?? "Không thể tạo mã OTP mới.");
        return;
      }
      setSuccessMessage(
        "Đã tạo mã OTP mới (hiệu lực 30 phút, tối đa 5 lần thử). Mã cũ đã bị vô hiệu hóa.",
      );
      router.refresh();
    });
  };

  const handleOpenDispute = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    startTransition(async () => {
      const res = await openDisputeOrderAction(order.id, disputeReason);
      if (!res.success) {
        setErrorMessage(res.error ?? "Không thể gửi báo cáo khiếu nại.");
        return;
      }
      setShowDisputeForm(false);
      setSuccessMessage(
        "Đã ghi nhận báo cáo sản phẩm không đúng mô tả. Khoản thanh toán mô phỏng tiếp tục được tạm giữ (HELD_DEMO).",
      );
      router.refresh();
    });
  };

  const handleCopyDemoOtp = (otp: string) => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(otp).catch(() => {});
      setSuccessMessage(`Đã sao chép mã OTP Demo: ${otp}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Status Banner */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <span className="font-mono font-bold text-brand-navy">
                Mã đơn: #{order.id.slice(0, 8).toUpperCase()}
              </span>
              <span>•</span>
              <Badge variant="outline">
                {isBuyer ? "Vai trò: Người mua" : "Vai trò: Người bán"}
              </Badge>
              <span>•</span>
              <span className="inline-flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                Tạo {formatRelativeTimeVi(order.createdAt)}
              </span>
            </div>

            <h1 className="mt-2 text-xl font-extrabold text-brand-navy sm:text-2xl">
              {statusMeta.label}
            </h1>
            <p className="mt-1 text-xs leading-relaxed text-slate-600 sm:text-sm">
              {statusMeta.shortDesc}
            </p>
          </div>

          <span
            className={cn(
              "rounded-full border px-4 py-1.5 text-xs font-extrabold sm:text-sm",
              statusMeta.badgeClass,
            )}
          >
            {statusMeta.label} ({order.status})
          </span>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-4 flex items-start gap-2 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {successMessage && (
          <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Workflow Actions, OTP Demo Panel & Timeline (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Interactive Workflow Action Card */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-brand-navy">
                <PackageCheck className="h-5 w-5 text-brand-blue" />
                Thao tác quy trình giao dịch
              </h2>
              <Badge variant="default">Bước hiện tại: {order.status}</Badge>
            </div>

            {/* 1. SELLER AT PENDING: Confirm Order + Select Locker */}
            {isSeller && order.status === "PENDING" && (
              <div className="mt-4 space-y-4">
                <p className="text-xs leading-relaxed text-slate-600 sm:text-sm">
                  Người mua <strong>{order.buyer.fullName}</strong> đã đặt mua
                  sản phẩm. Hãy chọn trạm Smart Locker để hệ thống giữ 1 ngăn tủ
                  trống cho bạn gửi hàng:
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {lockers.map((station) => {
                    const isSelected = station.id === selectedLockerId;
                    return (
                      <button
                        key={station.id}
                        type="button"
                        onClick={() => setSelectedLockerId(station.id)}
                        className={`rounded-2xl border-2 p-3.5 text-left transition-all ${
                          isSelected
                            ? "border-brand-blue bg-brand-blue-light/40"
                            : "border-slate-200 bg-white hover:border-slate-300"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-extrabold text-brand-blue">
                            {station.code} • Vị trí đề xuất / Demo
                          </span>
                          <Badge
                            variant={
                              station.availableCompartments > 0
                                ? "eco"
                                : "warning"
                            }
                          >
                            Trống {station.availableCompartments}/
                            {station.totalCompartments}
                          </Badge>
                        </div>
                        <p className="mt-1 text-sm font-bold text-brand-navy">
                          {station.name}
                        </p>
                      </button>
                    );
                  })}
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    type="button"
                    size="lg"
                    disabled={isPending}
                    onClick={handleSellerConfirm}
                    className="min-h-11 flex-1 sm:flex-none"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span>
                      {isPending ? "Đang xác nhận & cấp ngăn..." : "Xác nhận đơn"}
                    </span>
                  </Button>
                </div>
              </div>
            )}

            {/* 2. BUYER AT PENDING: Waiting for Seller Confirmation */}
            {isBuyer && order.status === "PENDING" && (
              <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs leading-relaxed text-amber-900 sm:text-sm">
                <p className="font-bold">
                  Đang chờ người bán ({order.seller.fullName}) xác nhận đơn hàng.
                </p>
                <p className="mt-1">
                  Ngay khi người bán xác nhận, hệ thống sẽ giữ 1 ngăn tủ tại{" "}
                  <strong>{order.lockerLocationName}</strong>.
                </p>
              </div>
            )}

            {/* 3. SELLER AT AWAITING_DROPOFF: Simulate Drop-off */}
            {isSeller && order.status === "AWAITING_DROPOFF" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-blue-200 bg-brand-blue-light/50 p-4 text-xs leading-relaxed text-slate-700 sm:text-sm">
                  <p className="font-extrabold text-brand-navy">
                    Hệ thống đã cấp ngăn tủ:{" "}
                    <span className="rounded-lg bg-brand-blue px-2 py-0.5 font-mono text-white">
                      {order.lockerCompartmentCode ?? "A01"}
                    </span>{" "}
                    tại {order.lockerLocationName} (Vị trí đề xuất / Demo)
                  </p>
                  <p className="mt-1.5">
                    Nhấn nút bên dưới để mô phỏng thao tác đặt sản phẩm vào ngăn
                    tủ và đóng cửa tủ. Hệ thống sẽ chuyển ngăn sang trạng thái{" "}
                    <code className="font-mono">OCCUPIED</code> và tạo mã OTP 6
                    số cho người mua.
                  </p>
                </div>

                <Button
                  type="button"
                  size="lg"
                  disabled={isPending}
                  onClick={handleSellerDropoff}
                  className="min-h-11 w-full sm:w-auto"
                >
                  <Box className="h-4 w-4" />
                  <span>
                    {isPending
                      ? "Đang gửi hàng & tạo OTP..."
                      : "Mô phỏng gửi hàng vào Locker"}
                  </span>
                </Button>
              </div>
            )}

            {/* 4. BUYER AT AWAITING_DROPOFF */}
            {isBuyer && order.status === "AWAITING_DROPOFF" && (
              <div className="mt-4 rounded-2xl border border-blue-200 bg-brand-blue-light/40 p-4 text-xs leading-relaxed text-slate-700 sm:text-sm">
                <p className="font-bold text-brand-navy">
                  Đã cấp ngăn Locker{" "}
                  <span className="font-mono font-extrabold text-brand-blue">
                    {order.lockerCompartmentCode}
                  </span>{" "}
                  tại {order.lockerLocationName}.
                </p>
                <p className="mt-1">
                  Đang chờ người bán mang sản phẩm gửi vào ngăn tủ. Khi người bán
                  gửi xong, mã OTP mở tủ sẽ hiển thị tại đây.
                </p>
              </div>
            )}

            {/* 5. BUYER AT READY_FOR_PICKUP: Demo OTP + Open Smart Locker Simulator */}
            {isBuyer && order.status === "READY_FOR_PICKUP" && (
              <div className="mt-4 space-y-4">
                {/* Demo OTP Delivery Panel (Section 20) */}
                {order.demoOtpInfo && (
                  <div className="rounded-2xl border-2 border-brand-blue/30 bg-brand-blue-light/50 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-sm font-extrabold text-brand-navy">
                        <KeyRound className="h-4 w-4 text-brand-blue" />
                        Mã OTP Demo
                      </span>
                      <Badge variant="warning" className="gap-1">
                        <Sparkles className="h-3 w-3" />
                        Chỉ dành cho môi trường trình diễn
                      </Badge>
                    </div>

                    {order.demoOtpInfo.available && order.demoOtpInfo.demoOtp ? (
                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-white p-3.5">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                            Mã mở khóa 1 lần cho ngăn{" "}
                            {order.lockerCompartmentCode}
                          </p>
                          <p
                            data-testid="demo-otp-code"
                            className="mt-0.5 font-mono text-2xl font-extrabold tracking-[0.25em] text-brand-blue"
                          >
                            {order.demoOtpInfo.demoOtp}
                          </p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            Số lần thử sai:{" "}
                            {order.demoOtpInfo.attemptCount ?? 0}/
                            {order.demoOtpInfo.maxAttempts ?? 5} • Hiệu lực 30
                            phút
                          </p>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            handleCopyDemoOtp(order.demoOtpInfo!.demoOtp!)
                          }
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Sao chép OTP</span>
                        </Button>
                      </div>
                    ) : order.isLockerUnlockedByOtp ? (
                      <p className="mt-2 text-xs font-bold text-emerald-800">
                        Mã OTP đã được xác thực thành công — Cửa ngăn{" "}
                        {order.lockerCompartmentCode} đang mở (OPEN).
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        <p className="text-xs font-semibold text-rose-700">
                          Mã OTP hiện không khả dụng (đã hết hạn hoặc vượt quá 5
                          lần nhập sai). Sản phẩm vẫn nằm an toàn trong ngăn tủ.
                        </p>
                        {canRegenerateLockerOtp({
                          status: order.status,
                          compartmentStatus: order.lockerCompartmentStatus,
                          otpReason: order.demoOtpInfo.reason,
                          isUnlocked: order.isLockerUnlockedByOtp,
                        }) && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={handleRegenerateOtp}
                          >
                            <RefreshCw className="h-3.5 w-3.5" />
                            <span>Tạo mã OTP mới</span>
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    asChild
                    size="lg"
                    className="min-h-11 flex-1 sm:flex-none"
                  >
                    <Link
                      href={`/lockers/${order.lockerLocationId ?? "locker-thu-vien"}?orderId=${order.id}`}
                    >
                      <LockOpen className="h-4 w-4" />
                      <span>Mở Smart Locker</span>
                    </Link>
                  </Button>

                  {order.isLockerUnlockedByOtp && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="lg"
                      disabled={isPending}
                      onClick={handleConfirmPickup}
                      className="min-h-11 flex-1 sm:flex-none"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {isPending
                          ? "Đang xác nhận lấy hàng..."
                          : "Tôi đã lấy sản phẩm"}
                      </span>
                    </Button>
                  )}
                </div>
              </div>
            )}

            {/* 6. SELLER AT READY_FOR_PICKUP */}
            {isSeller && order.status === "READY_FOR_PICKUP" && (
              <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs leading-relaxed text-emerald-900 sm:text-sm">
                <p className="font-bold">
                  Sản phẩm đã nằm trong ngăn {order.lockerCompartmentCode} tại{" "}
                  {order.lockerLocationName}.
                </p>
                <p className="mt-1">
                  Hệ thống đã cấp mã OTP một lần cho người mua. Đang chờ người
                  mua đến mở tủ và nhận hàng.
                </p>
              </div>
            )}

            {/* 7. BUYER AT PICKED_UP: Complete Order or Open Dispute */}
            {isBuyer && order.status === "PICKED_UP" && (
              <div className="mt-4 space-y-4">
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4">
                  <h3 className="text-sm font-extrabold text-brand-navy">
                    Xác nhận sản phẩm đã nhận
                  </h3>
                  <p className="mt-1 text-xs leading-relaxed text-slate-600">
                    Bạn đã lấy sản phẩm từ ngăn tủ Smart Locker. Hãy kiểm tra
                    tình trạng thực tế và đánh dấu xác nhận bên dưới để hoàn tất
                    giao dịch:
                  </p>

                  <label className="mt-3 flex cursor-pointer items-center gap-2.5 rounded-xl border border-emerald-300/80 bg-white p-3 text-xs font-bold text-brand-navy sm:text-sm">
                    <input
                      type="checkbox"
                      checked={confirmedReceived}
                      onChange={(e) => setConfirmedReceived(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-brand-blue focus:ring-brand-blue"
                    />
                    <span>Tôi xác nhận đã nhận sản phẩm</span>
                  </label>

                  <div className="mt-4 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      size="lg"
                      disabled={isPending || !confirmedReceived}
                      onClick={handleCompleteOrder}
                      className="min-h-11 flex-1 sm:flex-none"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      <span>
                        {isPending
                          ? "Đang hoàn tất giao dịch..."
                          : "Hoàn tất giao dịch"}
                      </span>
                    </Button>

                    {canOpenDispute(order.status) && (
                      <Button
                        type="button"
                        variant="outline"
                        size="lg"
                        disabled={isPending}
                        onClick={() => setShowDisputeForm((prev) => !prev)}
                        className="min-h-11 border-rose-200 text-rose-700 hover:bg-rose-50"
                      >
                        <Flag className="h-4 w-4" />
                        <span>Báo sản phẩm không đúng mô tả</span>
                      </Button>
                    )}
                  </div>
                </div>

                {showDisputeForm && (
                  <form
                    onSubmit={handleOpenDispute}
                    className="rounded-2xl border border-rose-200 bg-rose-50/70 p-4 space-y-3"
                  >
                    <p className="text-xs font-extrabold text-rose-900">
                      Báo cáo sản phẩm không đúng mô tả (Khoản thanh toán mô
                      phỏng sẽ tiếp tục giữ ở trạng thái HELD_DEMO)
                    </p>
                    <textarea
                      rows={3}
                      required
                      minLength={10}
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                      placeholder="Mô tả chi tiết điểm không đúng mô tả (tối thiểu 10 ký tự)..."
                      className="w-full rounded-xl border border-rose-200 bg-white p-3 text-xs text-slate-800 focus:border-rose-400 focus:outline-none"
                    />
                    <div className="flex justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDisputeForm(false)}
                      >
                        Đóng
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isPending}
                        className="bg-rose-600 hover:bg-rose-700"
                      >
                        Gửi báo cáo khiếu nại
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* 8. SELLER AT PICKED_UP */}
            {isSeller && order.status === "PICKED_UP" && (
              <div className="mt-4 rounded-2xl border border-sky-200 bg-sky-50/70 p-4 text-xs leading-relaxed text-sky-900 sm:text-sm">
                <p className="font-bold">
                  Người mua đã mở tủ và lấy sản phẩm ra khỏi ngăn{" "}
                  {order.lockerCompartmentCode}.
                </p>
                <p className="mt-1">
                  Đang chờ người mua xác nhận hoàn tất giao dịch để giải ngân
                  khoản thanh toán mô phỏng (<code className="font-mono">RELEASED_DEMO</code>).
                </p>
              </div>
            )}

            {/* 9. COMPLETED / CANCELLED / EXPIRED / DISPUTED SUMMARY */}
            {order.status === "COMPLETED" && (
              <>
                <div className="mt-4 rounded-2xl border border-emerald-300 bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-900 sm:text-sm">
                  <p className="font-extrabold">
                    Giao dịch đã hoàn tất thành công!
                  </p>
                  <p className="mt-1">
                    Sản phẩm đã chuyển sang trạng thái <strong>SOLD</strong>, ngăn
                    tủ đã giải phóng về <strong>AVAILABLE</strong> và khoản thanh
                    toán mô phỏng đã chuyển sang{" "}
                    <strong>RELEASED_DEMO (Đã giải ngân cho người bán)</strong>.
                  </p>
                </div>
                <OrderReviewSection
                  orderId={order.id}
                  isBuyer={isBuyer}
                  existingReview={order.review}
                />
              </>
            )}

            {order.status === "DISPUTED" && (
              <div className="mt-4 rounded-2xl border border-rose-300 bg-rose-50 p-4 text-xs leading-relaxed text-rose-900 sm:text-sm">
                <p className="flex items-center gap-1.5 font-extrabold">
                  <ShieldAlert className="h-4 w-4 text-rose-600" />
                  Đơn hàng đang trong trạng thái khiếu nại (DISPUTED)
                </p>
                {order.disputeReason && (
                  <p className="mt-1">
                    <strong>Lý do người mua báo cáo:</strong>{" "}
                    {order.disputeReason}
                  </p>
                )}
                <p className="mt-1">
                  Khoản thanh toán mô phỏng vẫn đang được giữ an toàn ở trạng
                  thái <code className="font-mono font-bold">HELD_DEMO</code>{" "}
                  (không tự động giải ngân).
                </p>
              </div>
            )}

            {/* Cancel Button for PENDING, SELLER_CONFIRMED, AWAITING_DROPOFF */}
            {canCancelOrder(order.status) && (
              <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                <span className="text-xs text-slate-500">
                  Có thể hủy đơn trước khi người bán gửi sản phẩm vào tủ.
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={isPending}
                  onClick={handleCancelOrder}
                  className="border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Hủy đơn hàng</span>
                </Button>
              </div>
            )}
          </section>

          {/* Real Order Events Timeline (Section 11) */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-brand-navy">
                <Clock className="h-5 w-5 text-brand-blue" />
                Nhật ký tiến trình đơn hàng (Timeline thực tế)
              </h2>
              <Badge variant="outline">{order.events.length} sự kiện</Badge>
            </div>

            <ol className="mt-5 space-y-4">
              {order.events.map((ev, idx) => {
                const labelMeta = getOrderEventLabel(ev.eventType, ev.metadata);
                const isLatest = idx === order.events.length - 1;
                return (
                  <li key={ev.id} className="relative flex gap-3.5">
                    <div className="flex flex-col items-center">
                      <span
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-extrabold",
                          isLatest
                            ? "bg-brand-blue text-white ring-4 ring-brand-blue/15"
                            : "bg-emerald-100 text-emerald-800",
                        )}
                      >
                        {idx + 1}
                      </span>
                      {idx < order.events.length - 1 && (
                        <span className="mt-1 h-full w-0.5 bg-slate-200" />
                      )}
                    </div>

                    <div className="pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-extrabold text-brand-navy">
                          {labelMeta.title}
                        </p>
                        <span className="text-[11px] font-medium text-slate-400">
                          {new Date(ev.createdAt).toLocaleString("vi-VN")}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                        {labelMeta.subtitle}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {/* Right Column: Product, Counterparties, Smart Locker & Payment Simulator (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Payment Simulator Card (Sections 26, 27) */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-brand-navy">
                <CreditCard className="h-5 w-5 text-brand-blue" />
                Thanh toán mô phỏng
              </h2>
              <Badge variant="warning">Payment Simulator</Badge>
            </div>

            <div className="mt-4 rounded-2xl border border-amber-300 bg-amber-50/90 p-3 text-xs font-bold text-amber-950">
              Mô phỏng thanh toán – Không phải giao dịch tài chính thật
            </div>

            <div className="mt-4 space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Giá sản phẩm:</span>
                <span className="font-extrabold text-brand-navy">
                  {formatVND(order.productPrice)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Tổng thanh toán (Demo):</span>
                <span className="text-lg font-extrabold text-brand-blue">
                  {formatVND(order.totalAmount)}
                </span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-600">Trạng thái:</span>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-extrabold",
                    paymentMeta.badgeClass,
                  )}
                >
                  {paymentMeta.label}
                </span>
              </div>
            </div>

            <p className="mt-3 border-t border-slate-100 pt-3 text-xs leading-relaxed text-slate-600">
              {paymentMeta.description}
            </p>
          </section>

          {/* Smart Locker Info Card */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
              <h2 className="flex items-center gap-2 text-base font-extrabold text-brand-navy">
                <Box className="h-5 w-5 text-brand-blue" />
                Trạm Smart Locker &amp; Ngăn tủ
              </h2>
              <Badge variant="secondary">Vị trí đề xuất / Demo</Badge>
            </div>

            <div className="mt-4 space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between">
                <span className="text-slate-600">Trạm giao nhận:</span>
                <span className="font-bold text-brand-navy">
                  {order.lockerLocationName ?? "Trạm Smart Locker Demo"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Ngăn tủ được cấp:</span>
                {order.lockerCompartmentCode ? (
                  <span className="rounded-lg bg-brand-blue px-2.5 py-0.5 font-mono text-xs font-extrabold text-white">
                    Ngăn {order.lockerCompartmentCode} (Cỡ{" "}
                    {order.lockerCompartmentSize ?? "M"})
                  </span>
                ) : (
                  <span className="font-medium text-slate-500">
                    Chờ người bán xác nhận đơn
                  </span>
                )}
              </div>

              {order.lockerLocationId && (
                <div className="pt-2">
                  <Button
                    asChild
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    <Link
                      href={`/lockers/${order.lockerLocationId}?orderId=${order.id}`}
                    >
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Mở giao diện Smart Locker Simulator</span>
                    </Link>
                  </Button>
                </div>
              )}
            </div>
          </section>

          {/* Product & Participants Card */}
          <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <h2 className="border-b border-slate-100 pb-3 text-base font-extrabold text-brand-navy">
              Sản phẩm &amp; Sinh viên tham gia
            </h2>

            <div className="mt-4 flex gap-3.5">
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
                  href={`/products/${order.product.slug}`}
                  className="line-clamp-2 text-sm font-extrabold text-brand-navy hover:text-brand-blue"
                >
                  {order.product.title}
                </Link>
                <p className="mt-1 text-xs text-slate-500">
                  {order.product.categoryName} • Tình trạng:{" "}
                  {order.product.conditionLabel}
                </p>
                <Badge variant="outline" className="mt-1.5">
                  Trạng thái SP: {order.product.status}
                </Badge>
              </div>
            </div>

            <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <User className="h-3.5 w-3.5 text-brand-blue" />
                  Người bán:
                </span>
                <span className="font-bold text-brand-navy">
                  {order.seller.fullName} ({order.seller.cohort})
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <ShieldCheck className="h-3.5 w-3.5 text-brand-green" />
                  Người mua:
                </span>
                <span className="font-bold text-brand-navy">
                  {order.buyer.fullName} ({order.buyer.cohort})
                </span>
              </div>
            </div>
          </section>

          <div className="text-center">
            <Link
              href="/orders"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-brand-blue"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Quay lại danh sách đơn hàng
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

