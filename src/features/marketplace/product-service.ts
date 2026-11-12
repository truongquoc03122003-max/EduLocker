import {
  CATEGORIES,
  COHORTS,
  COURSES,
  LOCKER_LOCATIONS,
  MAJORS,
  PRODUCTS,
  UNIVERSITIES,
} from "@/features/marketplace/mock-data";
import type {
  Category,
  CategorySlug,
  Course,
  LockerLocation,
  Major,
  Product,
  ProductCondition,
  ProductFilterParams,
  ProductSortOption,
  University,
} from "@/types";

const VALID_CONDITIONS: readonly ProductCondition[] = [
  "LIKE_NEW",
  "GOOD",
  "FAIR",
  "WELL_USED",
];

const VALID_SORTS: readonly ProductSortOption[] = [
  "newest",
  "price-asc",
  "price-desc",
  "popular",
];

/**
 * Tính toán động productCount từ danh sách sản phẩm khả dụng (không bị HIDDEN/DRAFT)
 * để tránh lệch dữ liệu giữa DB thật và dữ liệu mẫu.
 */
export function getAllCategories(sourceProducts: Product[] = PRODUCTS): Category[] {
  const visibleProducts = sourceProducts.filter(
    (p) => p.status !== "HIDDEN" && p.status !== "DRAFT",
  );
  return CATEGORIES.map((cat) => ({
    ...cat,
    productCount: visibleProducts.filter((p) => p.categorySlug === cat.slug)
      .length,
  }));
}

export function getAllUniversities(): University[] {
  return UNIVERSITIES;
}

export function getAllMajors(universityId?: string): Major[] {
  if (universityId && universityId !== "all") {
    return MAJORS.filter((m) => m.universityId === universityId);
  }
  return MAJORS;
}

export function getAllCourses(
  majorId?: string,
  universityId?: string,
): Course[] {
  let list = COURSES;
  if (universityId && universityId !== "all") {
    const validMajorIds = new Set(
      MAJORS.filter((m) => m.universityId === universityId).map((m) => m.id),
    );
    list = list.filter((c) => validMajorIds.has(c.majorId));
  }
  if (majorId && majorId !== "all") {
    list = list.filter((c) => c.majorId === majorId);
  }
  return list;
}

export function getAllCohorts(): readonly string[] {
  return COHORTS;
}

/**
 * Tính toán động availableCompartments và totalCompartments từ mảng compartments thực tế.
 */
export function getLockerLocations(): LockerLocation[] {
  return LOCKER_LOCATIONS.map((loc) => ({
    ...loc,
    totalCompartments: loc.compartments.length,
    availableCompartments: loc.compartments.filter(
      (c) => c.status === "AVAILABLE",
    ).length,
  }));
}

/**
 * Chuẩn hóa và kiểm tra hợp lệ các tham số lọc từ URL query string hoặc state.
 */
export function normalizeProductFilterParams(
  raw: Record<string, string | number | undefined | null>,
): Required<
  Pick<
    ProductFilterParams,
    | "q"
    | "category"
    | "condition"
    | "university"
    | "major"
    | "course"
    | "cohort"
    | "sort"
    | "page"
    | "pageSize"
  >
> & {
  minPrice?: number;
  maxPrice?: number;
} {
  const q = typeof raw.q === "string" ? raw.q.trim() : "";

  const rawCategory = typeof raw.category === "string" ? raw.category : "all";
  const isValidCategory = CATEGORIES.some((c) => c.slug === rawCategory);
  const category: CategorySlug | "all" = isValidCategory
    ? (rawCategory as CategorySlug)
    : "all";

  const rawCondition =
    typeof raw.condition === "string" ? raw.condition : "all";
  const condition: ProductCondition | "all" = VALID_CONDITIONS.includes(
    rawCondition as ProductCondition,
  )
    ? (rawCondition as ProductCondition)
    : "all";

  const rawSort = typeof raw.sort === "string" ? raw.sort : "newest";
  const sort: ProductSortOption = VALID_SORTS.includes(
    rawSort as ProductSortOption,
  )
    ? (rawSort as ProductSortOption)
    : "newest";

  const parsedPage = Number(raw.page);
  const page =
    Number.isFinite(parsedPage) && parsedPage >= 1 ? Math.floor(parsedPage) : 1;

  const parsedPageSize = Number(raw.pageSize);
  const pageSize =
    Number.isFinite(parsedPageSize) && parsedPageSize >= 1
      ? Math.floor(parsedPageSize)
      : 9;

  const parsePrice = (val: string | number | undefined | null) => {
    if (val === undefined || val === null || String(val).trim() === "") {
      return undefined;
    }
    const num = Number(val);
    if (!Number.isFinite(num) || num < 0) {
      return undefined;
    }
    return Math.floor(num);
  };

  let minPrice = parsePrice(raw.minPrice);
  let maxPrice = parsePrice(raw.maxPrice);

  if (
    minPrice !== undefined &&
    maxPrice !== undefined &&
    minPrice > maxPrice
  ) {
    const temp = minPrice;
    minPrice = maxPrice;
    maxPrice = temp;
  }

  // Academic hierarchy validation: University -> Major -> Course
  const rawUni = typeof raw.university === "string" ? raw.university : "all";
  const university = UNIVERSITIES.some((u) => u.id === rawUni) ? rawUni : "all";

  const rawMajor = typeof raw.major === "string" ? raw.major : "all";
  const matchedMajor = MAJORS.find((m) => m.id === rawMajor);
  const major =
    matchedMajor &&
    (university === "all" || matchedMajor.universityId === university)
      ? matchedMajor.id
      : "all";

  const rawCourse = typeof raw.course === "string" ? raw.course : "all";
  const matchedCourse = COURSES.find((c) => c.id === rawCourse);
  const matchedCourseMajor = matchedCourse
    ? MAJORS.find((m) => m.id === matchedCourse.majorId)
    : undefined;
  const course =
    matchedCourse &&
    (major === "all" || matchedCourse.majorId === major) &&
    (university === "all" || matchedCourseMajor?.universityId === university)
      ? matchedCourse.id
      : "all";

  const rawCohort = typeof raw.cohort === "string" ? raw.cohort : "all";
  const cohort = (COHORTS as readonly string[]).includes(rawCohort)
    ? rawCohort
    : "all";

  return {
    q,
    category,
    condition,
    university,
    major,
    course,
    cohort,
    minPrice,
    maxPrice,
    sort,
    page,
    pageSize,
  };
}

