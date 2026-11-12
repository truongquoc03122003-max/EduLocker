import { z } from "zod";
import {
  COHORTS,
  COURSES,
  UNIVERSITIES,
} from "@/features/marketplace/mock-data";
import { isUniversityMajorConsistent } from "./auth";

export const MAX_PRODUCT_IMAGES = 5;
export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;
export const ALLOWED_IMAGE_EXTENSIONS = [
  ".jpg",
  ".jpeg",
  ".png",
  ".webp",
] as const;

/**
 * Đồng bộ chính xác với CHECK constraints trong PostgreSQL (`public.products`):
 * - `title`: char_length(trim(title)) between 10 and 120
 * - `description`: char_length(trim(description)) between 25 and 2000
 * - `condition_percent`: between 50 and 100
 * - `price`: between 5000 and 20000000 (DB: >= 0 and <= 20000000)
 * - `original_price`: >= price
 * - `university_id` -> `major_id` -> `course_id` toàn vẹn phân cấp
 */
export const productCreateSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(10, "Tên sản phẩm cần tối thiểu 10 ký tự.")
      .max(120, "Tên sản phẩm không vượt quá 120 ký tự."),
    categorySlug: z.enum([
      "giao-trinh",
      "sach",
      "dung-cu-hoc-tap",
      "may-tinh-cam-tay",
      "do-dien-tu",
      "do-ktx",
      "do-gia-dung",
      "phu-kien",
      "khac",
    ]),
    description: z
      .string()
      .trim()
      .min(
        25,
        "Mô tả sản phẩm cần tối thiểu 25 ký tự để minh bạch tình trạng.",
      )
      .max(2000, "Mô tả không vượt quá 2000 ký tự."),
    condition: z.enum(["LIKE_NEW", "GOOD", "FAIR", "WELL_USED"]),
    conditionPercent: z
      .number()
      .int("Độ mới (%) phải là số nguyên.")
      .min(50, "Độ mới tối thiểu là 50%.")
      .max(100, "Độ mới tối đa là 100%.")
      .optional()
      .default(90),
    price: z
      .number()
      .int("Giá bán phải là số nguyên VNĐ.")
      .min(5000, "Giá bán tối thiểu là 5.000 VNĐ.")
      .max(20000000, "Giá bán không vượt quá 20.000.000 VNĐ."),
    originalPrice: z.number().int().min(5000).optional(),
    universityId: z.string().trim().min(1, "Vui lòng chọn trường đại học."),
    majorId: z.string().trim().min(1, "Vui lòng chọn khoa/ngành đào tạo."),
    courseId: z.string().optional(),
    cohort: z
      .string()
      .trim()
      .min(1, "Vui lòng chọn khóa đào tạo.")
      .refine((c) => (COHORTS as readonly string[]).includes(c), {
        message: "Khóa đào tạo không hợp lệ.",
      }),
    preferredLockerId: z
      .string()
      .trim()
      .min(1, "Vui lòng chọn điểm Smart Locker giao nhận."),
    status: z
      .enum(["DRAFT", "AVAILABLE", "RESERVED", "SOLD", "HIDDEN"])
      .optional()
      .default("AVAILABLE"),
  })
  .refine(
    (data) =>
      data.originalPrice === undefined || data.originalPrice >= data.price,
    {
      message: "Giá mua mới ban đầu phải lớn hơn hoặc bằng giá thanh lý.",
      path: ["originalPrice"],
    },
  )
  .refine((data) => UNIVERSITIES.some((u) => u.id === data.universityId), {
    message: "Trường đại học không hợp lệ.",
    path: ["universityId"],
  })
  .refine(
    (data) => isUniversityMajorConsistent(data.universityId, data.majorId),
    {
      message: "Khoa/Ngành không hợp lệ hoặc không thuộc trường đã chọn.",
      path: ["majorId"],
    },
  )
  .refine(
    (data) => {
      if (!data.courseId || data.courseId === "all") return true;
      const matchedCourse = COURSES.find((c) => c.id === data.courseId);
      return Boolean(matchedCourse && matchedCourse.majorId === data.majorId);
    },
    {
      message: "Môn học không thuộc Khoa/Ngành đã chọn.",
      path: ["courseId"],
    },
  );

