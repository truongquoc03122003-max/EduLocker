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



export async function adminRegisterLockerDeviceAction(
  compartmentId: string,
  deviceId: string,
  label?: string,
): Promise<{
  success: boolean;
  error?: string;
  deviceId?: string;
  compartmentId?: string;
  deviceSecret?: string;
}> {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Chỉ quản trị viên đang hoạt động mới có quyền này (403).",
    };
  }

  const cleanDeviceId = deviceId.trim().toUpperCase();
  if (!/^[A-Z0-9_-]{3,64}$/.test(cleanDeviceId)) {
    return {
      success: false,
      error: "Device ID chỉ được dùng A-Z, 0-9, dấu - hoặc _ (3–64 ký tự).",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "Chưa cấu hình Supabase." };

  const { data, error } = await supabase.rpc(
    "rpc_admin_register_locker_device",
    {
      p_device_id: cleanDeviceId,
      p_compartment_id: compartmentId,
      p_label: label?.trim() || null,
    },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;

  const deviceSecret =
    typeof payload?.device_secret === "string"
      ? payload.device_secret
      : undefined;

  if (!deviceSecret) {
    return {
      success: false,
      error: "Supabase không trả về device secret. Vui lòng thử ghép lại.",
    };
  }

  revalidatePath("/admin/lockers");

  return {
    success: true,
    deviceId:
      typeof payload?.device_id === "string"
        ? payload.device_id
        : cleanDeviceId,
    compartmentId:
      typeof payload?.compartment_id === "string"
        ? payload.compartment_id
        : compartmentId,
    deviceSecret,
  };
}

export async function adminQueueLockerCommandAction(
  compartmentId: string,
  action: "OPEN" | "CLOSE" = "OPEN",
): Promise<{ success: boolean; error?: string; commandId?: string }> {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Chỉ quản trị viên đang hoạt động mới có quyền này (403).",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "Chưa cấu hình Supabase." };

  const { data, error } = await supabase.rpc("rpc_admin_queue_locker_command", {
    p_compartment_id: compartmentId,
    p_action: action,
  });

  if (error) {
    return { success: false, error: error.message };
  }

  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;

  if (payload?.success !== true) {
    return {
      success: false,
      error:
        typeof payload?.message === "string"
          ? payload.message
          : "Không thể gửi lệnh tới ESP32.",
    };
  }

  revalidatePath("/admin/lockers");

  return {
    success: true,
    commandId:
      typeof payload?.command_id === "string"
        ? payload.command_id
        : undefined,
  };
}


export async function adminSetLockerDeviceEnabledAction(
  deviceId: string,
  enabled: boolean,
): Promise<{ success: boolean; error?: string }> {
  const admin = await requireActiveAdmin();
  if (!admin) {
    return {
      success: false,
      error: "Chỉ quản trị viên đang hoạt động mới có quyền này (403).",
    };
  }

  const cleanDeviceId = deviceId.trim().toUpperCase();
  if (!cleanDeviceId) {
    return { success: false, error: "Device ID không hợp lệ." };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) return { success: false, error: "Chưa cấu hình Supabase." };

  const { data, error } = await supabase.rpc(
    "rpc_admin_set_locker_device_enabled",
    {
      p_device_id: cleanDeviceId,
      p_enabled: enabled,
    },
  );

  if (error) {
    return { success: false, error: error.message };
  }

  const payload =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : null;

  if (payload?.success !== true) {
    return {
      success: false,
      error:
        typeof payload?.message === "string"
          ? payload.message
          : "Không thể cập nhật trạng thái ESP32.",
    };
  }

  revalidatePath("/admin/lockers");
  return { success: true };
}
