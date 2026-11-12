import React from "react";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

export interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  href?: string | null;
  className?: string;
  priority?: boolean;
  subtitle?: string;
}

const sizeMap = {
  sm: {
    emblemBox: "h-10 w-10 sm:h-11 sm:w-11",
    fullBox: "h-14 w-[57px]",
    title: "text-base sm:text-lg",
    slogan: "text-[11px]",
  },
  md: {
    emblemBox: "h-11 w-11 sm:h-12 sm:w-12",
    fullBox: "h-20 w-[82px]",
    title: "text-lg sm:text-xl",
    slogan: "text-xs",
  },
  lg: {
    emblemBox: "h-14 w-14",
    fullBox: "h-36 w-[147px] sm:h-40 sm:w-[164px]",
    title: "text-2xl",
    slogan: "text-sm",
  },
} as const;

/**
 * BrandLogo:
 * - Luôn sử dụng chính xác `/logo-edulocker.png` từ `public/logo-edulocker.png` (265x259).
 * - Khi `showText={true}` (dùng ở Header): Khung ảnh dùng CSS hiển thị phần biểu tượng chính
 *   (mũ cử nhân + Smart Locker + vòng tuần hoàn) của `/logo-edulocker.png` kết hợp chữ EduLocker
 *   bên cạnh để tránh lặp chữ có sẵn dưới đáy file PNG và giúp Header gọn đẹp trên cả Desktop & Mobile.
 * - Khi `showText={false}` (hoặc ở Footer với `size="lg" showText={false}`): Hiển thị trọn vẹn
 *   logo đầy đủ nguyên bản `/logo-edulocker.png` giữ đúng tỷ lệ 265:259.
 */
export function BrandLogo({
  size = "md",
  showText = true,
  href = "/",
  className,
  priority = false,
  subtitle = "Gửi An Tâm – Nhận Tiết Kiệm",
}: BrandLogoProps) {
  const styles = sizeMap[size];

  const content = showText ? (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 select-none group",
        className,
      )}
    >
      {/* Biểu tượng chính từ /logo-edulocker.png (ẩn phần chữ đáy bằng CSS container, không sửa file gốc) */}
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200/90 bg-[#E6E6E6] shadow-sm transition-transform group-hover:scale-[1.02]",
          styles.emblemBox,
        )}
      >
        <Image
          src="/logo-edulocker.png"
          alt="EduLocker"
          width={265}
          height={259}
          priority={priority}
          className="h-full w-full object-contain scale-[1.82] origin-[50%_33%]"
        />
      </span>

      <span className="flex flex-col justify-center leading-tight">
        <span
          className={cn(
            "font-extrabold tracking-tight text-brand-blue",
            styles.title,
          )}
        >
          Edu<span className="text-brand-navy">Locker</span>
        </span>
        <span
          className={cn(
            "hidden font-semibold tracking-normal text-brand-green sm:block",
            styles.slogan,
          )}
        >
          {subtitle}
        </span>
      </span>
    </span>
  ) : (
    /* Logo đầy đủ nguyên bản (biểu tượng + chữ EduLocker + slogan trong ảnh gốc) */
    <span
      className={cn("inline-flex items-center select-none group", className)}
    >
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200/90 bg-[#E6E6E6] p-1.5 shadow-sm transition-transform group-hover:scale-[1.01]",
          styles.fullBox,
        )}
      >
        <Image
          src="/logo-edulocker.png"
          alt="EduLocker"
          width={265}
          height={259}
          priority={priority}
          className="h-full w-auto object-contain"
        />
      </span>
    </span>
  );

  if (!href) {
    return content;
  }

  return (
    <Link
      href={href}
      aria-label="EduLocker – Trang chủ"
      className="inline-flex items-center rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue focus-visible:ring-offset-2"
    >
      {content}
    </Link>
  );
}
