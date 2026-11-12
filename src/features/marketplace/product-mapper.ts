import {
  CATEGORIES,
  COURSES,
  LOCKER_LOCATIONS,
  MAJORS,
  PRODUCTS,
  UNIVERSITIES,
} from "@/features/marketplace/mock-data";
import type { Database } from "@/lib/supabase/database.types";
import type {
  CategorySlug,
  DeliveryMethod,
  Product,
  ProductCondition,
  ProductImage,
  ProductStatus,
  SellerProfile,
} from "@/types";
import { getConditionMeta } from "@/lib/utils";

export type ProductRow = Database["public"]["Tables"]["products"]["Row"];
export type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
export type ProductImageRow =
  Database["public"]["Tables"]["product_images"]["Row"];

const DEFAULT_FALLBACK_THUMBNAIL = "/images/products/giao-trinh-giai-tich.svg";

const CATEGORY_FALLBACK_THUMBNAIL: Record<CategorySlug, string> = {
  "giao-trinh": "/images/products/giao-trinh-giai-tich.svg",
  sach: "/images/products/sach-ctdl-gt.svg",
  "dung-cu-hoc-tap": "/images/products/bo-dung-cu-ve-ky-thuat.svg",
  "may-tinh-cam-tay": "/images/products/may-tinh-casio.svg",
  "do-dien-tu": "/images/products/breadboard.svg",
  "do-ktx": "/images/products/den-ban.svg",
  "do-gia-dung": "/images/products/noi-dien-mini.svg",
  "phu-kien": "/images/products/tai-nghe.svg",
  khac: "/images/products/balo-laptop-campus.svg",
};

export function mapDatabaseRowToProduct(
  row: ProductRow,
  profile: ProfileRow | null,
  imageRows: ProductImageRow[],
): Product {
  const categoryObj =
    CATEGORIES.find(
      (c) => c.id === row.category_id || c.slug === row.category_id,
    ) ?? CATEGORIES[0];
  const universityObj =
    UNIVERSITIES.find((u) => u.id === row.university_id) ?? UNIVERSITIES[0];
  const majorObj = MAJORS.find((m) => m.id === row.major_id) ?? MAJORS[0];
  const courseObj = row.course_id
    ? COURSES.find((c) => c.id === row.course_id)
    : undefined;
  const lockerObj =
    LOCKER_LOCATIONS.find((l) => l.id === row.preferred_locker_id) ??
    LOCKER_LOCATIONS[0];

  const conditionMeta = getConditionMeta(row.condition);
  const conditionLabel = `${conditionMeta.label} (${row.condition_percent}%)`;

  const sortedImages: ProductImage[] = [...imageRows]
    .sort((a, b) => a.display_order - b.display_order)
    .map((img) => ({
      id: img.id,
      productId: img.product_id,
      url: img.image_url,
      storagePath: img.storage_path,
      alt: img.alt_text,
      displayOrder: img.display_order,
    }));

  const fallbackThumb =
    CATEGORY_FALLBACK_THUMBNAIL[categoryObj.slug] ?? DEFAULT_FALLBACK_THUMBNAIL;

  const thumbnailUrl = sortedImages[0]?.url ?? fallbackThumb;

  const sellerUniversity = profile
    ? UNIVERSITIES.find((u) => u.id === profile.university_id)?.name ??
      universityObj.name
    : universityObj.name;
  const sellerMajor = profile
    ? MAJORS.find((m) => m.id === profile.major_id)?.name ?? majorObj.name
    : majorObj.name;

  const seller: SellerProfile = {
    id: row.seller_id,
    fullName: profile?.full_name ?? "Sinh viên EduLocker",
    avatarUrl: profile?.avatar_url || thumbnailUrl,
    universityId: profile?.university_id ?? row.university_id,
    universityName: sellerUniversity,
    majorId: profile?.major_id ?? row.major_id,
    majorName: sellerMajor,
    cohort: profile?.cohort ?? row.cohort,
    emailVerified: Boolean(profile?.email_verified),
    campusVerifiedDemo: Boolean(profile?.campus_verified),
    ratingAvg: Number(profile?.rating_avg ?? 5.0),
    ratingCount: Number(profile?.rating_count ?? 0),
    completedTransactions: Number(profile?.completed_transactions ?? 0),
    ecoPoints: Number(profile?.eco_points ?? 0),
    joinedAt: profile?.created_at ?? row.created_at,
    bio: profile?.bio ?? undefined,
  };

  const defaultHighlights = [
    `Tình trạng thực tế: ${conditionLabel}`,
    `Giao nhận đề xuất qua trạm ${lockerObj.name}`,
    courseObj
      ? `Phù hợp cho học phần ${courseObj.code} – ${courseObj.name}`
      : `Phù hợp cho sinh viên ngành ${majorObj.name} (${row.cohort})`,
  ];

  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    highlights:
      Array.isArray(row.highlights) && row.highlights.length > 0
        ? row.highlights
        : defaultHighlights,
    categoryId: categoryObj.id,
    categorySlug: categoryObj.slug,
    categoryName: categoryObj.name,
    price: row.price,
    originalPrice: row.original_price ?? undefined,
    condition: row.condition as ProductCondition,
    conditionLabel,
    conditionPercent: row.condition_percent,
    universityId: universityObj.id,
    universityName: universityObj.name,
    majorId: majorObj.id,
    majorName: majorObj.name,
    courseId: courseObj?.id,
    courseCode: courseObj?.code,
    courseName: courseObj?.name,
    cohort: row.cohort,
    sellerId: row.seller_id,
    seller,
    preferredLockerId: lockerObj.id,
    preferredLockerName: lockerObj.name,
    deliveryMethod: (row.delivery_method as DeliveryMethod) ?? "SMART_LOCKER",
    images:
      sortedImages.length > 0
        ? sortedImages
        : [
            {
              id: `${row.id}-fallback-img`,
              productId: row.id,
              url: thumbnailUrl,
              alt: row.title,
              displayOrder: 1,
            },
          ],
    thumbnailUrl,
    status: row.status as ProductStatus,
    isFeaturedForYou: true,
    isBestDealToday:
      row.original_price !== null && row.original_price > row.price,
    isPopularTextbook:
      categoryObj.slug === "giao-trinh" || categoryObj.slug === "sach",
    isDemo: false,
    viewCount: row.view_count,
    favoriteCount: row.favorite_count,
    createdAt: row.created_at,
  };
}

export function getDemoProductsWithFlag(): Product[] {
  return PRODUCTS.map((p) => ({ ...p, isDemo: true }));
}

