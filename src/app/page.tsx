import React from "react";
import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Clock,
  Database,
  Flame,
  Sparkles,
} from "lucide-react";
import { HeroSection } from "@/components/marketplace/hero-section";
import { CategorySection } from "@/components/marketplace/category-section";
import { SmartLockerBanner } from "@/components/marketplace/smart-locker-banner";
import { CircularEconomySection } from "@/components/marketplace/circular-economy-section";
import { ProductCard } from "@/components/products/product-card";
import { Badge } from "@/components/ui/badge";
import { fetchMarketplaceCatalog } from "@/features/marketplace/product-repository";
import {
  getAllCategories,
  getHomePageSections,
  getLockerLocations,
} from "@/features/marketplace/product-service";

export default async function HomePage() {
  const catalog = await fetchMarketplaceCatalog();
  const categories = getAllCategories(catalog.activeProducts);
  const sections = getHomePageSections(catalog.activeProducts);
  const lockers = getLockerLocations();

  return (
    <div>
      {/* 1. Hero + Large Search Bar */}
      <HeroSection />

      {/* 2. Categories (9 Campus Categories) */}
      <CategorySection categories={categories} />

      {/* Data Source Transparency Notice */}
      <div className="container pt-2">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200/80 bg-white px-4 py-2.5 text-xs text-slate-600 shadow-sm">
          <div className="flex items-center gap-2">
            {catalog.dataSource === "supabase-real" ? (
              <Badge variant="eco" className="gap-1">
                <Database className="h-3 w-3" />
                Dữ liệu thật (Supabase DB)
              </Badge>
            ) : (
              <Badge variant="warning" className="gap-1">
                <Sparkles className="h-3 w-3" />
                Sản phẩm mẫu / Dữ liệu trình diễn
              </Badge>
            )}
            <span>
              {catalog.dataSource === "supabase-real"
                ? "Đang hiển thị tin đăng thực tế của sinh viên từ cơ sở dữ liệu Supabase."
                : "Đang hiển thị bộ dữ liệu mẫu định hướng triển khai tại Đại học Cần Thơ. Đăng bài mới tại /sell để lưu sản phẩm thật."}
            </span>
          </div>
          <Link
            href="/sell"
            className="font-bold text-brand-blue hover:underline"
          >
            Đăng sản phẩm mới →
          </Link>
        </div>
      </div>

      {/* 3. Section: Dành cho bạn */}
      <section aria-labelledby="section-for-you" className="py-8">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-blue">
                <Sparkles className="h-3.5 w-3.5" />
                Gợi ý cá nhân hóa tại Đại học Cần Thơ
              </p>
              <h2
                id="section-for-you"
                className="mt-1 text-2xl font-extrabold text-brand-navy"
              >
                Dành cho bạn
              </h2>
            </div>
            <Link
              href="/products"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
            >
              <span>Xem tất cả</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sections.forYou.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Section: Mới đăng */}
      <section aria-labelledby="section-newest" className="py-8">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-green">
                <Clock className="h-3.5 w-3.5" />
                Cập nhật liên tục trong ngày
              </p>
              <h2
                id="section-newest"
                className="mt-1 text-2xl font-extrabold text-brand-navy"
              >
                Mới đăng
              </h2>
            </div>
            <Link
              href="/products?sort=newest"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
            >
              <span>Xem tin mới nhất</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sections.newest.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 5. Smart Locker Highlight Banner */}
      <SmartLockerBanner lockers={lockers} />

      {/* 6. Section: Giá tốt hôm nay */}
      <section aria-labelledby="section-best-deals" className="py-8">
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-amber-600">
                <Flame className="h-3.5 w-3.5" />
                Tiết kiệm từ 50% – 65% so với mua mới
              </p>
              <h2
                id="section-best-deals"
                className="mt-1 text-2xl font-extrabold text-brand-navy"
              >
                Giá tốt hôm nay
              </h2>
            </div>
            <Link
              href="/products?sort=price-asc"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
            >
              <span>Săn giá tiết kiệm</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sections.bestDeals.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 7. Section: Giáo trình phổ biến */}
      <section
        aria-labelledby="section-popular-textbooks"
        className="pb-12 pt-8"
      >
        <div className="container">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-blue">
                <BookOpen className="h-3.5 w-3.5" />
                Giáo trình đại cương &amp; cơ sở ngành CTU
              </p>
              <h2
                id="section-popular-textbooks"
                className="mt-1 text-2xl font-extrabold text-brand-navy"
              >
                Giáo trình phổ biến
              </h2>
            </div>
            <Link
              href="/products?category=giao-trinh"
              className="inline-flex items-center gap-1 text-sm font-semibold text-brand-blue hover:underline"
            >
              <span>Xem tất cả giáo trình</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {sections.popularTextbooks.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </div>
      </section>

      {/* 8. Circular Economy Section */}
      <CircularEconomySection />
    </div>
  );
}
