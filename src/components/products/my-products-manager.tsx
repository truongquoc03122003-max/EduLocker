"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Edit3,
  ExternalLink,
  Eye,
  EyeOff,
  PackageOpen,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  deleteProductAction,
  toggleProductVisibilityAction,
} from "@/features/marketplace/product-actions";
import { formatRelativeTimeVi, formatVND } from "@/lib/utils";
import type { Product } from "@/types";

interface MyProductsManagerProps {
  initialProducts: Product[];
}

export function MyProductsManager({ initialProducts }: MyProductsManagerProps) {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleToggleVisibility = async (product: Product) => {
    setErrorMessage(null);
    setBusyId(product.id);
    const nextStatus = product.status === "AVAILABLE" ? "HIDDEN" : "AVAILABLE";

    try {
      const result = await toggleProductVisibilityAction(
        product.id,
        nextStatus,
      );
      if (!result.success) {
        setErrorMessage(
          result.error ?? "Không thể thay đổi trạng thái hiển thị.",
        );
        return;
      }

      setProducts((prev) =>
        prev.map((item) =>
          item.id === product.id ? { ...item, status: nextStatus } : item,
        ),
      );
      router.refresh();
    } catch {
      setErrorMessage("Đã xảy ra lỗi khi cập nhật trạng thái sản phẩm.");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (product: Product) => {
    const confirmed = window.confirm(
      `Bạn có chắc chắn muốn xóa tin đăng "${product.title}"? Hình ảnh đính kèm trên Storage cũng sẽ được dọn sạch.`,
    );
    if (!confirmed) return;

    setErrorMessage(null);
    setBusyId(product.id);
    try {
      const result = await deleteProductAction(product.id);
      if (!result.success) {
        setErrorMessage(result.error ?? "Không thể xóa sản phẩm.");
        return;
      }

      setProducts((prev) => prev.filter((item) => item.id !== product.id));
      router.refresh();
    } catch {
      setErrorMessage("Đã xảy ra lỗi khi xóa sản phẩm.");
    } finally {
      setBusyId(null);
    }
  };

  if (products.length === 0) {
    return (
      <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue-light text-brand-blue">
          <PackageOpen className="h-8 w-8" />
        </div>
        <h2 className="mt-4 text-xl font-bold text-brand-navy">
          Bạn chưa đăng bán sản phẩm nào
        </h2>
        <p className="mt-2 max-w-md text-sm text-slate-600">
          Chia sẻ lại giáo trình, máy tính cầm tay hoặc đồ dùng KTX không còn sử
          dụng để giúp sinh viên khóa sau tiết kiệm chi phí.
        </p>
        <Button asChild className="mt-6">
          <Link href="/sell">
            <PlusCircle className="h-4 w-4" />
            <span>Đăng bán sản phẩm đầu tiên</span>
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      {errorMessage && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-semibold text-rose-700"
        >
          {errorMessage}
        </div>
      )}

      {products.map((product) => {
        const isBusy = busyId === product.id;
        return (
          <div
            key={product.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm sm:flex-row sm:items-center"
          >
            <div className="flex items-start gap-4">
              <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                <Image
                  src={product.thumbnailUrl}
                  alt={product.title}
                  fill
                  sizes="80px"
                  className="object-cover"
                />
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    variant={
                      product.status === "AVAILABLE"
                        ? "eco"
                        : product.status === "HIDDEN"
                          ? "warning"
                          : "secondary"
                    }
                  >
                    {product.status === "AVAILABLE"
                      ? "Đang hiển thị"
                      : product.status === "HIDDEN"
                        ? "Đang ẩn"
                        : product.status}
                  </Badge>
                  <Badge variant="outline">{product.categoryName}</Badge>
                  {product.courseCode && (
                    <Badge variant="default">{product.courseCode}</Badge>
                  )}
                </div>

                <Link
                  href={`/products/${product.slug}`}
                  className="mt-1.5 block text-base font-extrabold text-brand-navy hover:text-brand-blue"
                >
                  {product.title}
                </Link>

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <span className="font-extrabold text-brand-blue">
                    {formatVND(product.price)}
                  </span>
                  <span>•</span>
                  <span>Đăng {formatRelativeTimeVi(product.createdAt)}</span>
                  <span>•</span>
                  <span>{product.preferredLockerName}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:shrink-0">
              <Button asChild variant="outline" size="sm">
                <Link href={`/products/${product.slug}`}>
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Xem</span>
                </Link>
              </Button>

              <Button asChild variant="outline" size="sm">
                <Link href={`/products/${product.id}/edit`}>
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>Chỉnh sửa</span>
                </Link>
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={() => handleToggleVisibility(product)}
              >
                {product.status === "AVAILABLE" ? (
                  <>
                    <EyeOff className="h-3.5 w-3.5 text-amber-600" />
                    <span>Ẩn tin</span>
                  </>
                ) : (
                  <>
                    <Eye className="h-3.5 w-3.5 text-emerald-600" />
                    <span>Hiện tin</span>
                  </>
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isBusy}
                onClick={() => handleDelete(product)}
                className="border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Xóa</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
