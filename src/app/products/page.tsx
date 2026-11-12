import React, { Suspense } from "react";
import type { Metadata } from "next";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { MarketplaceExplorer } from "@/components/marketplace/marketplace-explorer";
import { ProductGridSkeleton } from "@/components/products/product-skeleton";
import { fetchMarketplaceCatalog } from "@/features/marketplace/product-repository";

export const metadata: Metadata = {
  title: "Khám phá Marketplace Sinh Viên",
  description:
    "Tìm kiếm và lọc giáo trình, máy tính cầm tay, dụng cụ học tập, đồ dùng ký túc xá theo Trường → Ngành → Môn học → Khóa tại Đại học Cần Thơ.",
};

export default async function ProductsPage() {
  const catalog = await fetchMarketplaceCatalog();

  return (
    <div className="container py-4">
      <Breadcrumbs items={[{ label: "Khám phá Marketplace" }]} />

      <div className="mt-1">
        <h1 className="text-2xl font-extrabold tracking-tight text-brand-navy sm:text-3xl">
          Khám phá đồ dùng &amp; giáo trình sinh viên
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Lọc theo Trường → Khoa/Ngành → Môn học → Khóa và nhận hàng thuận tiện
          qua trạm Smart Locker nội khu.
        </p>
      </div>

      <Suspense fallback={<ProductGridSkeleton count={6} />}>
        <MarketplaceExplorer
          initialProducts={catalog.activeProducts}
          dataSource={catalog.dataSource}
        />
      </Suspense>
    </div>
  );
}
