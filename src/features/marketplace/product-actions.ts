"use server";

import { revalidatePath } from "next/cache";
import { CATEGORIES } from "@/features/marketplace/mock-data";
import {
  executeSafeImageReplacement,
  type ExistingImageRecord,
  type NewImageUploadItem,
} from "@/features/marketplace/image-replacement";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  canManageProduct,
  MAX_PRODUCT_IMAGES,
  productCreateSchema,
  validateProductImageFiles,
  type ImageValidationCandidate,
} from "@/lib/validations/product";

function slugifyVi(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
}

function sanitizeFileName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export async function createProductAction(formData: FormData): Promise<{
  success: boolean;
  productId?: string;
  slug?: string;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Bạn cần đăng nhập để đăng bán sản phẩm.",
    };
  }

  const rawPrice = Number(formData.get("price"));
  const rawOriginalPriceStr = String(formData.get("originalPrice") ?? "").trim();
  const rawOriginalPrice = rawOriginalPriceStr
    ? Number(rawOriginalPriceStr)
    : undefined;
  const rawConditionPercent = Number(formData.get("conditionPercent") ?? 90);
  const rawCourseId = String(formData.get("courseId") ?? "").trim();

  const parsed = productCreateSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    categorySlug: String(formData.get("categorySlug") ?? ""),
    description: String(formData.get("description") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    conditionPercent: Number.isFinite(rawConditionPercent)
      ? rawConditionPercent
      : 90,
    price: rawPrice,
    originalPrice: rawOriginalPrice,
    universityId: String(formData.get("universityId") ?? ""),
    majorId: String(formData.get("majorId") ?? ""),
    courseId: rawCourseId && rawCourseId !== "all" ? rawCourseId : undefined,
    cohort: String(formData.get("cohort") ?? ""),
    preferredLockerId: String(formData.get("preferredLockerId") ?? ""),
    status: "AVAILABLE",
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Dữ liệu sản phẩm không hợp lệ. Vui lòng kiểm tra lại.",
    };
  }

  // Validate uploaded files (client + server magic bytes)
  const rawFiles = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (rawFiles.length === 0) {
    return {
      success: false,
      error: "Vui lòng chọn ít nhất 1 ảnh sản phẩm (JPG, PNG, WEBP).",
    };
  }

  const candidates: ImageValidationCandidate[] = [];
  for (const file of rawFiles) {
    const headerBuffer = await file.slice(0, 16).arrayBuffer();
    candidates.push({
      name: file.name,
      size: file.size,
      type: file.type,
      headerBytes: new Uint8Array(headerBuffer),
    });
  }

  const fileValidation = validateProductImageFiles(candidates);
  if (!fileValidation.valid) {
    return {
      success: false,
      error: fileValidation.error,
    };
  }

  const categoryObj =
    CATEGORIES.find((c) => c.slug === parsed.data.categorySlug) ??
    CATEGORIES[0];

  const baseSlug = slugifyVi(parsed.data.title) || "san-pham";
  const uniqueSuffix = `${Date.now().toString(36)}-${Math.random()
    .toString(36)
    .slice(2, 6)}`;
  const slug = `${baseSlug}-${uniqueSuffix}`;

  // Đảm bảo hồ sơ seller đã tồn tại trong bảng profiles (không ghi cột email công khai)
  await supabase.from("profiles").upsert(
    {
      id: user.id,
      full_name:
        (typeof user.user_metadata?.full_name === "string" &&
          user.user_metadata.full_name.trim()) ||
        user.email?.split("@")[0] ||
        "Sinh viên EduLocker",
      university_id: parsed.data.universityId,
      major_id: parsed.data.majorId,
      cohort: parsed.data.cohort,
    },
    { onConflict: "id", ignoreDuplicates: true },
  );

  // Luôn gán seller_id = user.id (auth.uid()), tuyệt đối không nhận seller_id từ client
  const { data: createdProduct, error: insertError } = await supabase
    .from("products")
    .insert({
      seller_id: user.id,
      title: parsed.data.title,
      slug,
      description: parsed.data.description,
      category_id: categoryObj.id,
      condition: parsed.data.condition,
      condition_percent: parsed.data.conditionPercent,
      price: parsed.data.price,
      original_price: parsed.data.originalPrice ?? null,
      university_id: parsed.data.universityId,
      major_id: parsed.data.majorId,
      course_id: parsed.data.courseId ?? null,
      cohort: parsed.data.cohort,
      preferred_locker_id: parsed.data.preferredLockerId,
      delivery_method: "SMART_LOCKER",
      status: "AVAILABLE",
    })
    .select("id, slug")
    .single();

  if (insertError || !createdProduct) {
    return {
      success: false,
      error:
        "Không thể lưu sản phẩm vào cơ sở dữ liệu. Vui lòng kiểm tra cấu hình bảng Supabase.",
    };
  }

  const uploadedPaths: string[] = [];
  const rowsToInsert: Array<{
    product_id: string;
    image_url: string;
    storage_path: string;
    alt_text: string;
    display_order: number;
  }> = [];

  try {
    for (let i = 0; i < rawFiles.length; i++) {
      const file = rawFiles[i];
      const safeName = sanitizeFileName(file.name) || `image-${i + 1}.jpg`;
      // Đường dẫn chuẩn theo yêu cầu: {user_id}/{product_id}/{filename}
      const storagePath = `${user.id}/${createdProduct.id}/${i + 1}-${Date.now()}-${safeName}`;

      const { error: uploadErr } = await supabase.storage
        .from("product-images")
        .upload(storagePath, file, {
          contentType: file.type,
          upsert: false,
        });

      if (uploadErr) {
        throw new Error(`Tải ảnh "${file.name}" thất bại: ${uploadErr.message}`);
      }

      uploadedPaths.push(storagePath);

      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(storagePath);

      rowsToInsert.push({
        product_id: createdProduct.id,
        image_url: publicUrl,
        storage_path: storagePath,
        alt_text: `${parsed.data.title} – Ảnh ${i + 1}`,
        display_order: i + 1,
      });
    }

    // Batch insert toàn bộ các dòng ảnh trong một database operation duy nhất
    const { error: imgRowErr } = await supabase
      .from("product_images")
      .insert(rowsToInsert);

    if (imgRowErr) {
      throw new Error("Không thể lưu thông tin ảnh vào cơ sở dữ liệu.");
    }
  } catch (err) {
    // Cleanup để tránh dữ liệu mồ côi khi upload/insert ảnh thất bại
    if (uploadedPaths.length > 0) {
      await supabase.storage.from("product-images").remove(uploadedPaths);
    }
    await supabase
      .from("products")
      .delete()
      .eq("id", createdProduct.id)
      .eq("seller_id", user.id);

    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Đã xảy ra lỗi khi tải ảnh sản phẩm lên Storage.",
    };
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/my-products");

  return {
    success: true,
    productId: createdProduct.id,
    slug: createdProduct.slug,
  };
}

