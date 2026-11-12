"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Box,
  CheckCircle2,
  Copy,
  KeyRound,
  Lock,
  LockOpen,
  MapPin,
  PackageCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  confirmPickupOrderAction,
  sellerDropoffOrderAction,
  verifyLockerOtpAction,
} from "@/features/orders/order-actions";
import { cn, formatVND } from "@/lib/utils";
import type {
  LockerCompartmentStatus,
  LockerLocation,
  OrderDetailData,
} from "@/types";

interface SmartLockerSimulatorProps {
  station: LockerLocation;
  activeOrder: OrderDetailData | null;
  currentUserId: string | null;
}

function getCompartmentVisualMeta(
  status: LockerCompartmentStatus,
  isTempOpen: boolean,
) {
  if (isTempOpen) {
    return {
      statusCode: "OPEN",
      label: "OPEN • Đang mở cửa",
      boxClass:
        "border-emerald-500 bg-emerald-50 text-emerald-950 ring-4 ring-emerald-400/30 shadow-lg",
      doorClass: "-translate-x-[72%] -rotate-6 border-emerald-500 bg-emerald-600 text-white",
    };
  }
  switch (status) {
    case "AVAILABLE":
      return {
        statusCode: "CLOSED",
        label: "Trống (AVAILABLE)",
        boxClass: "border-emerald-300 bg-emerald-50/80 text-emerald-900",
        doorClass: "border-emerald-300 bg-white/90 text-emerald-900",
      };
    case "RESERVED":
      return {
        statusCode: "CLOSED",
        label: "Đã đặt (RESERVED)",
        boxClass: "border-blue-300 bg-blue-50/90 text-blue-900",
        doorClass: "border-blue-300 bg-blue-100/80 text-blue-900",
      };
    case "OCCUPIED":
      return {
        statusCode: "CLOSED",
        label: "Có hàng (OCCUPIED)",
        boxClass: "border-amber-300 bg-amber-50/90 text-amber-900",
        doorClass: "border-amber-400 bg-amber-100/90 text-amber-950",
      };
    case "MAINTENANCE":
      return {
        statusCode: "CLOSED",
        label: "Bảo trì (MAINTENANCE)",
        boxClass: "border-slate-300 bg-slate-100 text-slate-600",
        doorClass: "border-slate-300 bg-slate-200/80 text-slate-600",
      };
  }
}

