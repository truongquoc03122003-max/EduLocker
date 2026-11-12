"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  profileUpdateSchema,
  type ProfileUpdateInput,
} from "@/lib/validations/auth";

export async function updateMyProfileAction(
  rawInput: ProfileUpdateInput,
): Promise<{ success: boolean; error?: string }> {
  if (!isSupabaseConfigured()) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const parsed = profileUpdateSchema.safeParse(rawInput);
  if (!parsed.success) {
    return {
      success: false,
      error:
        parsed.error.issues[0]?.message ?? "Dữ liệu hồ sơ không hợp lệ.",
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
      error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
    };
  }

  const { fullName, avatarUrl, universityId, majorId, cohort, bio } =
    parsed.data;

  // Chỉ cập nhật các trường thông tin cá nhân của chính user (id = user.id).
  // Không bao giờ cho phép truyền role, campus_verified hay rating từ client.
  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: fullName,
      avatar_url: avatarUrl?.trim() ? avatarUrl.trim() : null,
      university_id: universityId,
      major_id: majorId,
      cohort,
      bio: bio?.trim() ? bio.trim() : null,
    })
    .eq("id", user.id);

  if (error) {
    return {
      success: false,
      error: "Không thể lưu thay đổi hồ sơ. Vui lòng thử lại.",
    };
  }

  revalidatePath("/profile");
  revalidatePath("/my-products");
  revalidatePath("/", "layout");

  return { success: true };
}

