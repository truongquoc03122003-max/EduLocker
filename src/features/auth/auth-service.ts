import { MAJORS, UNIVERSITIES } from "@/features/marketplace/mock-data";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { AuthenticatedUserProfile } from "@/types";

export interface AuthSessionResult {
  isConfigured: boolean;
  userProfile: AuthenticatedUserProfile | null;
}

/**
 * Đọc thông tin người dùng hiện tại từ Server (Server Component / Server Action).
 * - Email của user hiện tại chỉ lấy từ `supabase.auth.getUser()` (`auth.users`),
 *   tuyệt đối không lưu hay đọc email từ bảng public `profiles`.
 * - Không tự động gán `major-cntt` của CTU cho một trường đại học khác.
 */
export async function getCurrentUserProfile(): Promise<AuthSessionResult> {
  if (!isSupabaseConfigured()) {
    return { isConfigured: false, userProfile: null };
  }

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return { isConfigured: false, userProfile: null };
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return { isConfigured: true, userProfile: null };
    }

    const { data: profileRow } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

    const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
    const rawUniId =
      profileRow?.university_id ??
      (typeof meta.university_id === "string" ? meta.university_id : "uni-ctu");
    const rawMajorId =
      profileRow?.major_id ??
      (typeof meta.major_id === "string" ? meta.major_id : "");
    const rawCohort =
      profileRow?.cohort ??
      (typeof meta.cohort === "string" ? meta.cohort : "K50");
    const rawFullName =
      profileRow?.full_name ??
      (typeof meta.full_name === "string" && meta.full_name.trim()
        ? meta.full_name.trim()
        : user.email?.split("@")[0] ?? "Sinh viên");

    // Chỉ chấp nhận tổ hợp (university_id, major_id) hợp lệ; không bao giờ gán major của CTU cho trường khác
    const requestedUniversity =
      UNIVERSITIES.find((u) => u.id === rawUniId) ?? UNIVERSITIES[0];
    const validMajorsForUni = MAJORS.filter(
      (m) => m.universityId === requestedUniversity.id,
    );

    const universityObj =
      validMajorsForUni.length > 0 ? requestedUniversity : UNIVERSITIES[0];
    const majorObj =
      MAJORS.find(
        (m) => m.id === rawMajorId && m.universityId === universityObj.id,
      ) ??
      MAJORS.find((m) => m.universityId === universityObj.id) ??
      MAJORS[0];

    // Nếu trigger auth.users chưa kịp tạo dòng profile (chỉ insert các trường hợp lệ, không có email)
    if (!profileRow && majorObj.universityId === universityObj.id) {
      await supabase.from("profiles").insert({
        id: user.id,
        full_name: rawFullName,
        university_id: universityObj.id,
        major_id: majorObj.id,
        cohort: rawCohort,
        email_verified: false,
        campus_verified: false,
        role: "student",
      });
    }

    const userProfile: AuthenticatedUserProfile = {
      id: user.id,
      // Email riêng tư chỉ lấy trực tiếp từ auth.users qua supabase.auth.getUser()
      email: user.email ?? "",
      fullName: rawFullName,
      avatarUrl: profileRow?.avatar_url ?? null,
      universityId: universityObj.id,
      universityName: universityObj.name,
      majorId: majorObj.id,
      majorName: majorObj.name,
      cohort: rawCohort,
      bio: profileRow?.bio ?? null,
      emailVerified:
        Boolean(user.email_confirmed_at) || Boolean(profileRow?.email_verified),
      // Lưu ý: Email verified của Supabase KHÔNG đồng nghĩa với nhà trường xác thực sinh viên
      campusVerified: Boolean(profileRow?.campus_verified),
      ratingAvg: Number(profileRow?.rating_avg ?? 5.0),
      ratingCount: Number(profileRow?.rating_count ?? 0),
      completedTransactions: Number(profileRow?.completed_transactions ?? 0),
      ecoPoints: Number(profileRow?.eco_points ?? 0),
      role: profileRow?.role ?? "student",
      createdAt: profileRow?.created_at ?? user.created_at,
    };

    return {
      isConfigured: true,
      userProfile,
    };
  } catch {
    return { isConfigured: true, userProfile: null };
  }
}
