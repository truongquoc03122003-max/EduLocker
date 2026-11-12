"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Box,
  Clock,
  GraduationCap,
  Heart,
  ShieldCheck,
  Star,
} from "lucide-react";
import type { Product } from "@/types";
import {
  calculateSavingPercent,
  cn,
  formatRelativeTimeVi,
  formatVND,
  getConditionMeta,
} from "@/lib/utils";
import { useAppUI } from "@/hooks/use-app-ui";

export function ProductCard({ product }: { product: Product }) {
  const { isFavorite, toggleFavorite } = useAppUI();
  const liked = isFavorite(product.id);
  const savingPercent = calculateSavingPercent(
    product.price,
    product.originalPrice,
  );
  const conditionMeta = getConditionMeta(product.condition);

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-blue/40 hover:shadow-md">
      {/* Image + Top Overlays */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-slate-100">
        <Link
          href={`/products/${product.id}`}
          className="block h-full w-full focus-visible:outline-none"
        >
          <Image
            src={product.thumbnailUrl}
            alt={product.title}
            width={640}
            height={480}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        </Link>

        {/* Saving / Condition Badges */}
        <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
          {savingPercent && (
            <span className="rounded-lg bg-brand-green px-2 py-0.5 text-[11px] font-bold text-white shadow-sm">
              Tiết kiệm {savingPercent}%
            </span>
          )}
          <span
            className={cn(
              "rounded-lg border px-2 py-0.5 text-[11px] font-semibold backdrop-blur-sm",
              conditionMeta.badgeClass,
            )}
          >
            {product.conditionLabel}
          </span>
        </div>

        {/* Favorite Button */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(product.id, product.title);
          }}
          aria-label={
            liked
              ? `Bỏ lưu ${product.title}`
              : `Lưu ${product.title} vào yêu thích`
          }
          aria-pressed={liked}
          className={cn(
            "absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border bg-white/95 shadow-sm transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue",
            liked
              ? "border-rose-200 text-rose-500"
              : "border-slate-200 text-slate-600 hover:text-rose-500",
          )}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-rose-500")} />
        </button>

        {/* Bottom Smart Locker Tag */}
        <div className="pointer-events-none absolute bottom-2.5 left-3 right-3 flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1 truncate rounded-lg bg-brand-navy/90 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm">
            <Box className="h-3 w-3 shrink-0 text-emerald-400" />
            <span className="truncate">{product.preferredLockerName}</span>
          </span>
          {product.courseCode && (
            <span className="shrink-0 rounded-lg bg-white/95 px-2 py-1 text-[11px] font-bold text-brand-blue shadow-sm">
              {product.courseCode}
            </span>
          )}
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-4">
        <div>
          {/* University & Major / Cohort */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-slate-500">
            <span className="inline-flex items-center gap-1 font-semibold text-brand-blue">
              <GraduationCap className="h-3.5 w-3.5" />
              {product.universityName}
            </span>
            <span>•</span>
            <span className="truncate">{product.majorName}</span>
            <span>•</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
              {product.cohort}
            </span>
          </div>

          {/* Product Title */}
          <h3 className="mt-1.5 line-clamp-2 min-h-[2.6rem] text-sm font-bold leading-snug text-brand-navy group-hover:text-brand-blue">
            <Link
              href={`/products/${product.id}`}
              className="focus-visible:outline-none focus-visible:underline"
            >
              {product.title}
            </Link>
          </h3>

          {/* Price & Original Price */}
          <div className="mt-2.5 flex items-baseline gap-2">
            <span className="text-lg font-extrabold text-brand-blue">
              {formatVND(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs font-medium text-slate-400 line-through">
                {formatVND(product.originalPrice)}
              </span>
            )}
          </div>
        </div>

        {/* Seller & Posted Time Footer */}
        <div className="mt-3.5 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-blue-light text-[10px] font-bold text-brand-blue">
              {product.seller.fullName.charAt(0)}
            </span>
            <span className="truncate font-medium text-slate-700">
              {product.seller.fullName.replace(" (Tài khoản mẫu)", "")}
            </span>
            {product.seller.emailVerified && (
              <ShieldCheck
                aria-label="Email đã xác minh (Demo)"
                className="h-3.5 w-3.5 shrink-0 text-brand-green"
              />
            )}
            <span className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-amber-600">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {product.seller.ratingAvg.toFixed(1)}
            </span>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-slate-400">
            <Clock className="h-3 w-3" />
            {formatRelativeTimeVi(product.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
}
