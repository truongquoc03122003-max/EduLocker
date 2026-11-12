import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  Clock,
  KeyRound,
  Lock,
  MapPin,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fetchLiveLockerLocations } from "@/features/orders/order-repository";
import type { LockerCompartmentStatus } from "@/types";

export const metadata: Metadata = {
  title: "Trạm Smart Locker Mô Phỏng – Định Hướng Đại Học Cần Thơ",
  description:
    "Khám phá sơ đồ ngăn tủ mô phỏng EduLocker – Ký túc xá A và EduLocker – Thư viện (vị trí đề xuất / Demo tại Khu II Đại học Cần Thơ).",
};

function getCompartmentBadge(status: LockerCompartmentStatus) {
  switch (status) {
    case "AVAILABLE":
      return {
        label: "AVAILABLE • Trống",
        className: "border-emerald-300 bg-emerald-50 text-emerald-800",
      };
    case "RESERVED":
      return {
        label: "RESERVED • Đã đặt",
        className: "border-blue-300 bg-blue-50 text-blue-800",
      };
    case "OCCUPIED":
      return {
        label: "OCCUPIED • Có hàng",
        className: "border-amber-300 bg-amber-50 text-amber-800",
      };
    case "MAINTENANCE":
      return {
        label: "MAINTENANCE • Bảo trì",
        className: "border-slate-300 bg-slate-100 text-slate-600",
      };
  }
}

