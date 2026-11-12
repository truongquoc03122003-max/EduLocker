"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Heart, Sparkles } from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ProductCard } from "@/components/products/product-card";
import { Button } from "@/components/ui/button";
import { PRODUCTS } from "@/features/marketplace/mock-data";
import { mapDatabaseRowToProduct } from "@/features/marketplace/product-mapper";
import { useAppUI } from "@/hooks/use-app-ui";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Product } from "@/types";

export default function FavoritesPage() {
  const { favoriteIds, isSupabaseConfigured } = useAppUI();
  const [dbFavoriteProducts, setDbFavoriteProducts] = useState<Product[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function loadDbFavorites() {
      if (!isSupabaseConfigured || favoriteIds.length === 0) {
        setDbFavoriteProducts([]);
        return;
      }

      const supabase = createSupabaseBrowserClient();
      if (!supabase) return;

      const mockIds = new Set(PRODUCTS.map((p) => p.id));
      const dbCandidateIds = favoriteIds.filter((id) => !mockIds.has(id));
      if (dbCandidateIds.length === 0) {
        setDbFavoriteProducts([]);
        return;
      }

      const [{ data: productRows }, { data: imageRows }] = await Promise.all([
        supabase.from("products").select("*").in("id", dbCandidateIds),
        supabase
          .from("product_images")
          .select("*")
          .in("product_id", dbCandidateIds)
          .order("display_order", { ascending: true }),
      ]);

      if (!cancelled && productRows) {
        const mapped = productRows.map((row) =>
          mapDatabaseRowToProduct(
            row,
            null,
            (imageRows ?? []).filter((img) => img.product_id === row.id),
          ),
        );
        setDbFavoriteProducts(mapped);
      }
    }

    void loadDbFavorites();
    return () => {
      cancelled = true;
    };
  }, [favoriteIds, isSupabaseConfigured]);

  const favoriteProducts = useMemo(() => {
    const combined = [...dbFavoriteProducts, ...PRODUCTS];
    const mapById = new Map<string, Product>();
    for (const item of combined) {
      mapById.set(item.id, item);
    }
    return favoriteIds
      .map((id) => mapById.get(id))
      .filter((item): item is Product => Boolean(item));
  }, [dbFavoriteProducts, favoriteIds]);

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs items={[{ label: "Sản phẩm yêu thích" }]} />

      <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
            Sản phẩm đã lưu ({favoriteProducts.length})
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Danh sách giáo trình, dụng cụ học tập và đồ dùng KTX bạn đang quan
            tâm.
          </p>
        </div>

        <Button asChild variant="outline">
          <Link href="/products">
            <span>Khám phá thêm sản phẩm</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>

      {favoriteProducts.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {favoriteProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      ) : (
        <div className="mt-8 flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
            <Heart className="h-8 w-8" />
          </div>
          <h2 className="mt-4 text-xl font-bold text-brand-navy">
            Bạn chưa lưu sản phẩm nào
          </h2>
          <p className="mt-2 max-w-md text-sm text-slate-600">
            Nhấn vào biểu tượng trái tim trên bất kỳ thẻ sản phẩm nào để lưu lại
            giáo trình hoặc đồ dùng KTX bạn muốn theo dõi.
          </p>
          <Button asChild className="mt-6">
            <Link href="/products">
              <Sparkles className="h-4 w-4" />
              <span>Khám phá Marketplace ngay</span>
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
