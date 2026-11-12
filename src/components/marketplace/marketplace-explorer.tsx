"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Database,
  Filter,
  GraduationCap,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/products/product-card";
import {
  filterAndSortProducts,
  getAllCategories,
  getAllCohorts,
  getAllCourses,
  getAllMajors,
  getAllUniversities,
  normalizeProductFilterParams,
} from "@/features/marketplace/product-service";
import type { MarketplaceCatalogResult } from "@/features/marketplace/product-repository";
import type {
  CategorySlug,
  Product,
  ProductCondition,
  ProductSortOption,
} from "@/types";
import { formatVND } from "@/lib/utils";

const PRICE_PRESETS = [
  { label: "Tất cả mức giá", min: undefined, max: undefined },
  { label: "Dưới 50.000 ₫", min: 0, max: 50000 },
  { label: "50.000 ₫ – 100.000 ₫", min: 50000, max: 100000 },
  { label: "Trên 100.000 ₫", min: 100000, max: undefined },
] as const;

const CONDITION_OPTIONS: { value: ProductCondition | "all"; label: string }[] =
  [
    { value: "all", label: "Tất cả tình trạng" },
    { value: "LIKE_NEW", label: "Như mới (95–99%)" },
    { value: "GOOD", label: "Còn tốt (85–94%)" },
    { value: "FAIR", label: "Khá tốt (75–84%)" },
    { value: "WELL_USED", label: "Đã qua sử dụng" },
  ];

const SORT_OPTIONS: { value: ProductSortOption; label: string }[] = [
  { value: "newest", label: "Mới nhất" },
  { value: "price-asc", label: "Giá thấp → cao" },
  { value: "price-desc", label: "Giá cao → thấp" },
  { value: "popular", label: "Phổ biến" },
];

interface MarketplaceExplorerProps {
  initialProducts?: Product[];
  dataSource?: MarketplaceCatalogResult["dataSource"];
}