export async function updateProductAction(
  productId: string,
  formData: FormData,
): Promise<{
  success: boolean;
  productId?: string;
  error?: string;
}> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Bạn cần đăng nhập để chỉnh sửa sản phẩm.",
    };
  }

  const { data: existingProduct } = await supabase
    .from("products")
    .select("id, seller_id, status")
    .eq("id", productId)
    .maybeSingle();

  if (!existingProduct || !canManageProduct(user.id, existingProduct.seller_id)) {
    return {
      success: false,
      error: "Bạn không có quyền chỉnh sửa sản phẩm này (403 Forbidden).",
    };
  }

  const rawPrice = Number(formData.get("price"));
  const rawOriginalPriceStr = String(formData.get("originalPrice") ?? "").trim();
  const rawOriginalPrice = rawOriginalPriceStr
    ? Number(rawOriginalPriceStr)
    : undefined;
  const rawConditionPercent = Number(formData.get("conditionPercent") ?? 90);
  const rawCourseId = String(formData.get("courseId") ?? "").trim();
  const rawStatus = String(
    formData.get("status") ?? existingProduct.status,
  ) as "DRAFT" | "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN";

  const parsed = productCreateSchema.safeParse({
    title: String(formData.get("title") ?? ""),
    categorySlug: String(formData.get("categorySlug") ?? ""),
    description: String(formData.get("description") ?? ""),
    condition: String(formData.get("condition") ?? ""),
    conditionPercent: Number.isFinite(rawConditionPercent)
      ? rawConditionPercent
      : 90,
    price: rawPrice,
    originalPrice: rawOriginalPrice,
    universityId: String(formData.get("universityId") ?? ""),
    majorId: String(formData.get("majorId") ?? ""),
    courseId: rawCourseId && rawCourseId !== "all" ? rawCourseId : undefined,
    cohort: String(formData.get("cohort") ?? ""),
    preferredLockerId: String(formData.get("preferredLockerId") ?? ""),
    status: rawStatus,
  });

  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ??
        "Dữ liệu cập nhật không hợp lệ.",
    };
  }

  // Bước 1 & 2: Đọc ảnh cũ hiện tại và kiểm tra toàn bộ ảnh mới trước khi ghi bất kỳ thay đổi nào
  const { data: currentOldImages } = await supabase
    .from("product_images")
    .select("id, image_url, storage_path, alt_text, display_order")
    .eq("product_id", productId)
    .order("display_order", { ascending: true });

  const oldImages: ExistingImageRecord[] = currentOldImages ?? [];
  const keptExistingUrls = new Set(
    formData
      .getAll("existingImages")
      .map((v) => String(v).trim())
      .filter(Boolean),
  );

  const rawFiles = formData
    .getAll("images")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  // Nếu người dùng truyền danh sách existingImages hoặc tải file mới
  const keptOldImages =
    keptExistingUrls.size > 0 || rawFiles.length > 0
      ? oldImages.filter((img) => keptExistingUrls.has(img.image_url))
      : oldImages;

  const oldImagesToReplace = oldImages.filter(
    (img) => !keptOldImages.some((kept) => kept.id === img.id),
  );

  const totalFinalImages = keptOldImages.length + rawFiles.length;
  if (totalFinalImages === 0) {
    return {
      success: false,
      error: "Sản phẩm cần tối thiểu 1 hình ảnh.",
    };
  }
  if (totalFinalImages > MAX_PRODUCT_IMAGES) {
    return {
      success: false,
      error: `Mỗi sản phẩm chỉ được có tối đa ${MAX_PRODUCT_IMAGES} ảnh.`,
    };
  }

  if (rawFiles.length > 0) {
    const candidates: ImageValidationCandidate[] = [];
    for (const file of rawFiles) {
      const headerBuffer = await file.slice(0, 16).arrayBuffer();
      candidates.push({
        name: file.name,
        size: file.size,
        type: file.type,
        headerBytes: new Uint8Array(headerBuffer),
      });
    }

    const fileValidation = validateProductImageFiles(candidates);
    if (!fileValidation.valid) {
      return {
        success: false,
        error: fileValidation.error,
      };
    }
  }

  // Bước 3..7: Thực thi thay thế ảnh an toàn (chỉ xóa ảnh cũ sau khi ảnh mới đã upload & insert DB thành công)
  if (rawFiles.length > 0 || oldImagesToReplace.length > 0) {
    const newUploads: NewImageUploadItem[] = rawFiles.map((file, idx) => {
      const safeName = sanitizeFileName(file.name) || `image-${idx + 1}.jpg`;
      const uniqueToken = `${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 6)}`;
      const storagePath = `${user.id}/${productId}/${keptOldImages.length + idx + 1}-${uniqueToken}-${safeName}`;

      return {
        storagePath,
        altText: `${parsed.data.title} – Ảnh ${keptOldImages.length + idx + 1}`,
        displayOrder: keptOldImages.length + idx + 1,
        upload: async () => {
          const { error: uploadErr } = await supabase.storage
            .from("product-images")
            .upload(storagePath, file, {
              contentType: file.type,
              upsert: false,
            });

          if (uploadErr) {
            return {
              publicUrl: "",
              error: `Tải ảnh "${file.name}" thất bại: ${uploadErr.message}`,
            };
          }

          const {
            data: { publicUrl },
          } = supabase.storage.from("product-images").getPublicUrl(storagePath);

          return { publicUrl };
        },
      };
    });

    const replacementResult = await executeSafeImageReplacement({
      productId,
      oldImagesToReplace,
      newUploads,
      adapter: {
        insertNewImageRows: async (rows) => {
          const { data: inserted, error: insertErr } = await supabase
            .from("product_images")
            .insert(rows)
            .select("id");

          if (insertErr || !inserted) {
            return {
              insertedIds: [],
              error: "Không thể lưu thông tin ảnh mới vào cơ sở dữ liệu.",
            };
          }
          return { insertedIds: inserted.map((r) => r.id) };
        },
        deleteImageRowsByIds: async (ids) => {
          const { error: delErr } = await supabase
            .from("product_images")
            .delete()
            .in("id", ids);
          return { error: delErr?.message };
        },
        removeStorageFiles: async (paths) => {
          const { error: rmErr } = await supabase.storage
            .from("product-images")
            .remove(paths);
          return { error: rmErr?.message };
        },
      },
    });

    if (!replacementResult.success) {
      return {
        success: false,
        error:
          replacementResult.error ??
          "Đã xảy ra lỗi khi cập nhật ảnh sản phẩm. Ảnh cũ vẫn được giữ nguyên.",
      };
    }
  }

  const categoryObj =
    CATEGORIES.find((c) => c.slug === parsed.data.categorySlug) ??
    CATEGORIES[0];

  const { error: updateErr } = await supabase
    .from("products")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      category_id: categoryObj.id,
      condition: parsed.data.condition,
      condition_percent: parsed.data.conditionPercent,
      price: parsed.data.price,
      original_price: parsed.data.originalPrice ?? null,
      university_id: parsed.data.universityId,
      major_id: parsed.data.majorId,
      course_id: parsed.data.courseId ?? null,
      cohort: parsed.data.cohort,
      preferred_locker_id: parsed.data.preferredLockerId,
      status: parsed.data.status,
    })
    .eq("id", productId)
    .eq("seller_id", user.id);

  if (updateErr) {
    return {
      success: false,
      error: "Không thể cập nhật thông tin sản phẩm.",
    };
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/my-products");

  return {
    success: true,
    productId,
  };
}

