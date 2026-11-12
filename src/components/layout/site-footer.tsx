import React from "react";
import Link from "next/link";
import { Box, GraduationCap, Leaf, MapPin, Sparkles } from "lucide-react";
import { BrandLogo } from "@/components/layout/brand-logo";

const trustPillars = [
  {
    letter: "T",
    name: "Transparency",
    vi: "Minh bạch tình trạng & lịch sử giao dịch",
  },
  {
    letter: "R",
    name: "Resourcefulness",
    vi: "Tiết kiệm 50–70% chi phí & tối ưu phí giao nhận nội khu",
  },
  {
    letter: "U",
    name: "User-Centric",
    vi: "Lấy lịch học & nhu cầu sinh viên làm trung tâm",
  },
  {
    letter: "S",
    name: "Sustainability",
    vi: "Kinh tế tuần hoàn, kéo dài vòng đời đồ dùng",
  },
  {
    letter: "T",
    name: "Technology-Driven",
    vi: "Ứng dụng Smart Locker & phân loại thông minh",
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-slate-200 bg-white text-slate-600">
      {/* T.R.U.S.T Core Values Strip */}
      <div className="border-b border-slate-100 bg-slate-50/80 py-8">
        <div className="container">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-blue text-xs font-extrabold text-white">
                T
              </span>
              <h2 className="text-sm font-bold uppercase tracking-wider text-brand-navy">
                Hệ giá trị cốt lõi T.R.U.S.T của EduLocker
              </h2>
            </div>
            <p className="text-xs font-medium text-slate-500">
              Nền tảng thương mại trao đổi đồ dùng sinh viên kết hợp tủ Smart
              Locker
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {trustPillars.map((item, idx) => (
              <div
                key={`${item.letter}-${idx}`}
                className="flex items-start gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-sm"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-blue-light text-sm font-extrabold text-brand-blue">
                  {item.letter}
                </span>
                <div>
                  <p className="text-xs font-bold text-brand-navy">
                    {item.name}
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-slate-600">
                    {item.vi}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Footer Content */}
      <div className="container py-12">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-2 lg:grid-cols-12">
          {/* Column 1: Brand & Official Full Logo */}
          <div className="lg:col-span-5">
            <BrandLogo size="lg" showText={false} />
            <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-600">
              <strong>EduLocker</strong> là nền tảng thương mại trao đổi giáo
              trình, dụng cụ học tập và đồ dùng ký túc xá dành cho sinh viên,
              kết hợp hệ thống <strong>Smart Locker nội khu</strong> hỗ trợ giao
              nhận linh hoạt theo giờ hoạt động dự kiến của từng trạm mà không
              cần hẹn gặp trực tiếp.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3.5 py-2 text-xs font-semibold text-emerald-800">
              <Leaf className="h-4 w-4 text-brand-green" />
              <span>Slogan: “Gửi An Tâm – Nhận Tiết Kiệm”</span>
            </div>
          </div>

          {/* Column 2: Danh mục ưu tiên */}
          <div className="lg:col-span-3">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-navy">
              Danh mục sinh viên
            </h3>
            <ul className="mt-4 space-y-2.5 text-sm">
              <li>
                <Link
                  href="/products?category=giao-trinh"
                  className="hover:text-brand-blue"
                >
                  Giáo trình đại cương &amp; chuyên ngành
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=may-tinh-cam-tay"
                  className="hover:text-brand-blue"
                >
                  Máy tính cầm tay Casio
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=do-dien-tu"
                  className="hover:text-brand-blue"
                >
                  Linh kiện &amp; Đồ điện tử thực hành
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=do-ktx"
                  className="hover:text-brand-blue"
                >
                  Đồ dùng Ký túc xá (Đèn, Quạt, Kệ)
                </Link>
              </li>
              <li>
                <Link
                  href="/products?category=do-gia-dung"
                  className="hover:text-brand-blue"
                >
                  Đồ gia dụng nhỏ &amp; Phụ kiện học tập
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Điểm đặt Smart Locker MVP */}
          <div className="lg:col-span-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-brand-navy">
              Trạm mô phỏng / Vị trí đề xuất (ĐH Cần Thơ)
            </h3>
            <div className="mt-4 space-y-3 text-sm">
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                <p className="flex items-center gap-1.5 font-bold text-brand-navy">
                  <Box className="h-4 w-4 text-brand-blue" />
                  EduLocker – Ký túc xá A (Trạm mô phỏng)
                </p>
                <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  Vị trí đề xuất: Sảnh KTX Khu A, Khu II ĐH Cần Thơ (Giờ hoạt
                  động dự kiến (Demo): 24/7)
                </p>
              </div>
              <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3">
                <p className="flex items-center gap-1.5 font-bold text-brand-navy">
                  <Box className="h-4 w-4 text-brand-green" />
                  EduLocker – Thư viện (Trạm mô phỏng)
                </p>
                <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-600">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                  Vị trí đề xuất: Trung tâm Học liệu ĐH Cần Thơ, Khu II (Giờ
                  hoạt động dự kiến (Demo): 06:30 – 22:00)
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Copyright & Disclaimer */}
        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-brand-navy">
              © 2026 EduLocker – Gửi An Tâm, Nhận Tiết Kiệm.
            </span>
            <span>•</span>
            <span>
              Dự án Đổi mới sáng tạo và Khởi nghiệp (KN002E – Nhóm 8).
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 font-medium text-slate-600">
              <GraduationCap className="h-3.5 w-3.5 text-brand-blue" />
              Định hướng triển khai tại ĐH Cần Thơ
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 font-medium text-amber-800">
              <Sparkles className="h-3.5 w-3.5" />
              MVP Demo – Dữ liệu mẫu (Smart Locker &amp; Thanh toán mô phỏng)
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