export type ProductCreateInput = z.infer<typeof productCreateSchema>;

export interface ImageValidationCandidate {
  name: string;
  size: number;
  type: string;
  headerBytes?: Uint8Array;
}

/**
 * Kiểm tra magic bytes (file signature) để không tin hoàn toàn vào MIME type từ client:
 * - JPEG: FF D8 FF
 * - PNG: 89 50 4E 47 0D 0A 1A 0A
 * - WEBP: "RIFF" (52 49 46 46) ... "WEBP" (57 45 42 50 tại offset 8..11)
 */
export function hasValidImageSignature(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;

  // JPEG: FF D8 FF
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return true;
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return true;
  }

  // WEBP: RIFF....WEBP
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return true;
  }

  return false;
}

export function validateProductImageFiles(
  files: ImageValidationCandidate[],
): { valid: boolean; error?: string } {
  if (files.length > MAX_PRODUCT_IMAGES) {
    return {
      valid: false,
      error: `Mỗi sản phẩm chỉ được tải lên tối đa ${MAX_PRODUCT_IMAGES} ảnh.`,
    };
  }

  for (const file of files) {
    if (file.size <= 0) {
      return {
        valid: false,
        error: `Tệp "${file.name}" rỗng hoặc không hợp lệ.`,
      };
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return {
        valid: false,
        error: `Ảnh "${file.name}" vượt quá giới hạn 5 MB / ảnh.`,
      };
    }

    const lowerName = file.name.toLowerCase();
    const hasAllowedExt = ALLOWED_IMAGE_EXTENSIONS.some((ext) =>
      lowerName.endsWith(ext),
    );
    const hasAllowedMime = (ALLOWED_IMAGE_MIME_TYPES as readonly string[]).includes(
      file.type.toLowerCase(),
    );

    if (!hasAllowedExt || !hasAllowedMime) {
      return {
        valid: false,
        error: `Ảnh "${file.name}" không đúng định dạng cho phép (chỉ nhận JPG, JPEG, PNG, WEBP).`,
      };
    }

    if (file.headerBytes && !hasValidImageSignature(file.headerBytes)) {
      return {
        valid: false,
        error: `Chữ ký nội dung tệp "${file.name}" không khớp định dạng ảnh hợp lệ (JPG/PNG/WEBP).`,
      };
    }
  }

  return { valid: true };
}

/**
 * Kiểm tra quyền sở hữu sản phẩm:
 * Chỉ chủ sở hữu (`userId === sellerId`) mới có quyền sửa, ẩn/hiện hoặc xóa sản phẩm.
 */
export function canManageProduct(
  userId: string | null | undefined,
  sellerId: string | null | undefined,
): boolean {
  if (!userId || !sellerId) return false;
  return userId === sellerId;
}

/**
 * Hợp nhất (merge & deduplicate) danh sách yêu thích từ localStorage và Supabase
 * khi người dùng đăng nhập mà không làm mất các sản phẩm đã lưu trước đó.
 */
export function mergeFavoriteIds(
  localIds: readonly string[],
  remoteIds: readonly string[],
  validProductIds?: ReadonlySet<string>,
): string[] {
  const merged: string[] = [];
  for (const id of [...localIds, ...remoteIds]) {
    if (typeof id !== "string") continue;
    const trimmed = id.trim();
    if (!trimmed) continue;
    if (validProductIds && !validProductIds.has(trimmed)) continue;
    if (!merged.includes(trimmed)) {
      merged.push(trimmed);
    }
  }
  return merged;
}
