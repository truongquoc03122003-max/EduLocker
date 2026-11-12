import React from "react";
import Link from "next/link";
import {
  Backpack,
  BookOpen,
  Calculator,
  Compass,
  Cpu,
  Headphones,
  LampDesk,
  Library,
  PlugZap,
} from "lucide-react";
import type { Category, CategorySlug } from "@/types";

const categoryIconMap: Record<CategorySlug, React.ElementType> = {
  "giao-trinh": BookOpen,
  sach: Library,
  "dung-cu-hoc-tap": Compass,
  "may-tinh-cam-tay": Calculator,
  "do-dien-tu": Cpu,
  "do-ktx": LampDesk,
  "do-gia-dung": PlugZap,
  "phu-kien": Headphones,
  khac: Backpack,
};

export function CategorySection({ categories }: { categories: Category[] }) {
  return (
    <section aria-labelledby="categories-heading" className="py-10">
      <div className="container">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-brand-blue">
              Danh mục chuyên biệt cho Campus
            </p>
            <h2
              id="categories-heading"
              className="mt-1 text-2xl font-extrabold text-brand-navy"
            >
              Khám phá theo nhu cầu sinh viên
            </h2>
          </div>
          <Link
            href="/products"
            className="text-sm font-semibold text-brand-blue hover:underline"
          >
            Xem tất cả danh mục →
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-9">
          {categories.map((cat) => {
            const Icon = categoryIconMap[cat.slug] ?? BookOpen;
            return (
              <Link
                key={cat.id}
                href={`/products?category=${cat.slug}`}
                className="group flex flex-col items-center rounded-2xl border border-slate-200/80 bg-white p-4 text-center shadow-sm transition-all hover:-translate-y-0.5 hover:border-brand-blue hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-blue"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-blue-light text-brand-blue transition-colors group-hover:bg-brand-blue group-hover:text-white">
                  <Icon className="h-6 w-6" />
                </span>
                <span className="mt-3 text-xs font-bold text-brand-navy group-hover:text-brand-blue sm:text-sm">
                  {cat.name}
                </span>
                <span className="mt-1 line-clamp-1 text-[11px] text-slate-500">
                  {cat.productCount} sản phẩm
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
