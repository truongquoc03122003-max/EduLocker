import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { ProductCondition } from "@/types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function calculateSavingPercent(
  price: number,
  originalPrice?: number,
): number | null {
  if (!originalPrice || originalPrice <= price) {
    return null;
  }
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}

export function formatRelativeTimeVi(isoDateString: string): string {
  const date = new Date(isoDateString);
  const now = new Date("2026-11-11T23:00:00+07:00");
  const diffMs = Math.max(0, now.getTime() - date.getTime());
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMinutes < 60) {
    return `${Math.max(5, diffMinutes)} phút trước`;
  }
  if (diffHours < 24) {
    return `${diffHours} giờ trước`;
  }
  if (diffDays === 1) {
    return "Hôm qua";
  }
  if (diffDays < 30) {
    return `${diffDays} ngày trước`;
  }
  return date.toLocaleDateString("vi-VN");
}

export function getConditionMeta(condition: ProductCondition): {
  label: string;
  badgeClass: string;
} {
  switch (condition) {
    case "LIKE_NEW":
      return {
        label: "Như mới (95–99%)",
        badgeClass:
          "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-50",
      };
    case "GOOD":
      return {
        label: "Còn tốt (85–94%)",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-50",
      };
    case "FAIR":
      return {
        label: "Khá tốt (75–84%)",
        badgeClass:
          "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-50",
      };
    case "WELL_USED":
      return {
        label: "Đã qua sử dụng",
        badgeClass:
          "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-100",
      };
  }
}