export function MarketplaceExplorer({
  initialProducts,
  dataSource = "mock-fallback",
}: MarketplaceExplorerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const categories = useMemo(
    () => getAllCategories(initialProducts),
    [initialProducts],
  );
  const universities = useMemo(() => getAllUniversities(), []);
  const allMajors = useMemo(() => getAllMajors(), []);
  const allCourses = useMemo(() => getAllCourses(), []);
  const cohorts = useMemo(() => getAllCohorts(), []);

  // Normalize initial params from URL query string
  const initialNormalized = useMemo(
    () =>
      normalizeProductFilterParams({
        q: searchParams.get("q"),
        category: searchParams.get("category"),
        condition: searchParams.get("condition"),
        university: searchParams.get("university"),
        major: searchParams.get("major"),
        course: searchParams.get("course"),
        cohort: searchParams.get("cohort"),
        minPrice: searchParams.get("minPrice"),
        maxPrice: searchParams.get("maxPrice"),
        sort: searchParams.get("sort"),
        page: searchParams.get("page"),
      }),
    [searchParams],
  );

  const [q, setQ] = useState(initialNormalized.q);
  const [category, setCategory] = useState<CategorySlug | "all">(
    initialNormalized.category,
  );
  const [condition, setCondition] = useState<ProductCondition | "all">(
    initialNormalized.condition,
  );
  const [university, setUniversity] = useState<string>(
    initialNormalized.university,
  );
  const [major, setMajor] = useState<string>(initialNormalized.major);
  const [course, setCourse] = useState<string>(initialNormalized.course);
  const [cohort, setCohort] = useState<string>(initialNormalized.cohort);
  const [minPriceStr, setMinPriceStr] = useState<string>(
    initialNormalized.minPrice !== undefined
      ? String(initialNormalized.minPrice)
      : "",
  );
  const [maxPriceStr, setMaxPriceStr] = useState<string>(
    initialNormalized.maxPrice !== undefined
      ? String(initialNormalized.maxPrice)
      : "",
  );
  const [sort, setSort] = useState<ProductSortOption>(initialNormalized.sort);
  const [page, setPage] = useState<number>(initialNormalized.page);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const isSyncingFromUrl = useRef(false);

  // Sync state when URL query changes from external navigation (Header search, Category links, Back/Forward)
  useEffect(() => {
    isSyncingFromUrl.current = true;
    setQ(initialNormalized.q);
    setCategory(initialNormalized.category);
    setCondition(initialNormalized.condition);
    setUniversity(initialNormalized.university);
    setMajor(initialNormalized.major);
    setCourse(initialNormalized.course);
    setCohort(initialNormalized.cohort);
    setMinPriceStr(
      initialNormalized.minPrice !== undefined
        ? String(initialNormalized.minPrice)
        : "",
    );
    setMaxPriceStr(
      initialNormalized.maxPrice !== undefined
        ? String(initialNormalized.maxPrice)
        : "",
    );
    setSort(initialNormalized.sort);
    setPage(initialNormalized.page);
  }, [initialNormalized]);

  // Dependent Academic Lists (University -> Major -> Course)
  const filteredMajors = useMemo(
    () => getAllMajors(university),
    [university],
  );
  const filteredCourses = useMemo(
    () => getAllCourses(major, university),
    [major, university],
  );

  // Parse and normalize minPrice / maxPrice
  const normalizedState = useMemo(
    () =>
      normalizeProductFilterParams({
        q,
        category,
        condition,
        university,
        major,
        course,
        cohort,
        minPrice: minPriceStr,
        maxPrice: maxPriceStr,
        sort,
        page,
      }),
    [
      q,
      category,
      condition,
      university,
      major,
      course,
      cohort,
      minPriceStr,
      maxPriceStr,
      sort,
      page,
    ],
  );

  // Synchronize filter state back to URL query string so URL can be bookmarked/shared/refreshed
  useEffect(() => {
    if (isSyncingFromUrl.current) {
      isSyncingFromUrl.current = false;
      return;
    }

    const params = new URLSearchParams();
    if (normalizedState.q) params.set("q", normalizedState.q);
    if (normalizedState.category !== "all")
      params.set("category", normalizedState.category);
    if (normalizedState.condition !== "all")
      params.set("condition", normalizedState.condition);
    if (normalizedState.university !== "all")
      params.set("university", normalizedState.university);
    if (normalizedState.major !== "all")
      params.set("major", normalizedState.major);
    if (normalizedState.course !== "all")
      params.set("course", normalizedState.course);
    if (normalizedState.cohort !== "all")
      params.set("cohort", normalizedState.cohort);
    if (normalizedState.minPrice !== undefined)
      params.set("minPrice", String(normalizedState.minPrice));
    if (normalizedState.maxPrice !== undefined)
      params.set("maxPrice", String(normalizedState.maxPrice));
    if (normalizedState.sort !== "newest")
      params.set("sort", normalizedState.sort);
    if (normalizedState.page > 1)
      params.set("page", String(normalizedState.page));

    const nextQuery = params.toString();
    const currentQuery = searchParams.toString();
    if (nextQuery !== currentQuery) {
      const targetUrl = nextQuery ? `${pathname}?${nextQuery}` : pathname;
      router.replace(targetUrl, { scroll: false });
    }
  }, [normalizedState, pathname, router, searchParams]);

  const result = useMemo(
    () =>
      filterAndSortProducts(
        {
          ...normalizedState,
          pageSize: 9,
        },
        initialProducts,
      ),
    [normalizedState, initialProducts],
  );

  const handleUniversityChange = (nextUni: string) => {
    setUniversity(nextUni);
    // Reset major and course if they don't belong to the newly selected university
    if (nextUni !== "all") {
      const validMajorIds = new Set(
        allMajors
          .filter((m) => m.universityId === nextUni)
          .map((m) => m.id),
      );
      if (major !== "all" && !validMajorIds.has(major)) {
        setMajor("all");
        setCourse("all");
      } else if (course !== "all") {
        const currentCourseObj = allCourses.find((c) => c.id === course);
        if (!currentCourseObj || !validMajorIds.has(currentCourseObj.majorId)) {
          setCourse("all");
        }
      }
    }
    setPage(1);
  };

  const handleMajorChange = (nextMajor: string) => {
    setMajor(nextMajor);
    if (nextMajor !== "all" && course !== "all") {
      const currentCourseObj = allCourses.find((c) => c.id === course);
      if (!currentCourseObj || currentCourseObj.majorId !== nextMajor) {
        setCourse("all");
      }
    }
    setPage(1);
  };

  const handleResetFilters = () => {
    setQ("");
    setCategory("all");
    setCondition("all");
    setUniversity("all");
    setMajor("all");
    setCourse("all");
    setCohort("all");
    setMinPriceStr("");
    setMaxPriceStr("");
    setSort("newest");
    setPage(1);
    router.replace("/products", { scroll: false });
  };

  const activeFilterCount = [
    normalizedState.q !== "",
    normalizedState.category !== "all",
    normalizedState.condition !== "all",
    normalizedState.university !== "all",
    normalizedState.major !== "all",
    normalizedState.course !== "all",
    normalizedState.cohort !== "all",
    normalizedState.minPrice !== undefined ||
      normalizedState.maxPrice !== undefined,
  ].filter(Boolean).length;

  const renderFilterControls = () => (
    <div className="space-y-5">
      {/* Academic Tree Header */}
      <div className="rounded-xl border border-blue-200/80 bg-brand-blue-light/60 p-3.5">
        <p className="flex items-center gap-1.5 text-xs font-bold text-brand-blue">
          <GraduationCap className="h-4 w-4 shrink-0" />
          Cây đào tạo Campus
        </p>
        <p className="mt-1 text-[11px] leading-relaxed text-slate-600">
          Lọc phụ thuộc theo Trường → Ngành → Môn học → Khóa để tìm đúng tài
          liệu học phần của bạn.
        </p>
      </div>

      {/* University Filter */}
      <div>
        <label
          htmlFor="filter-university"
          className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
        >
          Trường đại học
        </label>
        <select
          id="filter-university"
          value={university}
          onChange={(e) => handleUniversityChange(e.target.value)}
          className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
        >
          <option value="all">Tất cả trường (Cụm Cần Thơ)</option>
          {universities.map((uni) => (
            <option key={uni.id} value={uni.id}>
              {uni.name}
            </option>
          ))}
        </select>
      </div>

      {/* Major Filter */}
      <div>
        <label
          htmlFor="filter-major"
          className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
        >
          Khoa / Ngành đào tạo
        </label>
        <select
          id="filter-major"
          value={major}
          onChange={(e) => handleMajorChange(e.target.value)}
          disabled={filteredMajors.length === 0}
          className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        >
          <option value="all">
            {filteredMajors.length > 0
              ? "Tất cả ngành học"
              : "Chưa có ngành mẫu cho trường này (Demo)"}
          </option>
          {filteredMajors.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>
      </div>

      {/* Course Filter */}
      <div>
        <label
          htmlFor="filter-course"
          className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
        >
          Môn học / Học phần
        </label>
        <select
          id="filter-course"
          value={course}
          onChange={(e) => {
            setCourse(e.target.value);
            setPage(1);
          }}
          disabled={filteredCourses.length === 0}
          className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
        >
          <option value="all">
            {filteredCourses.length > 0
              ? "Tất cả môn học"
              : "Chưa có môn học mẫu cho lựa chọn này"}
          </option>
          {filteredCourses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.code} – {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Cohort Filter */}
      <div>
        <span className="block text-xs font-bold uppercase tracking-wider text-brand-navy">
          Khóa sinh viên
        </span>
        <div className="mt-2 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setCohort("all");
              setPage(1);
            }}
            className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold transition-colors ${
              cohort === "all"
                ? "border-brand-blue bg-brand-blue text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            Tất cả
          </button>
          {cohorts.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => {
                setCohort(item);
                setPage(1);
              }}
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                cohort === item
                  ? "border-brand-blue bg-brand-blue text-white"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* Category Filter */}
      <div className="border-t border-slate-100 pt-4">
        <label
          htmlFor="filter-category"
          className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
        >
          Danh mục sản phẩm
        </label>
        <select
          id="filter-category"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value as CategorySlug | "all");
            setPage(1);
          }}
          className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
        >
          <option value="all">Tất cả danh mục (9)</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.slug}>
              {cat.name} ({cat.productCount})
            </option>
          ))}
        </select>
      </div>

      {/* Price Range Filter */}
      <div className="border-t border-slate-100 pt-4">
        <span className="block text-xs font-bold uppercase tracking-wider text-brand-navy">
          Khoảng giá (VNĐ)
        </span>
        <div className="mt-2 grid grid-cols-1 gap-1.5">
          {PRICE_PRESETS.map((preset) => {
            const isSelected =
              (preset.min === undefined ? "" : String(preset.min)) ===
                minPriceStr &&
              (preset.max === undefined ? "" : String(preset.max)) ===
                maxPriceStr;
            return (
              <button
                key={preset.label}
                type="button"
                onClick={() => {
                  setMinPriceStr(
                    preset.min === undefined ? "" : String(preset.min),
                  );
                  setMaxPriceStr(
                    preset.max === undefined ? "" : String(preset.max),
                  );
                  setPage(1);
                }}
                className={`rounded-xl border px-3 py-2 text-left text-xs font-semibold transition-colors ${
                  isSelected
                    ? "border-brand-blue bg-brand-blue-light text-brand-blue"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="min-price-input" className="sr-only">
              Giá từ
            </label>
            <Input
              id="min-price-input"
              type="number"
              min={0}
              step={5000}
              value={minPriceStr}
              onChange={(e) => {
                setMinPriceStr(e.target.value);
                setPage(1);
              }}
              placeholder="Từ (VNĐ)"
              className="h-9 text-xs"
            />
          </div>
          <div>
            <label htmlFor="max-price-input" className="sr-only">
              Giá đến
            </label>
            <Input
              id="max-price-input"
              type="number"
              min={0}
              step={5000}
              value={maxPriceStr}
              onChange={(e) => {
                setMaxPriceStr(e.target.value);
                setPage(1);
              }}
              placeholder="Đến (VNĐ)"
              className="h-9 text-xs"
            />
          </div>
        </div>
      </div>

      {/* Condition Filter */}
      <div className="border-t border-slate-100 pt-4">
        <label
          htmlFor="filter-condition"
          className="block text-xs font-bold uppercase tracking-wider text-brand-navy"
        >
          Tình trạng sản phẩm
        </label>
        <select
          id="filter-condition"
          value={condition}
          onChange={(e) => {
            setCondition(e.target.value as ProductCondition | "all");
            setPage(1);
          }}
          className="mt-2 h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-800 focus:border-brand-blue focus:outline-none focus:ring-2 focus:ring-brand-blue/20"
        >
          {CONDITION_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Reset Button */}
      <Button
        type="button"
        variant="outline"
        onClick={handleResetFilters}
        className="w-full"
      >
        <RotateCcw className="h-4 w-4" />
        <span>Đặt lại bộ lọc</span>
      </Button>
    </div>
  );

  return (
    <div className="py-6">
      {/* Top Search + Sort Toolbar */}
      <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              type="search"
              value={q}
              onChange={(e) => {
                setQ(e.target.value);
                setPage(1);
              }}
              placeholder="Bạn đang tìm giáo trình, máy tính hay đồ KTX? (VD: Giải tích, Casio, TN001...)"
              aria-label="Tìm kiếm trong Marketplace"
              className="h-11 pl-10 pr-10"
            />
            {q && (
              <button
                type="button"
                onClick={() => {
                  setQ("");
                  setPage(1);
                }}
                aria-label="Xóa từ khóa"
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Sort + Mobile Filter Button */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              className="lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4 text-brand-blue" />
              <span>Bộ lọc</span>
              {activeFilterCount > 0 && (
                <Badge variant="default" className="ml-1 px-1.5 py-0">
                  {activeFilterCount}
                </Badge>
              )}
            </Button>

            <div className="flex items-center gap-2">
              <label
                htmlFor="marketplace-sort"
                className="inline-flex items-center gap-1 text-xs font-bold text-slate-600"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-brand-blue" />
                <span>Sắp xếp:</span>
              </label>
              <select
                id="marketplace-sort"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value as ProductSortOption);
                  setPage(1);
                }}
                className="h-10 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-brand-navy focus:border-brand-blue focus:bg-white focus:outline-none"
              >
                {SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Category Quick Pills */}
        <div className="mt-3.5 flex items-center gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => {
              setCategory("all");
              setPage(1);
            }}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
              category === "all"
                ? "bg-brand-blue text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
            }`}
          >
            Tất cả danh mục
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setCategory(cat.slug);
                setPage(1);
              }}
              className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                category === cat.slug
                  ? "bg-brand-blue text-white shadow-sm"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200/70"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Mobile Filters Drawer */}
      {mobileFiltersOpen && (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-lg lg:hidden">
          <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="flex items-center gap-2 text-base font-bold text-brand-navy">
              <Filter className="h-4 w-4 text-brand-blue" />
              Bộ lọc học thuật &amp; sản phẩm
            </h2>
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(false)}
              aria-label="Đóng bộ lọc"
              className="rounded-lg p-1 text-slate-500 hover:bg-slate-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {renderFilterControls()}
        </div>
      )}

      {/* Main Layout: Sidebar (Desktop) + Product Grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Desktop Sidebar */}
        <aside
          aria-label="Bộ lọc tìm kiếm"
          className="hidden lg:col-span-3 lg:block"
        >
          <div className="sticky top-24 rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="flex items-center gap-2 text-sm font-extrabold uppercase tracking-wider text-brand-navy">
                <Filter className="h-4 w-4 text-brand-blue" />
                Bộ lọc chuyên sâu
              </h2>
              {activeFilterCount > 0 && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="text-xs font-semibold text-brand-blue hover:underline"
                >
                  Xóa ({activeFilterCount})
                </button>
              )}
            </div>
            {renderFilterControls()}
          </div>
        </aside>

        {/* Product Results Column */}
        <div className="lg:col-span-9">
          {/* Result Summary & Active Filter Chips */}
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm font-medium text-slate-600">
                Hiển thị{" "}
                <strong className="font-bold text-brand-navy">
                  {result.items.length}
                </strong>{" "}
                trên tổng số{" "}
                <strong className="font-bold text-brand-navy">
                  {result.totalCount}
                </strong>{" "}
                sản phẩm phù hợp
              </p>
              {dataSource === "supabase-real" ? (
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
            </div>

            {activeFilterCount > 0 && (
              <div className="flex flex-wrap items-center gap-1.5">
                {normalizedState.q && (
                  <Badge variant="secondary" className="gap-1">
                    Từ khóa: “{normalizedState.q}”
                  </Badge>
                )}
                {normalizedState.category !== "all" && (
                  <Badge variant="secondary">
                    Danh mục:{" "}
                    {
                      categories.find(
                        (c) => c.slug === normalizedState.category,
                      )?.name
                    }
                  </Badge>
                )}
                {normalizedState.university !== "all" && (
                  <Badge variant="secondary">
                    Trường:{" "}
                    {
                      universities.find(
                        (u) => u.id === normalizedState.university,
                      )?.shortName
                    }
                  </Badge>
                )}
                {normalizedState.major !== "all" && (
                  <Badge variant="secondary">
                    Ngành:{" "}
                    {
                      allMajors.find((m) => m.id === normalizedState.major)
                        ?.name
                    }
                  </Badge>
                )}
                {normalizedState.course !== "all" && (
                  <Badge variant="secondary">
                    Môn:{" "}
                    {
                      allCourses.find((c) => c.id === normalizedState.course)
                        ?.name
                    }
                  </Badge>
                )}
                {normalizedState.cohort !== "all" && (
                  <Badge variant="secondary">
                    Khóa: {normalizedState.cohort}
                  </Badge>
                )}
                {(normalizedState.minPrice !== undefined ||
                  normalizedState.maxPrice !== undefined) && (
                  <Badge variant="secondary">
                    Giá:{" "}
                    {normalizedState.minPrice !== undefined
                      ? formatVND(normalizedState.minPrice)
                      : "0 ₫"}{" "}
                    –{" "}
                    {normalizedState.maxPrice !== undefined
                      ? formatVND(normalizedState.maxPrice)
                      : "Tất cả"}
                  </Badge>
                )}
              </div>
            )}
          </div>

          {/* Grid or Empty State */}
          {result.items.length > 0 ? (
            <>
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {result.items.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>

              {/* Pagination */}
              {result.totalPages > 1 && (
                <nav
                  aria-label="Phân trang danh sách sản phẩm"
                  className="mt-8 flex items-center justify-center gap-2"
                >
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={result.currentPage <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    <span>Trang trước</span>
                  </Button>

                  <div className="flex items-center gap-1">
                    {Array.from(
                      { length: result.totalPages },
                      (_, idx) => idx + 1,
                    ).map((pageNum) => (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => setPage(pageNum)}
                        aria-current={
                          pageNum === result.currentPage ? "page" : undefined
                        }
                        className={`flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold transition-colors ${
                          pageNum === result.currentPage
                            ? "bg-brand-blue text-white shadow-sm"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        {pageNum}
                      </button>
                    ))}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={result.currentPage >= result.totalPages}
                    onClick={() =>
                      setPage((prev) => Math.min(result.totalPages, prev + 1))
                    }
                  >
                    <span>Trang sau</span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              )}
            </>
          ) : (
            /* Empty State */
            <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-blue-light text-brand-blue">
                <Sparkles className="h-8 w-8" />
              </div>
              <h3 className="mt-4 text-xl font-bold text-brand-navy">
                Không tìm thấy sản phẩm phù hợp với bộ lọc hiện tại
              </h3>
              <p className="mt-2 max-w-md text-sm text-slate-600">
                Hãy thử nới rộng khoảng giá, chọn “Tất cả trường / môn học” hoặc
                xóa từ khóa tìm kiếm để xem thêm các giáo trình và đồ dùng KTX
                mẫu định hướng triển khai tại Đại học Cần Thơ.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <Button type="button" onClick={handleResetFilters}>
                  <RotateCcw className="h-4 w-4" />
                  <span>Xóa toàn bộ bộ lọc</span>
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
