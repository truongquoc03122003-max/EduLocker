"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveAdmin } from "./admin-repository";

export async function adminSetUserStatusAction(
  userId: string,
  status: "ACTIVE" | "SUSPENDED",
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Chỉ quản trị viên đang hoạt động mới có quyền này (403).",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "Chưa cấu hình Supabase." };

  const { error } = await supabase.rpc("rpc_admin_set_user_status", {
    p_user_id: userId,
    p_status: status,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  return { success: true };
}

export async function adminModerateProductAction(
  productId: string,
  action: "HIDE" | "RESTORE",
  note?: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Chỉ quản trị viên đang hoạt động mới có quyền này (403).",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "Chưa cấu hình Supabase." };

  const { error } = await supabase.rpc("rpc_admin_moderate_product", {
    p_product_id: productId,
    p_action: action,
    p_note: note?.trim() || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/products");
  revalidatePath("/products");
  revalidatePath("/");
  return { success: true };
}

export async function adminToggleCompartmentMaintenanceAction(
  compartmentId: string,
  maintenance: boolean,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Chỉ quản trị viên đang hoạt động mới có quyền này (403).",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "Chưa cấu hình Supabase." };

  const { error } = await supabase.rpc(
    "rpc_admin_toggle_compartment_maintenance",
    {
      p_compartment_id: compartmentId,
      p_maintenance: maintenance,
    },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/lockers");
  revalidatePath("/lockers");
  return { success: true };
}

export async function adminReviewReportAction(
  reportId: string,
  status: "REVIEWING" | "RESOLVED" | "REJECTED",
  adminNote?: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Chỉ quản trị viên đang hoạt động mới có quyền này (403).",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "Chưa cấu hình Supabase." };

  const { error } = await supabase.rpc("rpc_admin_review_report", {
    p_report_id: reportId,
    p_status: status,
    p_admin_note: adminNote?.trim() || null,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reports");
  return { success: true };
}

export async function adminResolveDisputeAction(
  disputeId: string,
  outcome: "RESOLVED_BUYER" | "RESOLVED_SELLER",
  resolutionNote: string,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Chỉ quản trị viên đang hoạt động mới có quyền này (403).",
    };
  }

  if (resolutionNote.trim().length < 5) {
    return {
      success: false,
      error: "Vui lòng nhập ghi chú kết quả xử lý tối thiểu 5 ký tự.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "Chưa cấu hình Supabase." };

  const { error } = await supabase.rpc("rpc_admin_resolve_dispute", {
    p_dispute_id: disputeId,
    p_outcome: outcome,
    p_resolution_note: resolutionNote.trim(),
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/disputes");
  revalidatePath("/admin/orders");
  revalidatePath("/orders");
  return { success: true };
}

export async function adminToggleReviewVisibilityAction(
  reviewId: string,
  isHidden: boolean,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Chỉ quản trị viên đang hoạt động mới có quyền này (403).",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "Chưa cấu hình Supabase." };

  const { error } = await supabase.rpc("rpc_admin_toggle_review_visibility", {
    p_review_id: reviewId,
    p_is_hidden: isHidden,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  revalidatePath("/admin");
  revalidatePath("/admin/reviews");
  return { success: true };
}

