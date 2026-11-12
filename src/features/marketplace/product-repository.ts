import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import type { Product } from "@/types";
import {
  getDemoProductsWithFlag,
  mapDatabaseRowToProduct,
  type ProductImageRow,
  type ProfileRow,
} from "./product-mapper";

export { getDemoProductsWithFlag, mapDatabaseRowToProduct };

export interface MarketplaceCatalogResult {
  /** Sản phẩm thật từ cơ sở dữ liệu Supabase (nếu có) */
  realProducts: Product[];
  /** Sản phẩm mẫu trình diễn (Typed Mock Data) */
  demoProducts: Product[];
  /** Danh sách sản phẩm dùng để hiển thị chính trên UI */
  activeProducts: Product[];
  /** Nguồn dữ liệu hiện tại để hiển thị minh bạch trên UI */
  dataSource:
    | "supabase-real"
    | "supabase-empty-demo-fallback"
    | "mock-fallback";
  isSupabaseConfigured: boolean;
}

/**
 * Truy vấn danh sách sản phẩm cho Marketplace:
 * - Nếu Supabase chưa cấu hình -> trả về Typed Mock Data (`mock-fallback`).
 * - Nếu Supabase đã cấu hình:
 *   + Đọc sản phẩm AVAILABLE thật từ bảng `products`.
 *   + Nếu có sản phẩm thật -> ưu tiên hiển thị sản phẩm thật (`supabase-real`), không trộn lẫn với mock data.
 *   + Nếu DB chưa có sản phẩm thật -> trả về section dữ liệu mẫu có gắn nhãn rõ ràng (`supabase-empty-demo-fallback`).
 */
export async function fetchMarketplaceCatalog(): Promise<MarketplaceCatalogResult> {
  const demoProducts = getDemoProductsWithFlag();
  if (!isSupabaseConfigured()) {
    return {
      realProducts: [],
      demoProducts,
      activeProducts: demoProducts,
      dataSource: "mock-fallback",
      isSupabaseConfigured: false,
    };
  }

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return {
        realProducts: [],
        demoProducts,
        activeProducts: demoProducts,
        dataSource: "mock-fallback",
        isSupabaseConfigured: false,
      };
    }

    const { data: productRows, error } = await supabase
      .from("products")
      .select("*")
      .eq("status", "AVAILABLE")
      .order("created_at", { ascending: false });

    if (error || !productRows || productRows.length === 0) {
      return {
        realProducts: [],
        demoProducts,
        activeProducts: demoProducts,
        dataSource: "supabase-empty-demo-fallback",
        isSupabaseConfigured: true,
      };
    }

    const sellerIds = Array.from(new Set(productRows.map((p) => p.seller_id)));
    const productIds = productRows.map((p) => p.id);

    const [{ data: profilesData }, { data: imagesData }] = await Promise.all([
      supabase.from("profiles").select("*").in("id", sellerIds),
      supabase
        .from("product_images")
        .select("*")
        .in("product_id", productIds)
        .order("display_order", { ascending: true }),
    ]);

    const profileMap = new Map<string, ProfileRow>();
    for (const prof of profilesData ?? []) {
      profileMap.set(prof.id, prof);
    }

    const imagesByProduct = new Map<string, ProductImageRow[]>();
    for (const img of imagesData ?? []) {
      const list = imagesByProduct.get(img.product_id) ?? [];
      list.push(img);
      imagesByProduct.set(img.product_id, list);
    }

    const realProducts = productRows.map((row) =>
      mapDatabaseRowToProduct(
        row,
        profileMap.get(row.seller_id) ?? null,
        imagesByProduct.get(row.id) ?? [],
      ),
    );

    return {
      realProducts,
      demoProducts,
      activeProducts: realProducts,
      dataSource: "supabase-real",
      isSupabaseConfigured: true,
    };
  } catch {
    return {
      realProducts: [],
      demoProducts,
      activeProducts: demoProducts,
      dataSource: "supabase-empty-demo-fallback",
      isSupabaseConfigured: true,
    };
  }
}

/**
 * Truy vấn chi tiết 1 sản phẩm theo ID hoặc Slug:
 * - Kiểm tra trong Supabase trước (nếu đã cấu hình).
 * - Nếu là sản phẩm mẫu (hoặc chưa cấu hình Supabase), fallback tra cứu trong Typed Mock Data.
 */
export async function fetchProductByIdOrSlug(
  idOrSlug: string,
): Promise<{ product: Product | null; relatedProducts: Product[] }> {
  const demoProducts = getDemoProductsWithFlag();

  if (isSupabaseConfigured()) {
    try {
      const supabase = await createSupabaseServerClient();
      if (supabase) {
        const isUuid =
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            idOrSlug,
          );

        const query = supabase.from("products").select("*");
        const { data: row } = isUuid
          ? await query.eq("id", idOrSlug).maybeSingle()
          : await query.eq("slug", idOrSlug).maybeSingle();

        if (row) {
          const [{ data: profile }, { data: images }] = await Promise.all([
            supabase
              .from("profiles")
              .select("*")
              .eq("id", row.seller_id)
              .maybeSingle(),
            supabase
              .from("product_images")
              .select("*")
              .eq("product_id", row.id)
              .order("display_order", { ascending: true }),
          ]);

          const product = mapDatabaseRowToProduct(
            row,
            profile ?? null,
            images ?? [],
          );

          const catalog = await fetchMarketplaceCatalog();
          const relatedProducts = catalog.activeProducts
            .filter(
              (p) =>
                p.id !== product.id &&
                p.status === "AVAILABLE" &&
                (p.categorySlug === product.categorySlug ||
                  p.majorId === product.majorId),
            )
            .slice(0, 4);

          return { product, relatedProducts };
        }
      }
    } catch {
      // Fallback to demo lookup below
    }
  }

  const foundDemo =
    demoProducts.find((p) => p.id === idOrSlug || p.slug === idOrSlug) ?? null;
  if (!foundDemo) {
    return { product: null, relatedProducts: [] };
  }

  const relatedProducts = demoProducts
    .filter(
      (p) =>
        p.id !== foundDemo.id &&
        (p.categorySlug === foundDemo.categorySlug ||
          p.majorId === foundDemo.majorId),
    )
    .slice(0, 4);

  return { product: foundDemo, relatedProducts };
}

/**
 * Truy vấn danh sách sản phẩm thuộc quyền sở hữu của người bán đang đăng nhập (`/my-products`).
 */
export async function fetchMyProducts(userId: string): Promise<Product[]> {
  if (!isSupabaseConfigured()) return [];

  const supabase = await createSupabaseServerClient();
  if (!supabase) return [];

  const { data: rows, error } = await supabase
    .from("products")
    .select("*")
    .eq("seller_id", userId)
    .order("created_at", { ascending: false });

  if (error || !rows || rows.length === 0) {
    return [];
  }

  const productIds = rows.map((r) => r.id);
  const [{ data: profile }, { data: imagesData }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
    supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds)
      .order("display_order", { ascending: true }),
  ]);

  const imagesByProduct = new Map<string, ProductImageRow[]>();
  for (const img of imagesData ?? []) {
    const list = imagesByProduct.get(img.product_id) ?? [];
    list.push(img);
    imagesByProduct.set(img.product_id, list);
  }

  return rows.map((row) =>
    mapDatabaseRowToProduct(
      row,
      profile ?? null,
      imagesByProduct.get(row.id) ?? [],
    ),
  );
}