export default async function LockersPage() {
  const lockers = await fetchLiveLockerLocations();

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs items={[{ label: "Hệ thống Smart Locker" }]} />

      {/* Header Banner */}
      <div className="mt-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1.5">
            <Box className="h-3.5 w-3.5" />
            Vị trí đề xuất / Demo: Ký túc xá A &amp; Trung tâm Học liệu
          </Badge>
          <Badge variant="warning" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" />
            Smart Locker Simulator – Mở khóa bằng mã OTP 1 lần
          </Badge>
        </div>

        <h1 className="mt-3 text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
          Trạm giao nhận thông minh EduLocker nội khu Campus (Simulator)
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
          Thay vì phải hẹn gặp trực tiếp ở cổng trường hay lo rủi ro chuyển
          khoản tiền cọc trên mạng xã hội, người bán gửi sản phẩm vào ngăn tủ{" "}
          <strong>EduLocker Simulator</strong> và người mua đến mở tủ bằng mã
          xác thực OTP 6 số.
        </p>

        {/* Legend (Section 22) */}
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3 text-xs font-semibold">
          <span className="font-extrabold text-brand-navy">
            Chú giải trạng thái ngăn tủ:
          </span>
          <span className="inline-flex items-center gap-1.5 text-emerald-800">
            <span className="h-3 w-3 rounded-sm border border-emerald-400 bg-emerald-200" />
            Trống (AVAILABLE)
          </span>
          <span className="inline-flex items-center gap-1.5 text-blue-800">
            <span className="h-3 w-3 rounded-sm border border-blue-400 bg-blue-200" />
            Đã đặt (RESERVED)
          </span>
          <span className="inline-flex items-center gap-1.5 text-amber-800">
            <span className="h-3 w-3 rounded-sm border border-amber-400 bg-amber-200" />
            Có hàng (OCCUPIED)
          </span>
          <span className="inline-flex items-center gap-1.5 text-slate-600">
            <span className="h-3 w-3 rounded-sm border border-slate-400 bg-slate-300" />
            Bảo trì (MAINTENANCE)
          </span>
        </div>
      </div>

      {/* Locker Stations Grid */}
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
        {lockers.map((station) => (
          <section
            key={station.id}
            aria-labelledby={`station-${station.id}`}
            className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm"
          >
            <div>
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-100 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                      Mã trạm: {station.code}
                    </span>
                    <Badge variant="outline">Vị trí đề xuất / Demo</Badge>
                  </div>
                  <h2
                    id={`station-${station.id}`}
                    className="mt-1 text-xl font-extrabold text-brand-navy"
                  >
                    {station.name}
                  </h2>
                  <p className="mt-1 flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <MapPin className="h-3.5 w-3.5 shrink-0 text-brand-green" />
                    Vị trí đề xuất: {station.campusArea}
                  </p>
                </div>

                <Badge variant="eco">
                  Còn {station.availableCompartments}/
                  {station.totalCompartments} ngăn trống
                </Badge>
              </div>

              <p className="mt-3 text-xs leading-relaxed text-slate-600">
                {station.description}
              </p>

              <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-brand-navy">
                <Clock className="h-3.5 w-3.5 text-brand-blue" />
                {station.operatingHours}
              </p>

              {/* Compartment Matrix */}
              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {station.compartments.map((comp) => {
                  const statusMeta = getCompartmentBadge(comp.status);
                  return (
                    <div
                      key={comp.id}
                      className={`flex flex-col justify-between rounded-2xl border-2 p-3.5 ${statusMeta.className}`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-lg font-extrabold">
                          {comp.code}
                        </span>
                        <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-bold">
                          Cỡ {comp.size}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center gap-1 font-mono text-[10px] font-bold opacity-80">
                        <Lock className="h-3 w-3" />
                        <span>CLOSED</span>
                      </div>
                      <p className="mt-1.5 text-[11px] font-bold">
                        {statusMeta.label}
                      </p>
                      <p className="mt-0.5 line-clamp-1 text-[10px] opacity-85">
                        {comp.sizeLabel}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span className="inline-flex items-center gap-1 font-medium">
                <KeyRound className="h-3.5 w-3.5 text-brand-blue" />
                Mở khóa mô phỏng bằng mã OTP 6 số một lần
              </span>
              <Button asChild size="sm" variant="secondary">
                <Link href={`/lockers/${station.id}`}>
                  <span>Mở Kiosk Simulator</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          </section>
        ))}
      </div>

      {/* 5-Step Transaction Flow Card aligned with Order State Machine */}
      <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-brand-green" />
          <h2 className="text-xl font-extrabold text-brand-navy">
            Quy trình giao dịch 5 bước qua Smart Locker Simulator
          </h2>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {[
            {
              step: "Bước 1",
              title: "Người mua đặt hàng",
              desc: "Người mua chọn sản phẩm và đặt mua trên hệ thống (trạng thái đơn hàng: PENDING, tạm giữ mô phỏng HELD_DEMO).",
            },
            {
              step: "Bước 2",
              title: "Người bán xác nhận",
              desc: "Người bán xác nhận đơn và hệ thống cấp ngăn trống tại trạm đã chọn (SELLER_CONFIRMED → AWAITING_DROPOFF).",
            },
            {
              step: "Bước 3",
              title: "Gửi hàng vào Locker",
              desc: "Người bán bỏ sản phẩm vào ngăn tủ (AWAITING_DROPOFF → IN_LOCKER); hệ thống xác nhận gửi hàng và cấp OTP (IN_LOCKER → READY_FOR_PICKUP).",
            },
            {
              step: "Bước 4",
              title: "Mở tủ & Lấy hàng",
              desc: "Người mua nhập mã OTP tại trạm tủ để mở ngăn OCCUPIED và lấy sản phẩm ra kiểm tra (READY_FOR_PICKUP → PICKED_UP).",
            },
            {
              step: "Bước 5",
              title: "Xác nhận hoàn tất",
              desc: "Người mua xác nhận sản phẩm đúng mô tả (PICKED_UP → COMPLETED), ngăn tủ về AVAILABLE và giải ngân mô phỏng (RELEASED_DEMO).",
            },
          ].map((item) => (
            <div
              key={item.step}
              className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4"
            >
              <span className="inline-block rounded-lg bg-brand-blue px-2.5 py-0.5 text-xs font-bold text-white">
                {item.step}
              </span>
              <h3 className="mt-2.5 text-sm font-bold text-brand-navy">
                {item.title}
              </h3>
              <p className="mt-1 text-xs leading-relaxed text-slate-600">
                {item.desc}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button asChild variant="outline">
            <Link href="/orders">Quản lý đơn hàng của tôi</Link>
          </Button>
          <Button asChild>
            <Link href="/products">
              <span>Khám phá các sản phẩm đang bán</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
