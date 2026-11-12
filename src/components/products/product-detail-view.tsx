"use client";

import React, { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Box,
  CheckCircle2,
  Clock,
  Edit3,
  Eye,
  EyeOff,
  GraduationCap,
  Heart,
  Leaf,
  MapPin,
  MessageSquare,
  Share2,
  ShieldCheck,
  ShoppingBag,
  Star,
  UserCheck,
} from "lucide-react";
import type { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/products/product-card";
import {
  calculateSavingPercent,
  cn,
  formatRelativeTimeVi,
  formatVND,
  getConditionMeta,
} from "@/lib/utils";
import { canManageProduct } from "@/lib/validations/product";
import { toggleProductVisibilityAction } from "@/features/marketplace/product-actions";
import { getOrCreateConversationAction } from "@/features/messages/message-actions";
import { ReportButtonModal } from "@/components/reports/report-button-modal";
import { useAppUI } from "@/hooks/use-app-ui";

export function ProductDetailView({
  product,
  relatedProducts,
}: {
  product: Product;
  relatedProducts: Product[];
}) {
  const router = useRouter();
  const { isFavorite, toggleFavorite, showToast, openPhaseModal, currentUser } =
    useAppUI();
  const [selectedImageIdx, setSelectedImageIdx] = useState(0);
  const [isOwnerPreview, setIsOwnerPreview] = useState(false);
  const [isPending, startTransition] = useTransition();

  const isActualOwner = canManageProduct(currentUser?.id, product.sellerId);
  const showOwnerControls = isActualOwner || isOwnerPreview;

  const liked = isFavorite(product.id);
  const savingPercent = calculateSavingPercent(
    product.price,
    product.originalPrice,
  );
  const conditionMeta = getConditionMeta(product.condition);
  const galleryImages =
    product.images.length > 0
      ? product.images
      : [
          {
            id: "fallback",
            productId: product.id,
            url: product.thumbnailUrl,
            alt: product.title,
            displayOrder: 1,
          },
        ];

  const activeImage = galleryImages[selectedImageIdx] ?? galleryImages[0];

  const handleMessageSeller = () => {
    if (product.isDemo) {
      openPhaseModal({
        title: `Nhắn người bán (Sản phẩm mẫu): ${product.seller.fullName.replace(
          " (Tài khoản mẫu)",
          "",
        )}`,
        phaseBadge: "Dữ liệu mẫu trình diễn",
        summary:
          "Đây là sản phẩm mẫu minh họa giao diện. Hãy đăng nhập và chọn sản phẩm thật từ cơ sở dữ liệu để mở cuộc trò chuyện Realtime tại /messages.",
        steps: [
          "Đăng nhập bằng tài khoản sinh viên thật.",
          "Chọn một sản phẩm do người khác đăng bán và bấm 'Nhắn người bán' để tạo hội thoại.",
        ],
        ctaHref: "/products",
        ctaLabel: "Xem sản phẩm trên Marketplace",
      });
      return;
    }

    if (!currentUser) {
      router.push(
        `/login?next=${encodeURIComponent(`/products/${product.slug}`)}`,
      );
      return;
    }

    startTransition(async () => {
      const res = await getOrCreateConversationAction(product.id);
      if (!res.success || !res.conversationId) {
        showToast({
          title: "Không thể mở cuộc trò chuyện",
          description: res.error ?? "Vui lòng thử lại sau.",
          variant: "info",
        });
        return;
      }
      router.push(`/messages/${res.conversationId}`);
    });
  };

  const handleShare = () => {
    if (typeof window !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href).catch(() => {});
    }
    showToast({
      title: "Đã sao chép liên kết sản phẩm",
      description: "Bạn có thể chia sẻ cho bạn cùng lớp hoặc nhóm học phần.",
      variant: "success",
    });
  };

  const handleToggleRealVisibility = () => {
    const nextStatus = product.status === "HIDDEN" ? "AVAILABLE" : "HIDDEN";
    startTransition(async () => {
      const res = await toggleProductVisibilityAction(product.id, nextStatus);
      if (res.success) {
        showToast({
          title:
            nextStatus === "HIDDEN"
              ? "Đã ẩn sản phẩm khỏi Marketplace"
              : "Đã hiển thị lại sản phẩm trên Marketplace",
          variant: "success",
        });
        router.refresh();
      } else {
        showToast({
          title: "Không thể thay đổi trạng thái",
          description: res.error,
          variant: "info",
        });
      }
    });
  };

  return (
    <div className="pb-14 pt-2">
      {/* Main Product Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left: Image Gallery (5 cols) */}
        <div className="lg:col-span-5">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
              <Image
                src={activeImage.url}
                alt={activeImage.alt}
                width={640}
                height={480}
                priority
                className="h-full w-full object-cover"
              />
              {savingPercent && (
                <span className="absolute left-3.5 top-3.5 rounded-xl bg-brand-green px-3 py-1 text-xs font-extrabold text-white shadow-sm">
                  Tiết kiệm {savingPercent}% so với mua mới
                </span>
              )}
            </div>

            {galleryImages.length > 1 && (
              <div className="mt-3 flex items-center gap-2.5 overflow-x-auto pb-1">
                {galleryImages.map((img, idx) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImageIdx(idx)}
                    aria-label={`Xem hình ${idx + 1}: ${img.alt}`}
                    className={cn(
                      "relative h-[72px] w-24 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                      selectedImageIdx === idx
                        ? "border-brand-blue ring-2 ring-brand-blue/20"
                        : "border-slate-200 opacity-75 hover:opacity-100",
                    )}
                  >
                    <Image
                      src={img.url}
                      alt={img.alt}
                      width={160}
                      height={120}
                      className="h-full w-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 5-Step Smart Locker Assurance Card */}
          <div className="mt-5 rounded-2xl border border-blue-200/80 bg-brand-blue-light/50 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="flex items-center gap-2 text-sm font-extrabold text-brand-navy">
                <Box className="h-4 w-4 text-brand-blue" />
                Giao nhận qua {product.preferredLockerName}
              </p>
              <Badge variant="eco">Không qua shipper (Demo)</Badge>
            </div>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Người bán gửi hàng vào ngăn tủ mô phỏng tại{" "}
              <strong>{product.universityName}</strong>. Bạn nhận mã OTP mở tủ
              theo giờ hoạt động dự kiến của trạm, kiểm tra đúng tình trạng{" "}
              <strong>{product.conditionLabel}</strong> mới bấm xác nhận hoàn
              tất.
            </p>
          </div>
        </div>

        {/* Right: Product Info, Academic Metadata, Seller & CTAs (7 cols) */}
        <div className="lg:col-span-7">
          <div className="rounded-3xl border border-slate-200/90 bg-white p-6 shadow-sm sm:p-8">
            {/* Top Category + Condition + Owner View Switch */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  href={`/products?category=${product.categorySlug}`}
                  className="rounded-full bg-brand-blue-light px-3 py-1 text-xs font-bold text-brand-blue hover:underline"
                >
                  {product.categoryName}
                </Link>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-semibold",
                    conditionMeta.badgeClass,
                  )}
                >
                  Tình trạng: {product.conditionLabel}
                </span>
                {product.status === "HIDDEN" && (
                  <Badge variant="warning">Đang ẩn (HIDDEN)</Badge>
                )}
                {product.status === "RESERVED" && (
                  <Badge variant="warning">Đã có người đặt (RESERVED)</Badge>
                )}
                {product.status === "SOLD" && (
                  <Badge variant="secondary">Đã bán (SOLD)</Badge>
                )}
                <span className="inline-flex items-center gap-1 text-xs text-slate-500">
                  <Clock className="h-3.5 w-3.5" />
                  Đăng {formatRelativeTimeVi(product.createdAt)}
                </span>
              </div>

              {!isActualOwner && (
                <button
                  type="button"
                  onClick={() => setIsOwnerPreview((prev) => !prev)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-600 transition-colors hover:border-brand-blue hover:text-brand-blue"
                >
                  {isOwnerPreview
                    ? "Đang xem: Góc nhìn Chủ sản phẩm (Demo)"
                    : "Xem thử góc nhìn Chủ sản phẩm"}
                </button>
              )}
            </div>

            {/* Product Title */}
            <h1 className="mt-3.5 text-2xl font-extrabold leading-tight text-brand-navy sm:text-3xl">
              {product.title}
            </h1>

            {/* Price Block */}
            <div className="mt-5 flex flex-wrap items-baseline gap-3 rounded-2xl bg-slate-50 p-4">
              <span className="text-3xl font-extrabold text-brand-blue">
                {formatVND(product.price)}
              </span>
              {product.originalPrice &&
                product.originalPrice > product.price && (
                  <>
                    <span className="text-sm font-medium text-slate-400 line-through">
                      Giá gốc: {formatVND(product.originalPrice)}
                    </span>
                    <span className="rounded-lg bg-emerald-100 px-2.5 py-1 text-xs font-bold text-emerald-800">
                      Tiết kiệm{" "}
                      {formatVND(product.originalPrice - product.price)} (
                      {savingPercent}%)
                    </span>
                  </>
                )}
            </div>

            {/* Academic Taxonomy Metadata Grid */}
            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-slate-200/80 p-3">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <GraduationCap className="h-3.5 w-3.5 text-brand-blue" />
                  Trường
                </span>
                <p className="mt-1 text-xs font-bold text-brand-navy">
                  {product.universityName}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 p-3">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <BookOpen className="h-3.5 w-3.5 text-brand-blue" />
                  Khoa / Ngành
                </span>
                <p className="mt-1 text-xs font-bold text-brand-navy">
                  {product.majorName}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 p-3">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <CheckCircle2 className="h-3.5 w-3.5 text-brand-green" />
                  Môn học / Học phần
                </span>
                <p className="mt-1 text-xs font-bold text-brand-navy">
                  {product.courseName
                    ? `${product.courseCode} – ${product.courseName}`
                    : "Dùng chung mọi ngành"}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200/80 p-3">
                <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
                  <MapPin className="h-3.5 w-3.5 text-brand-green" />
                  Khóa &amp; Tủ đề xuất
                </span>
                <p className="mt-1 truncate text-xs font-bold text-brand-navy">
                  {product.cohort} • {product.preferredLockerName}
                </p>
              </div>
            </div>

            {/* Primary CTAs (Buyer vs Owner) */}
            <div className="mt-6">
              {!showOwnerControls ? (
                <div className="flex flex-wrap items-center gap-3">
                  {product.status === "AVAILABLE" ? (
                    <Button
                      asChild
                      size="lg"
                      className="flex-1 sm:flex-none sm:px-8"
                    >
                      <Link href={`/checkout/${product.id}`}>
                        <ShoppingBag className="h-4 w-4" />
                        <span>Mua ngay</span>
                      </Link>
                    </Button>
                  ) : product.status === "RESERVED" ? (
                    <Button
                      type="button"
                      size="lg"
                      disabled
                      className="flex-1 sm:flex-none sm:px-8"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Đã có người đặt</span>
                    </Button>
                  ) : product.status === "SOLD" ? (
                    <Button
                      type="button"
                      size="lg"
                      disabled
                      className="flex-1 sm:flex-none sm:px-8"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Đã bán</span>
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      size="lg"
                      disabled
                      className="flex-1 sm:flex-none sm:px-8"
                    >
                      <ShoppingBag className="h-4 w-4" />
                      <span>Tạm ngừng giao dịch</span>
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="secondary"
                    size="lg"
                    disabled={isPending}
                    onClick={handleMessageSeller}
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>Nhắn người bán</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="lg"
                    onClick={() => toggleFavorite(product.id, product.title)}
                    aria-pressed={liked}
                    className={cn(
                      liked &&
                        "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100",
                    )}
                  >
                    <Heart
                      className={cn("h-4 w-4", liked && "fill-rose-500")}
                    />
                    <span>{liked ? "Đã lưu sản phẩm" : "Lưu sản phẩm"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleShare}
                    aria-label="Chia sẻ sản phẩm"
                  >
                    <Share2 className="h-4 w-4" />
                  </Button>

                  {!product.isDemo && (
                    <ReportButtonModal
                      targetType="PRODUCT"
                      targetId={product.id}
                      buttonLabel="Báo cáo sản phẩm"
                      variant="ghost"
                    />
                  )}
                </div>
              ) : (
                <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                  <p className="text-xs font-bold text-amber-900">
                    {isActualOwner
                      ? "Quản lý tin đăng dành cho Chủ sản phẩm:"
                      : "Xem trước bảng điều khiển dành cho Chủ sản phẩm (Demo):"}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {isActualOwner ? (
                      <>
                        <Button asChild>
                          <Link href={`/products/${product.id}/edit`}>
                            <Edit3 className="h-4 w-4" />
                            <span>Chỉnh sửa sản phẩm</span>
                          </Link>
                        </Button>

                        <Button
                          type="button"
                          variant="outline"
                          disabled={isPending}
                          onClick={handleToggleRealVisibility}
                        >
                          {product.status === "HIDDEN" ? (
                            <>
                              <Eye className="h-4 w-4" />
                              <span>Hiện lại sản phẩm</span>
                            </>
                          ) : (
                            <>
                              <EyeOff className="h-4 w-4" />
                              <span>Ẩn sản phẩm</span>
                            </>
                          )}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button asChild>
                          <Link href="/my-products">
                            <Edit3 className="h-4 w-4" />
                            <span>Quản lý Sản phẩm của tôi</span>
                          </Link>
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() =>
                            showToast({
                              title: "Sản phẩm mẫu trình diễn",
                              description:
                                "Đăng nhập và đăng sản phẩm thật tại /sell để chỉnh sửa hoặc ẩn/hiện sản phẩm của bạn.",
                              variant: "info",
                            })
                          }
                        >
                          <EyeOff className="h-4 w-4" />
                          <span>Ẩn sản phẩm (Demo)</span>
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Product Description & Highlights */}
            <div className="mt-7 border-t border-slate-100 pt-6">
              <h2 className="text-base font-extrabold text-brand-navy">
                Mô tả chi tiết &amp; Tình trạng thực tế
              </h2>
              <p className="mt-2.5 whitespace-pre-line text-sm leading-relaxed text-slate-700">
                {product.description}
              </p>

              <ul className="mt-4 space-y-2">
                {product.highlights.map((point, index) => (
                  <li
                    key={index}
                    className="flex items-start gap-2.5 text-sm text-slate-700"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-green" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Seller Profile Card */}
            <div className="mt-7 rounded-2xl border border-slate-200/90 bg-slate-50/70 p-5">
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                <div className="flex items-center gap-3.5">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-lg font-extrabold text-white">
                    {product.seller.fullName.charAt(0)}
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-brand-navy">
                        {!product.isDemo ? (
                          <Link
                            href={`/profile/${product.sellerId}`}
                            className="hover:text-brand-blue hover:underline"
                          >
                            {product.seller.fullName}
                          </Link>
                        ) : (
                          product.seller.fullName
                        )}
                      </h3>
                      {product.seller.emailVerified && (
                        <Badge variant="eco" className="gap-1">
                          <ShieldCheck className="h-3 w-3" />
                          {product.isDemo
                            ? "Email đã xác minh (Demo)"
                            : "Email đã xác minh"}
                        </Badge>
                      )}
                      {product.seller.campusVerifiedDemo ? (
                        <Badge variant="secondary" className="gap-1">
                          <UserCheck className="h-3 w-3" />
                          {product.isDemo
                            ? "Hồ sơ SV mẫu"
                            : "Đã xác thực bởi trường"}
                        </Badge>
                      ) : (
                        !product.isDemo && (
                          <Badge variant="outline" className="gap-1">
                            Chưa xác thực bởi nhà trường
                          </Badge>
                        )
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-slate-600">
                      Ngành {product.seller.majorName} ({product.seller.cohort})
                      • {product.seller.universityName}
                    </p>
                  </div>
                </div>

                {/* Seller Stats: Rating, Transactions, Eco-Points */}
                <div className="flex items-center gap-4 border-t border-slate-200/80 pt-3 sm:border-t-0 sm:pt-0">
                  <div className="text-center">
                    <p className="flex items-center justify-center gap-1 text-base font-extrabold text-brand-navy">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {product.seller.ratingAvg.toFixed(1)}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {product.seller.ratingCount} đánh giá
                    </p>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-200" />
                  <div className="text-center">
                    <p className="text-base font-extrabold text-brand-navy">
                      {product.seller.completedTransactions}
                    </p>
                    <p className="text-[11px] text-slate-500">Giao dịch</p>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-200" />
                  <div className="text-center">
                    <p className="flex items-center justify-center gap-1 text-base font-extrabold text-brand-green">
                      <Leaf className="h-4 w-4" />
                      {product.seller.ecoPoints}
                    </p>
                    <p className="text-[11px] text-slate-500">Eco-Points</p>
                  </div>
                </div>
              </div>

              {product.seller.bio && (
                <p className="mt-3 border-t border-slate-200/70 pt-3 text-xs italic text-slate-600">
                  “{product.seller.bio}”
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Related Products Section */}
      {relatedProducts.length > 0 && (
        <section
          aria-labelledby="related-products-heading"
          className="mt-12 border-t border-slate-200 pt-10"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">
                Gợi ý cùng học phần &amp; danh mục
              </p>
              <h2
                id="related-products-heading"
                className="mt-1 text-2xl font-extrabold text-brand-navy"
              >
                Sản phẩm liên quan
              </h2>
            </div>
            <Link
              href={`/products?category=${product.categorySlug}`}
              className="text-sm font-semibold text-brand-blue hover:underline"
            >
              Xem thêm →
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {relatedProducts.map((rel) => (
              <ProductCard key={rel.id} product={rel} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