export async function toggleProductVisibilityAction(
  productId: string,
  nextStatus: "AVAILABLE" | "HIDDEN",
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Bạn cần đăng nhập để thực hiện thao tác này.",
    };
  }

  const { data: existing } = await supabase
    .from("products")
    .select("id, seller_id")
    .eq("id", productId)
    .maybeSingle();

  if (!existing || !canManageProduct(user.id, existing.seller_id)) {
    return {
      success: false,
      error: "Bạn không có quyền thay đổi trạng thái sản phẩm này.",
    };
  }

  const { error } = await supabase
    .from("products")
    .update({ status: nextStatus })
    .eq("id", productId)
    .eq("seller_id", user.id);

  if (error) {
    return {
      success: false,
      error: "Không thể cập nhật trạng thái hiển thị của sản phẩm.",
    };
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/my-products");

  return { success: true };
}

/**
 * Xóa sản phẩm theo đúng thứ tự an toàn dữ liệu (Section 6):
 * 1. Đọc danh sách `storage_path` của sản phẩm.
 * 2. Xóa bản ghi `products` trong DB trước (tự động cascade xóa `product_images`).
 * 3. Chỉ khi xóa DB thành công mới xóa các file trên Storage.
 * 4. Nếu xóa Storage gặp lỗi, ghi log cảnh báo mà không phục hồi ngược sản phẩm đã xóa.
 */
