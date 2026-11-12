"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Box,
  CheckCircle2,
  GraduationCap,
  KeyRound,
  PlusCircle,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BrandLogo } from "@/components/layout/brand-logo";

const quickKeywords = [
  { label: "Giáo trình Giải tích", query: "Giải tích" },
  { label: "Đại số tuyến tính", query: "Đại số tuyến tính" },
  { label: "Máy tính Casio", query: "Casio" },
  { label: "Breadboard", query: "Breadboard" },
  { label: "Đèn bàn KTX", query: "Đèn bàn" },
  { label: "Nồi điện mini", query: "Nồi điện" },
];

export function HeroSection() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/products?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push("/products");
    }
  };

  return (
    <section className="relative overflow-hidden border-b border-slate-200/80 bg-white pb-12 pt-8 lg:py-14">
      {/* Subtle Campus Accent Background */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-brand-blue-light/70 via-white to-emerald-50/40"
      />

      <div className="container relative">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
          {/* Left Column: Headline, Subheadline, Search Bar, CTAs */}
          <div className="lg:col-span-7">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="gap-1.5 px-3 py-1">
                <GraduationCap className="h-3.5 w-3.5" />
                Định hướng triển khai tại Đại học Cần Thơ
              </Badge>
              <Badge variant="eco" className="gap-1.5 px-3 py-1">
                <Box className="h-3.5 w-3.5" />
                Kết hợp Smart Locker nội khu
              </Badge>
              <Badge variant="warning" className="gap-1.5 px-2.5 py-1">
                <Sparkles className="h-3 w-3" />
                MVP Demo – Dữ liệu mẫu
              </Badge>
            </div>

            <h1 className="mt-5 text-3xl font-extrabold tracking-tight text-brand-navy sm:text-4xl lg:text-5xl lg:leading-[1.15]">
              Mua bán đồ sinh viên{" "}
              <span className="text-brand-blue">dễ dàng hơn</span>
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-600 sm:text-lg">
              Tìm đồ cần thiết – thanh lý đồ không còn dùng – nhận hàng thuận
              tiện qua EduLocker.
            </p>

            {/* Large Search Bar */}
            <form
              onSubmit={handleSearch}
              role="search"
              aria-label="Tìm kiếm đồ dùng sinh viên"
              className="mt-6 max-w-2xl"
            >
              <div className="flex flex-col gap-2 rounded-2xl border-2 border-brand-blue/20 bg-white p-2 shadow-md transition-colors focus-within:border-brand-blue sm:flex-row sm:items-center">
                <div className="relative flex flex-1 items-center">
                  <Search className="ml-3 h-5 w-5 shrink-0 text-brand-blue" />
                  <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Bạn đang tìm giáo trình, máy tính hay đồ KTX?"
                    aria-label="Bạn đang tìm giáo trình, máy tính hay đồ KTX?"
                    className="h-11 w-full bg-transparent px-3 text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none sm:text-base"
                  />
                </div>
                <Button type="submit" size="lg" className="shrink-0 sm:px-6">
                  <span>Tìm kiếm</span>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              {/* Quick Campus Tags */}
              <div className="mt-3 flex flex-wrap items-center gap-1.5 text-xs">
                <span className="font-semibold text-slate-500">Tìm nhanh:</span>
                {quickKeywords.map((item) => (
                  <Link
                    key={item.label}
                    href={`/products?q=${encodeURIComponent(item.query)}`}
                    className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-medium text-slate-600 transition-colors hover:border-brand-blue/40 hover:bg-brand-blue-light hover:text-brand-blue"
                  >
                    {item.label}
                  </Link>
                ))}
              </div>
            </form>

            {/* Primary & Secondary CTAs */}
            <div className="mt-7 flex flex-wrap items-center gap-3.5">
              <Button asChild size="lg" className="shadow-sm">
                <Link href="/products">
                  <span>Khám phá ngay</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>

              <Button asChild variant="outline" size="lg">
                <Link href="/sell">
                  <PlusCircle className="h-4 w-4 text-brand-green" />
                  <span>Đăng bán sản phẩm</span>
                </Link>
              </Button>
            </div>

            {/* Key Campus Value Highlights */}
            <div className="mt-8 grid grid-cols-1 gap-3 border-t border-slate-200/80 pt-6 sm:grid-cols-3">
              <div>
                <p className="text-lg font-extrabold text-brand-navy sm:text-xl">
                  Không qua Shipper
                </p>
                <p className="text-xs text-slate-600">
                  Tiết kiệm phí giao nhận nội khu (Mô hình Demo tại tủ)
                </p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-brand-green sm:text-xl">
                  Tiết kiệm 50–70%
                </p>
                <p className="text-xs text-slate-600">
                  Giáo trình, Casio, linh kiện &amp; đồ dùng KTX
                </p>
              </div>
              <div>
                <p className="text-lg font-extrabold text-brand-blue sm:text-xl">
                  Giảm rủi ro cọc
                </p>
                <p className="text-xs text-slate-600">
                  Mở tủ bằng OTP, kiểm tra đúng mô tả mới xác nhận
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Visual Smart Locker + Brand Card */}
          <div className="lg:col-span-5">
            <div className="relative mx-auto max-w-md rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xl sm:p-6">
              {/* Top Brand Card Header */}
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
                <BrandLogo size="sm" showText={true} href={null} />
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-brand-green">
                  <Sparkles className="h-3 w-3" />
                  Trạm mô phỏng Campus
                </span>
              </div>

              {/* Visual Smart Locker Compartment Matrix Preview */}
              <div className="mt-4 rounded-2xl bg-brand-navy p-4 text-white">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-emerald-300">
                    TRẠM MÔ PHỎNG – KÝ TÚC XÁ A
                  </span>
                  <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] font-semibold">
                    Giờ dự kiến: 24/7
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-2">
                  {[
                    {
                      code: "A01",
                      status: "Trống",
                      color:
                        "bg-emerald-500/20 border-emerald-400 text-emerald-200",
                    },
                    {
                      code: "A02",
                      status: "Đã đặt",
                      color: "bg-blue-500/25 border-blue-400 text-blue-200",
                    },
                    {
                      code: "A03",
                      status: "Trống",
                      color:
                        "bg-emerald-500/20 border-emerald-400 text-emerald-200",
                    },
                    {
                      code: "A04",
                      status: "Có hàng",
                      color: "bg-amber-500/25 border-amber-400 text-amber-200",
                    },
                  ].map((cell) => (
                    <div
                      key={cell.code}
                      className={`flex flex-col items-center justify-center rounded-xl border p-2.5 text-center ${cell.color}`}
                    >
                      <span className="text-xs font-extrabold">
                        {cell.code}
                      </span>
                      <span className="mt-0.5 text-[10px] font-medium">
                        {cell.status}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="mt-3 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs">
                  <span className="flex items-center gap-1.5 text-slate-200">
                    <KeyRound className="h-3.5 w-3.5 text-amber-300" />
                    Mở ngăn tủ bằng mã xác thực OTP
                  </span>
                  <Link
                    href="/lockers"
                    className="font-bold text-emerald-300 underline-offset-2 hover:underline"
                  >
                    Xem trạm tủ →
                  </Link>
                </div>
              </div>

              {/* 2-Step Campus Flow Summary */}
              <div className="mt-4 space-y-2.5">
                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-blue" />
                  <div className="text-xs">
                    <p className="font-bold text-brand-navy">
                      1. Lọc đúng Trường → Ngành → Môn học → Khóa
                    </p>
                    <p className="mt-0.5 text-slate-600">
                      Tìm nhanh cuốn giáo trình Giải tích, Lý thuyết mạch hay
                      máy tính Casio phù hợp học phần.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                  <div className="text-xs">
                    <p className="font-bold text-brand-navy">
                      2. Hạn chế rủi ro tiền cọc &amp; bất tiện chờ đợi
                    </p>
                    <p className="mt-0.5 text-slate-600">
                      Hỗ trợ giao nhận linh hoạt theo giờ hoạt động dự kiến của
                      từng trạm tủ nội khu.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
