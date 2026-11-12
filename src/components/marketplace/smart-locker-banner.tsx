import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Box,
  Clock,
  KeyRound,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/layout/brand-logo";
import type { LockerLocation } from "@/types";

export function SmartLockerBanner({ lockers }: { lockers: LockerLocation[] }) {
  return (
    <section aria-labelledby="smart-locker-banner-heading" className="py-10">
      <div className="container">
        <div className="relative overflow-hidden rounded-3xl border border-brand-blue/20 bg-brand-navy p-6 text-white shadow-xl sm:p-10">
          {/* Decorative background circles */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-brand-blue/20 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -left-16 h-72 w-72 rounded-full bg-brand-green/20 blur-2xl"
          />

          <div className="relative grid grid-cols-1 items-center gap-8 lg:grid-cols-12">
            {/* Left Content */}
            <div className="lg:col-span-7">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3.5 py-1 text-xs font-bold text-emerald-300">
                <Box className="h-4 w-4" />
                <span>
                  Hỗ trợ giao nhận linh hoạt theo giờ hoạt động dự kiến của từng
                  trạm
                </span>
              </div>

              <h2
                id="smart-locker-banner-heading"
                className="mt-4 text-2xl font-extrabold tracking-tight text-white sm:text-3xl lg:text-4xl"
              >
                Không cần hẹn gặp – nhận hàng khi bạn rảnh
              </h2>

              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200 sm:text-base">
                Người bán gửi sản phẩm vào EduLocker, người mua đến nhận khi
                thuận tiện bằng mã xác thực. Giả định phí vận chuyển chặng cuối
                bằng 0đ khi giao nhận trực tiếp tại tủ nội khu.
              </p>

              <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <Clock className="h-5 w-5 text-emerald-400" />
                  <p className="mt-2 text-sm font-bold">Linh hoạt lịch học</p>
                  <p className="mt-1 text-xs text-slate-300">
                    Người bán gửi hàng khi đi học qua, người mua tan ca học đến
                    mở tủ nhận theo giờ mở cửa của trạm.
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <KeyRound className="h-5 w-5 text-amber-300" />
                  <p className="mt-2 text-sm font-bold">Mã xác thực OTP</p>
                  <p className="mt-1 text-xs text-slate-300">
                    Mỗi giao dịch được cấp ngăn tủ riêng và mã OTP dùng một lần
                    (Simulator triển khai ở Phase 3).
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3.5">
                  <ShieldCheck className="h-5 w-5 text-sky-300" />
                  <p className="mt-2 text-sm font-bold">
                    Hỗ trợ tăng độ tin cậy
                  </p>
                  <p className="mt-1 text-xs text-slate-300">
                    Kiểm tra sách/đồ dùng ngay tại sảnh rồi mới bấm xác nhận
                    hoàn tất đơn hàng.
                  </p>
                </div>
              </div>

              <div className="mt-7 flex flex-wrap items-center gap-4">
                <Button
                  asChild
                  size="lg"
                  variant="eco"
                  className="font-bold shadow-md"
                >
                  <Link href="/lockers">
                    <span>Khám phá Smart Locker</span>
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>

                <span className="text-xs font-medium text-slate-300">
                  *Trực quan hóa ngăn tủ mô phỏng A01–A04 &amp; B01–B04
                </span>
              </div>
            </div>

            {/* Right Station Cards */}
            <div className="space-y-4 lg:col-span-5">
              <div className="flex items-center justify-between rounded-2xl bg-white p-3.5 text-brand-navy shadow-md">
                <BrandLogo size="sm" showText={true} href={null} />
                <span className="rounded-lg bg-brand-blue-light px-2.5 py-1 text-xs font-bold text-brand-blue">
                  2 Trạm mô phỏng CTU
                </span>
              </div>

              {lockers.map((station) => (
                <div
                  key={station.id}
                  className="rounded-2xl border border-white/15 bg-white/10 p-4 backdrop-blur-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        {station.name}
                      </h3>
                      <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-300">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-emerald-400" />
                        {station.campusArea}
                      </p>
                      <p className="mt-1 flex items-center gap-1 text-[11px] text-emerald-300">
                        <Clock className="h-3 w-3 shrink-0" />
                        {station.operatingHours}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-emerald-500/20 px-2.5 py-1 text-xs font-bold text-emerald-300">
                      Còn {station.availableCompartments}/
                      {station.totalCompartments} ngăn trống
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-4 gap-2">
                    {station.compartments.map((comp) => (
                      <div
                        key={comp.id}
                        className="rounded-lg border border-white/15 bg-slate-900/50 px-2 py-1.5 text-center text-xs"
                      >
                        <span className="font-extrabold text-white">
                          {comp.code}
                        </span>
                        <span className="block text-[10px] text-slate-300">
                          {comp.status === "AVAILABLE"
                            ? "Trống"
                            : comp.status === "RESERVED"
                              ? "Đã đặt"
                              : comp.status === "OCCUPIED"
                                ? "Có hàng"
                                : "Bảo trì"}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
