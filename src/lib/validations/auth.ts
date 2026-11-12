import { z } from "zod";
import { COHORTS, MAJORS, UNIVERSITIES } from "@/features/marketplace/mock-data";

/**
 * Kiểm tra tính toàn vẹn Trường -> Ngành:
 * Ngành bắt buộc phải tồn tại và có `universityId === universityId` đã chọn.
 * Các trường chưa có dữ liệu ngành (ngoài CTU trong MVP) sẽ không vượt qua kiểm tra này.
 */
export function isUniversityMajorConsistent(
  universityId: string,
  majorId: string | null | undefined,
): boolean {
  if (!universityId || !majorId) return false;
  const matchedMajor = MAJORS.find((m) => m.id === majorId);
  if (!matchedMajor) return false;
  return matchedMajor.universityId === universityId;
}

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập địa chỉ email.")
    .email("Địa chỉ email không hợp lệ."),
  password: z
    .string()
    .min(8, "Mật khẩu cần tối thiểu 8 ký tự.")
    .max(128, "Mật khẩu không vượt quá 128 ký tự."),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Họ tên cần tối thiểu 2 ký tự.")
      .max(80, "Họ tên không vượt quá 80 ký tự."),
    email: z
      .string()
      .trim()
      .min(1, "Vui lòng nhập địa chỉ email.")
      .email("Địa chỉ email không hợp lệ."),
    password: z
      .string()
      .min(8, "Mật khẩu cần tối thiểu 8 ký tự.")
      .max(128, "Mật khẩu không vượt quá 128 ký tự."),
    confirmPassword: z
      .string()
      .min(8, "Vui lòng nhập lại mật khẩu xác nhận."),
    universityId: z
      .string()
      .refine((id) => UNIVERSITIES.some((u) => u.id === id), {
        message: "Trường đại học không hợp lệ.",
      }),
    majorId: z
      .string()
      .trim()
      .min(1, "Vui lòng chọn Khoa/Ngành đào tạo.")
      .refine((id) => MAJORS.some((m) => m.id === id), {
        message: "Khoa/Ngành đào tạo không hợp lệ.",
      }),
    cohort: z
      .string()
      .trim()
      .min(1, "Vui lòng chọn khóa đào tạo.")
      .refine((c) => (COHORTS as readonly string[]).includes(c), {
        message: "Khóa đào tạo không hợp lệ.",
      }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  })
  .refine(
    (data) => isUniversityMajorConsistent(data.universityId, data.majorId),
    {
      message:
        "Khoa/Ngành đã chọn không thuộc trường đại học tương ứng (hoặc trường này chưa mở đăng ký trong MVP).",
      path: ["majorId"],
    },
  );

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập địa chỉ email.")
    .email("Địa chỉ email không hợp lệ."),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const updatePasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "Mật khẩu mới cần tối thiểu 8 ký tự.")
      .max(128, "Mật khẩu mới không vượt quá 128 ký tự."),
    confirmPassword: z.string().min(8, "Vui lòng xác nhận mật khẩu mới."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp.",
    path: ["confirmPassword"],
  });

export type UpdatePasswordInput = z.infer<typeof updatePasswordSchema>;

/**
 * Schema cập nhật hồ sơ cá nhân (`.strict()`):
 * Chỉ cho phép cập nhật các trường cá nhân (`fullName`, `avatarUrl`, `universityId`, `majorId`, `cohort`, `bio`).
 * Mọi nỗ lực truyền `role`, `campus_verified`, `email_verified`, `rating_avg`, `rating_count`,
 * `completed_transactions`, `eco_points` từ client đều bị từ chối ngay từ tầng Validation + bị chặn bởi Trigger/RLS.
 */
export const profileUpdateSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Họ tên cần tối thiểu 2 ký tự.")
      .max(80, "Họ tên không vượt quá 80 ký tự."),
    avatarUrl: z
      .string()
      .trim()
      .max(500, "Đường dẫn ảnh đại diện quá dài.")
      .optional()
      .or(z.literal("")),
    universityId: z
      .string()
      .refine((id) => UNIVERSITIES.some((u) => u.id === id), {
        message: "Trường đại học không hợp lệ.",
      }),
    majorId: z
      .string()
      .trim()
      .min(1, "Vui lòng chọn Khoa/Ngành đào tạo.")
      .refine((id) => MAJORS.some((m) => m.id === id), {
        message: "Khoa/Ngành đào tạo không hợp lệ.",
      }),
    cohort: z
      .string()
      .trim()
      .min(1, "Vui lòng chọn khóa đào tạo.")
      .refine((c) => (COHORTS as readonly string[]).includes(c), {
        message: "Khóa đào tạo không hợp lệ.",
      }),
    bio: z
      .string()
      .trim()
      .max(300, "Giới thiệu ngắn không vượt quá 300 ký tự.")
      .optional()
      .or(z.literal("")),
  })
  .strict(
    "Không được phép truyền các trường đặc quyền hệ thống (role, campus_verified, email_verified, rating, eco_points).",
  )
  .refine(
    (data) => isUniversityMajorConsistent(data.universityId, data.majorId),
    {
      message: "Khoa/Ngành đã chọn không thuộc trường đại học tương ứng.",
      path: ["majorId"],
    },
  );

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

/**
 * Chuẩn hóa và kiểm tra an toàn cho tham số redirect `next=`
 * nhằm chống lỗ hổng Open Redirect (chỉ chấp nhận đường dẫn nội bộ bắt đầu bằng `/`).
 */
export function sanitizeRedirectPath(
  nextParam: string | null | undefined,
  fallback = "/",
): string {
  if (!nextParam || typeof nextParam !== "string") {
    return fallback;
  }

  const trimmed = nextParam.trim();
  if (!trimmed.startsWith("/")) {
    return fallback;
  }

  // Chặn protocol-relative URLs (//evil.com), backslashes (/\evil.com), hoặc control chars
  if (
    trimmed.startsWith("//") ||
    trimmed.startsWith("/\\") ||
    trimmed.includes("\\") ||
    /[\r\n\t]/.test(trimmed)
  ) {
    return fallback;
  }

  try {
    const parsed = new URL(trimmed, "http://localhost");
    if (parsed.origin !== "http://localhost") {
      return fallback;
    }
    // Tránh vòng lặp redirect vào chính trang login/register
    if (
      parsed.pathname === "/login" ||
      parsed.pathname === "/register" ||
      parsed.pathname === "/forgot-password"
    ) {
      return fallback;
    }
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return fallback;
  }
}