export async function deleteProductAction(
  productId: string,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error: "Bạn cần đăng nhập để xóa sản phẩm.",
    };
  }

  const { data: existing } = await supabase
    .from("products")
    .select("id, seller_id")
    .eq("id", productId)
    .maybeSingle();

  if (!existing || !canManageProduct(user.id, existing.seller_id)) {
    return {
      success: false,
      error: "Bạn không có quyền xóa sản phẩm này.",
    };
  }

  // Bước 1: Đọc danh sách storage_path trước khi xóa DB
  const { data: images } = await supabase
    .from("product_images")
    .select("storage_path")
    .eq("product_id", productId);

  const storagePaths = (images ?? [])
    .map((img) => img.storage_path)
    .filter((p): p is string => Boolean(p));

  // Bước 2: Xóa bản ghi sản phẩm trong DB trước (cascade product_images)
  const { error: dbDeleteError } = await supabase
    .from("products")
    .delete()
    .eq("id", productId)
    .eq("seller_id", user.id);

  if (dbDeleteError) {
    return {
      success: false,
      error: "Không thể xóa sản phẩm trong cơ sở dữ liệu.",
    };
  }

  // Bước 3 & 4: Dọn dẹp file trên Storage sau khi DB đã xóa thành công
  if (storagePaths.length > 0) {
    try {
      const { error: storageRemoveError } = await supabase.storage
        .from("product-images")
        .remove(storagePaths);

      if (storageRemoveError) {
        console.warn(
          `[deleteProductAction] Đã xóa sản phẩm ${productId} trong DB nhưng dọn file Storage chưa hoàn tất:`,
          storageRemoveError.message,
        );
      }
    } catch (storageErr) {
      console.warn(
        `[deleteProductAction] Lỗi ngoại lệ khi dọn file Storage cho sản phẩm ${productId}:`,
        storageErr,
      );
    }
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/my-products");

  return { success: true };
}