export function SmartLockerSimulator({
  station,
  activeOrder,
  currentUserId,
}: SmartLockerSimulatorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isBuyer = Boolean(
    activeOrder && currentUserId && activeOrder.buyerId === currentUserId,
  );
  const isSeller = Boolean(
    activeOrder && currentUserId && activeOrder.sellerId === currentUserId,
  );

  const [otpInput, setOtpInput] = useState("");
  const [doorOpenByOtp, setDoorOpenByOtp] = useState<boolean>(
    Boolean(activeOrder?.isLockerUnlockedByOtp),
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const targetCompartmentId = activeOrder?.lockerCompartmentId ?? null;
  const targetCompartmentCode = activeOrder?.lockerCompartmentCode ?? null;

  const handleUnlockSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeOrder) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await verifyLockerOtpAction(activeOrder.id, otpInput);
      if (!res.success) {
        setErrorMessage(res.error ?? "Mã OTP không đúng.");
        router.refresh();
        return;
      }

      setDoorOpenByOtp(true);
      setSuccessMessage(
        `Ngăn ${targetCompartmentCode ?? "Locker"} đã mở! Vui lòng lấy sản phẩm và bấm "Tôi đã lấy sản phẩm".`,
      );
      router.refresh();
    });
  };

  const handleConfirmPickup = () => {
    if (!activeOrder) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await confirmPickupOrderAction(activeOrder.id);
      if (!res.success) {
        setErrorMessage(res.error ?? "Không thể xác nhận lấy sản phẩm.");
        return;
      }

      setDoorOpenByOtp(false);
      setSuccessMessage(
        `Đã lấy sản phẩm thành công! Ngăn ${targetCompartmentCode ?? ""} đã trở về trạng thái Trống (AVAILABLE). Đang chuyển về trang đơn hàng...`,
      );
      router.push(`/orders/${activeOrder.id}`);
      router.refresh();
    });
  };

  const handleSellerDropoffHere = () => {
    if (!activeOrder) return;
    setErrorMessage(null);
    setSuccessMessage(null);

    startTransition(async () => {
      const res = await sellerDropoffOrderAction(activeOrder.id);
      if (!res.success) {
        setErrorMessage(res.error ?? "Không thể mô phỏng gửi hàng vào tủ.");
        return;
      }

      setSuccessMessage(
        `Đã đặt sản phẩm vào ngăn ${targetCompartmentCode ?? ""}! Hệ thống đã tạo mã OTP cho người mua.`,
      );
      router.refresh();
    });
  };

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
      {/* Left: Visual Locker Cabinet Matrix + Legend (7 cols) */}
      <div className="space-y-6 lg:col-span-7">
        <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-extrabold uppercase tracking-wider text-brand-blue">
                  Mã trạm: {station.code}
                </span>
                <Badge variant="secondary">Vị trí đề xuất / Demo</Badge>
                <Badge variant="warning" className="gap-1">
                  <Sparkles className="h-3 w-3" />
                  Smart Locker Simulator
                </Badge>
              </div>
              <h1 className="mt-1.5 text-xl font-extrabold text-brand-navy sm:text-2xl">
                {station.name}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-green" />
                Vị trí đề xuất: {station.campusArea} ({station.address})
              </p>
            </div>

            <Badge variant="eco">
              Trống {station.availableCompartments}/{station.totalCompartments}{" "}
              ngăn
            </Badge>
          </div>

          {/* Status Legend (Section 22) */}
          <div className="mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs font-semibold">
            <span className="font-extrabold text-brand-navy">Chú giải:</span>
            <span className="inline-flex items-center gap-1.5 text-emerald-800">
              <span className="h-3 w-3 rounded-sm border border-emerald-400 bg-emerald-200" />
              Trống
            </span>
            <span className="inline-flex items-center gap-1.5 text-blue-800">
              <span className="h-3 w-3 rounded-sm border border-blue-400 bg-blue-200" />
              Đã đặt
            </span>
            <span className="inline-flex items-center gap-1.5 text-amber-800">
              <span className="h-3 w-3 rounded-sm border border-amber-400 bg-amber-200" />
              Có hàng
            </span>
            <span className="inline-flex items-center gap-1.5 text-slate-600">
              <span className="h-3 w-3 rounded-sm border border-slate-400 bg-slate-300" />
              Bảo trì
            </span>
          </div>

          {/* Locker Cabinet Hardware Frame */}
          <div className="mt-5 rounded-3xl border-4 border-brand-navy bg-slate-900 p-4 shadow-inner sm:p-5">
            <div className="mb-3 flex items-center justify-between px-1 text-[11px] font-bold uppercase tracking-wider text-slate-300">
              <span className="flex items-center gap-1.5">
                <Box className="h-3.5 w-3.5 text-brand-green" />
                Cụm tủ mô phỏng {station.code}
              </span>
              <span>{station.operatingHours}</span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
              {station.compartments.map((comp) => {
                const isTargetComp =
                  targetCompartmentId === comp.id ||
                  targetCompartmentCode === comp.code;
                const isTempOpen =
                  isTargetComp &&
                  doorOpenByOtp &&
                  activeOrder?.status === "READY_FOR_PICKUP";
                const meta = getCompartmentVisualMeta(comp.status, isTempOpen);

                return (
                  <div
                    key={comp.id}
                    data-testid={`compartment-${comp.code}`}
                    className={cn(
                      "relative min-h-[126px] overflow-hidden rounded-2xl border-2 p-3 transition-all duration-500",
                      meta.boxClass,
                      isTargetComp &&
                        !isTempOpen &&
                        "ring-4 ring-brand-blue/40",
                    )}
                  >
                    {/* Interior layer visible when door swings open */}
                    <div className="flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-lg font-extrabold">
                          {comp.code}
                        </span>
                        <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-800">
                          Cỡ {comp.size}
                        </span>
                      </div>

                      {isTempOpen ? (
                        <div className="my-2 rounded-xl bg-emerald-600/15 p-2 text-center">
                          <LockOpen className="mx-auto h-5 w-5 text-emerald-700" />
                          <p className="mt-1 font-mono text-xs font-extrabold text-emerald-900">
                            OPEN
                          </p>
                          <p className="text-[10px] font-bold text-emerald-800">
                            Cửa ngăn đang mở
                          </p>
                        </div>
                      ) : (
                        <div className="my-2 flex items-center justify-between">
                          <span className="inline-flex items-center gap-1 rounded-md bg-white/80 px-2 py-0.5 font-mono text-[11px] font-extrabold">
                            <Lock className="h-3 w-3" />
                            {meta.statusCode}
                          </span>
                          {isTargetComp && (
                            <Badge variant="default" className="text-[10px]">
                              Đơn của bạn
                            </Badge>
                          )}
                        </div>
                      )}

                      <div>
                        <p className="text-[11px] font-extrabold">
                          {meta.label}
                        </p>
                        <p className="line-clamp-1 text-[10px] opacity-80">
                          {comp.sizeLabel}
                        </p>
                      </div>
                    </div>

                    {/* Animated Door Overlay (CSS Transition) */}
                    <div
                      aria-hidden="true"
                      className={cn(
                        "pointer-events-none absolute inset-y-1 right-1 w-2 rounded-full transition-all duration-500",
                        isTempOpen ? "bg-emerald-500" : "bg-slate-400/50",
                      )}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </div>

      {/* Right: Interactive Terminal Kiosk Panel (5 cols) */}
      <div className="space-y-6 lg:col-span-5">
        <section className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-card sm:p-7">
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-extrabold uppercase tracking-wider text-brand-blue">
                Bảng điều khiển cảm ứng (Mô phỏng)
              </span>
              <h2 className="mt-0.5 text-lg font-extrabold text-brand-navy">
                Smart Locker Demo
              </h2>
            </div>
            <Badge variant="warning">Kiosk Simulator</Badge>
          </div>

          <div className="mt-4 space-y-2 rounded-2xl border border-slate-200/80 bg-slate-50 p-4 text-xs sm:text-sm">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Trạm:</span>
              <span className="font-extrabold text-brand-navy">
                {station.name} ({station.code})
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Ngăn:</span>
              <span className="font-mono font-extrabold text-brand-blue">
                {targetCompartmentCode ?? "Chưa chọn đơn hàng"}
              </span>
            </div>
            {activeOrder && (
              <div className="flex items-center justify-between border-t border-slate-200/70 pt-2">
                <span className="text-slate-600">Đơn hàng:</span>
                <Link
                  href={`/orders/${activeOrder.id}`}
                  className="font-mono font-bold text-brand-blue hover:underline"
                >
                  #{activeOrder.id.slice(0, 8).toUpperCase()} (
                  {formatVND(activeOrder.totalAmount)})
                </Link>
              </div>
            )}
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

          {successMessage && (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* CASE A: Active Order - Buyer Ready for Pickup */}
          {activeOrder &&
            isBuyer &&
            activeOrder.status === "READY_FOR_PICKUP" && (
              <div className="mt-5 space-y-4">
                {/* Demo OTP helper box if available */}
                {activeOrder.demoOtpInfo?.available &&
                  activeOrder.demoOtpInfo.demoOtp &&
                  !doorOpenByOtp && (
                    <div className="rounded-2xl border border-blue-200 bg-brand-blue-light/50 p-3.5 text-xs">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-extrabold text-brand-navy">
                          Mã OTP Demo
                        </span>
                        <Badge variant="warning" className="text-[10px]">
                          Chỉ dành cho môi trường trình diễn
                        </Badge>
                      </div>
                      <div className="mt-2 flex items-center justify-between rounded-xl bg-white px-3 py-2">
                        <span className="font-mono text-xl font-extrabold tracking-[0.2em] text-brand-blue">
                          {activeOrder.demoOtpInfo.demoOtp}
                        </span>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setOtpInput(activeOrder.demoOtpInfo!.demoOtp!);
                          }}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          <span>Điền nhanh OTP</span>
                        </Button>
                      </div>
                    </div>
                  )}

                {!doorOpenByOtp ? (
                  <form onSubmit={handleUnlockSubmit} className="space-y-4">
                    <div>
                      <label
                        htmlFor="locker-otp-input"
                        className="block text-xs font-extrabold uppercase tracking-wider text-brand-navy"
                      >
                        Nhập mã OTP (6 chữ số)
                      </label>
                      <Input
                        id="locker-otp-input"
                        type="text"
                        inputMode="numeric"
                        maxLength={6}
                        required
                        value={otpInput}
                        onChange={(e) =>
                          setOtpInput(e.target.value.replace(/\D/g, ""))
                        }
                        placeholder="______"
                        className="mt-1.5 h-12 text-center font-mono text-2xl font-extrabold tracking-[0.35em]"
                      />
                      <p className="mt-1.5 text-[11px] text-slate-500">
                        Mã OTP có hiệu lực một lần và bị khóa sau 5 lần nhập
                        sai.
                      </p>
                    </div>

                    <Button
                      type="submit"
                      size="lg"
                      disabled={isPending || otpInput.length !== 6}
                      className="h-12 w-full text-base font-extrabold"
                    >
                      <KeyRound className="h-5 w-5" />
                      <span>{isPending ? "Đang kiểm tra OTP..." : "Mở tủ"}</span>
                    </Button>
                  </form>
                ) : (
                  <div className="space-y-4 rounded-2xl border-2 border-emerald-400 bg-emerald-50 p-5 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-sm">
                      <LockOpen className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="text-lg font-extrabold text-emerald-950">
                        Ngăn {targetCompartmentCode ?? "Locker"} đã mở
                      </h3>
                      <p className="mt-1 text-xs leading-relaxed text-emerald-800">
                        Cửa ngăn tủ đang ở trạng thái <strong>OPEN</strong>. Hãy
                        lấy sản phẩm{" "}
                        <strong>&ldquo;{activeOrder.product.title}&rdquo;</strong>{" "}
                        ra khỏi ngăn tủ và bấm xác nhận bên dưới.
                      </p>
                    </div>

                    <Button
                      type="button"
                      size="lg"
                      disabled={isPending}
                      onClick={handleConfirmPickup}
                      className="h-12 w-full bg-brand-green text-base font-extrabold hover:bg-emerald-700"
                    >
                      <PackageCheck className="h-5 w-5" />
                      <span>
                        {isPending
                          ? "Đang cập nhật trạng thái tủ..."
                          : "Tôi đã lấy sản phẩm"}
                      </span>
                    </Button>
                  </div>
                )}
              </div>
            )}

          {/* CASE B: Active Order - Seller Awaiting Drop-off */}
          {activeOrder &&
            isSeller &&
            activeOrder.status === "AWAITING_DROPOFF" && (
              <div className="mt-5 space-y-4">
                <div className="rounded-2xl border border-blue-200 bg-brand-blue-light/50 p-4 text-xs leading-relaxed text-slate-700">
                  <p className="font-bold text-brand-navy">
                    Chế độ Người bán gửi hàng – Ngăn{" "}
                    {targetCompartmentCode ?? "A01"}
                  </p>
                  <p className="mt-1">
                    Nhấn nút bên dưới để mô phỏng đặt sản phẩm vào ngăn{" "}
                    <strong>{targetCompartmentCode}</strong> và tạo mã OTP cho
                    người mua.
                  </p>
                </div>

                <Button
                  type="button"
                  size="lg"
                  disabled={isPending}
                  onClick={handleSellerDropoffHere}
                  className="h-12 w-full text-base font-extrabold"
                >
                  <Box className="h-5 w-5" />
                  <span>
                    {isPending
                      ? "Đang gửi hàng & tạo OTP..."
                      : "Mô phỏng gửi hàng vào Locker"}
                  </span>
                </Button>
              </div>
            )}

          {/* CASE C: No Active Order or Order in another state */}
          {(!activeOrder ||
            (!isBuyer && !isSeller) ||
            (isBuyer && activeOrder.status !== "READY_FOR_PICKUP") ||
            (isSeller && activeOrder.status !== "AWAITING_DROPOFF")) && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-600">
              {activeOrder ? (
                <>
                  <p className="font-bold text-brand-navy">
                    Trạng thái đơn hàng hiện tại: {activeOrder.status}
                  </p>
                  <p className="mt-1">
                    {activeOrder.status === "PICKED_UP"
                      ? "Bạn đã lấy sản phẩm khỏi ngăn tủ. Vui lòng quay về trang chi tiết đơn hàng để bấm Hoàn tất giao dịch."
                      : "Thao tác mở tủ bằng mã OTP dành cho Người mua khi đơn hàng ở trạng thái Sẵn sàng nhận hàng (READY_FOR_PICKUP)."}
                  </p>
                  <div className="mt-3">
                    <Button asChild size="sm" className="w-full">
                      <Link href={`/orders/${activeOrder.id}`}>
                        <span>Quay về Chi tiết đơn hàng</span>
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <p className="font-bold text-brand-navy">
                    Hướng dẫn sử dụng Smart Locker Simulator
                  </p>
                  <p className="mt-1">
                    Để trải nghiệm mở ngăn tủ bằng mã OTP 6 số, hãy đặt mua một
                    sản phẩm trên Marketplace và bấm{" "}
                    <strong>&ldquo;Mở Smart Locker&rdquo;</strong> từ trang Chi
                    tiết đơn hàng sau khi người bán gửi hàng vào tủ.
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button asChild size="sm" variant="outline">
                      <Link href="/orders">Đơn hàng của tôi</Link>
                    </Button>
                    <Button asChild size="sm">
                      <Link href="/products">Khám phá sản phẩm</Link>
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}

          <div className="mt-5 border-t border-slate-100 pt-4 text-center">
            <Link
              href="/lockers"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-brand-blue"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Xem tất cả các trạm Smart Locker mô phỏng
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