export function getHomePageSections(sourceProducts: Product[] = PRODUCTS): {
  forYou: Product[];
  newest: Product[];
  bestDeals: Product[];
  popularTextbooks: Product[];
} {
  const available = sourceProducts.filter((p) => p.status === "AVAILABLE");

  const featured = available.filter((p) => p.isFeaturedForYou);
  const forYou = (featured.length > 0 ? featured : available).slice(0, 4);

  const newest = [...available]
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    .slice(0, 4);

  const dealsPool = available.filter((p) => p.isBestDealToday);
  const bestDeals = [...(dealsPool.length > 0 ? dealsPool : available)]
    .sort((a, b) => a.price - b.price)
    .slice(0, 4);

  const textbooksPool = available.filter(
    (p) =>
      p.isPopularTextbook ||
      p.categorySlug === "giao-trinh" ||
      p.categorySlug === "sach",
  );
  const popularTextbooks = (
    textbooksPool.length > 0 ? textbooksPool : available
  ).slice(0, 4);

  return {
    forYou,
    newest,
    bestDeals,
    popularTextbooks,
  };
}

export function filterAndSortProducts(
  params: ProductFilterParams,
  sourceProducts: Product[] = PRODUCTS,
): {
  items: Product[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
} {
  const normalized = normalizeProductFilterParams({
    q: params.q,
    category: params.category,
    minPrice: params.minPrice,
    maxPrice: params.maxPrice,
    condition: params.condition,
    university: params.university,
    major: params.major,
    course: params.course,
    cohort: params.cohort,
    sort: params.sort,
    page: params.page,
    pageSize: params.pageSize,
  });

  const {
    q,
    category,
    minPrice,
    maxPrice,
    condition,
    university,
    major,
    course,
    cohort,
    sort,
    page,
    pageSize,
  } = normalized;

  const normalizedQuery = q.toLowerCase();

  const filtered = sourceProducts.filter((product) => {
    if (product.status === "HIDDEN" || product.status === "DRAFT") return false;

    if (normalizedQuery) {
      const searchableText = [
        product.title,
        product.description,
        product.categoryName,
        product.majorName,
        product.courseName ?? "",
        product.courseCode ?? "",
        product.universityName,
        product.preferredLockerName,
      ]
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(normalizedQuery)) {
        return false;
      }
    }

    if (category !== "all" && product.categorySlug !== category) {
      return false;
    }

    if (typeof minPrice === "number" && product.price < minPrice) {
      return false;
    }

    if (typeof maxPrice === "number" && product.price > maxPrice) {
      return false;
    }

    if (condition !== "all" && product.condition !== condition) {
      return false;
    }

    if (university !== "all" && product.universityId !== university) {
      return false;
    }

    if (major !== "all" && product.majorId !== major) {
      return false;
    }

    if (course !== "all" && product.courseId !== course) {
      return false;
    }

    if (cohort !== "all" && product.cohort !== cohort) {
      return false;
    }

    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    switch (sort) {
      case "price-asc":
        return a.price - b.price;
      case "price-desc":
        return b.price - a.price;
      case "popular":
        return (
          b.viewCount +
          b.favoriteCount * 3 -
          (a.viewCount + a.favoriteCount * 3)
        );
      case "newest":
      default:
        return (
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
    }
  });

  const totalCount = sorted.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const items = sorted.slice(startIndex, startIndex + pageSize);

  return {
    items,
    totalCount,
    totalPages,
    currentPage: safePage,
  };
}

export function getProductByIdOrSlug(
  idOrSlug: string,
  sourceProducts: Product[] = PRODUCTS,
): Product | undefined {
  return sourceProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug);
}

export function getRelatedProducts(
  product: Product,
  limit = 4,
  sourceProducts: Product[] = PRODUCTS,
): Product[] {
  return sourceProducts
    .filter(
      (p) =>
        p.id !== product.id &&
        p.status === "AVAILABLE" &&
        (p.categorySlug === product.categorySlug ||
          p.majorId === product.majorId),
    )
    .slice(0, limit);
}
