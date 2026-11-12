"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";

function normalizeOrderErrorMessage(rawMessage?: string | null): string {
  const msg = (rawMessage ?? "").trim();
  if (!msg) {
    return "Không thể thực hiện thao tác trên đơn hàng. Vui lòng thử lại.";
  }
  if (
    msg.includes("Sản phẩm vừa được người khác đặt mua") ||
    msg.includes("idx_orders_one_active_per_product") ||
    msg.includes("duplicate key")
  ) {
    return "Sản phẩm vừa được người khác đặt mua.";
  }
  if (msg.includes("Hiện không còn ngăn trống tại trạm này")) {
    return "Hiện không còn ngăn trống tại trạm này. Vui lòng chọn trạm khác.";
  }
  if (msg.includes("Không còn ngăn tủ trống tại trạm này")) {
    return "Không còn ngăn tủ trống tại trạm này.";
  }
  if (msg.includes("Đơn hàng không còn ở trạng thái phù hợp")) {
    return "Đơn hàng không còn ở trạng thái phù hợp.";
  }
  if (msg.includes("Bạn không có quyền thao tác đơn hàng này")) {
    return "Bạn không có quyền thao tác đơn hàng này.";
  }
  if (msg.includes("Đơn hàng đã hết hạn")) {
    return "Đơn hàng đã hết hạn.";
  }
  if (msg.includes("Mã OTP không đúng")) {
    return "Mã OTP không đúng.";
  }
  if (msg.includes("Mã OTP đã hết hạn")) {
    return "Mã OTP đã hết hạn.";
  }
  if (msg.includes("Bạn đã nhập sai quá số lần cho phép")) {
    return "Bạn đã nhập sai quá số lần cho phép.";
  }
  return msg;
}

export async function createOrderAction(
  productId: string,
  preferredLockerId?: string,
): Promise<{
  success: boolean;
  orderId?: string;
  error?: string;
}> {
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
      error: "Vui lòng đăng nhập để đặt mua sản phẩm.",
    };
  }

  const { data, error } = await supabase.rpc("rpc_create_order", {
    p_product_id: productId,
    p_preferred_locker_id: preferredLockerId ?? null,
  });

  if (error) {
    return {
      success: false,
      error: normalizeOrderErrorMessage(error.message),
    };
  }

  const resultObj =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};
  const orderId =
    typeof resultObj.order_id === "string" ? resultObj.order_id : undefined;

  if (!orderId) {
    return {
      success: false,
      error: "Không thể khởi tạo đơn hàng. Vui lòng thử lại.",
    };
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);

  return {
    success: true,
    orderId,
  };
}

export async function sellerConfirmOrderAction(
  orderId: string,
  lockerLocationId?: string,
): Promise<{
  success: boolean;
  compartmentCode?: string;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { data, error } = await supabase.rpc("rpc_seller_confirm_order", {
    p_order_id: orderId,
    p_locker_location_id: lockerLocationId ?? null,
  });

  if (error) {
    return {
      success: false,
      error: normalizeOrderErrorMessage(error.message),
    };
  }

  const resultObj =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/lockers");

  return {
    success: true,
    compartmentCode:
      typeof resultObj.compartment_code === "string"
        ? resultObj.compartment_code
        : undefined,
  };
}

export async function sellerDropoffOrderAction(orderId: string): Promise<{
  success: boolean;
  compartmentCode?: string;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { data, error } = await supabase.rpc("rpc_seller_dropoff", {
    p_order_id: orderId,
  });

  if (error) {
    return {
      success: false,
      error: normalizeOrderErrorMessage(error.message),
    };
  }

  const resultObj =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/lockers");

  return {
    success: true,
    compartmentCode:
      typeof resultObj.compartment_code === "string"
        ? resultObj.compartment_code
        : undefined,
  };
}

export async function verifyLockerOtpAction(
  orderId: string,
  otpCode: string,
): Promise<{
  success: boolean;
  unlocked?: boolean;
  errorCode?: string;
  attemptCount?: number;
  maxAttempts?: number;
  error?: string;
}> {
  const cleanOtp = otpCode.trim();
  if (!/^\d{6}$/.test(cleanOtp)) {
    return {
      success: false,
      error: "Mã OTP không đúng.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { data, error } = await supabase.rpc("rpc_verify_locker_otp", {
    p_order_id: orderId,
    p_otp_code: cleanOtp,
  });

  if (error) {
    return {
      success: false,
      error: normalizeOrderErrorMessage(error.message),
    };
  }

  const resultObj =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, unknown>)
      : {};

  if (!resultObj.success) {
    return {
      success: false,
      errorCode:
        typeof resultObj.error_code === "string"
          ? resultObj.error_code
          : "INVALID_OTP",
      attemptCount:
        typeof resultObj.attempt_count === "number"
          ? resultObj.attempt_count
          : undefined,
      maxAttempts:
        typeof resultObj.max_attempts === "number"
          ? resultObj.max_attempts
          : undefined,
      error: normalizeOrderErrorMessage(
        typeof resultObj.message === "string"
          ? resultObj.message
          : "Mã OTP không đúng.",
      ),
    };
  }

  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/lockers");

  return {
    success: true,
    unlocked: true,
  };
}

export async function confirmPickupOrderAction(orderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { error } = await supabase.rpc("rpc_confirm_pickup", {
    p_order_id: orderId,
  });

  if (error) {
    return {
      success: false,
      error: normalizeOrderErrorMessage(error.message),
    };
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/lockers");

  return { success: true };
}

export async function completeOrderAction(
  orderId: string,
  confirmedReceived: boolean,
): Promise<{
  success: boolean;
  error?: string;
}> {
  if (!confirmedReceived) {
    return {
      success: false,
      error: "Vui lòng đánh dấu xác nhận đã nhận và kiểm tra sản phẩm.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { error } = await supabase.rpc("rpc_complete_order", {
    p_order_id: orderId,
  });

  if (error) {
    return {
      success: false,
      error: normalizeOrderErrorMessage(error.message),
    };
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/my-products");
  revalidatePath("/profile");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/lockers");

  return { success: true };
}

export async function cancelOrderAction(
  orderId: string,
  reason?: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { error } = await supabase.rpc("rpc_cancel_order", {
    p_order_id: orderId,
    p_reason: reason ?? null,
  });

  if (error) {
    return {
      success: false,
      error: normalizeOrderErrorMessage(error.message),
    };
  }

  revalidatePath("/");
  revalidatePath("/products");
  revalidatePath("/my-products");
  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);
  revalidatePath("/lockers");

  return { success: true };
}

export async function openDisputeOrderAction(
  orderId: string,
  reason: string,
): Promise<{
  success: boolean;
  error?: string;
}> {
  const cleanReason = reason.trim();
  if (cleanReason.length < 10) {
    return {
      success: false,
      error: "Vui lòng mô tả lý do báo cáo tối thiểu 10 ký tự.",
    };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { error } = await supabase.rpc("rpc_open_dispute", {
    p_order_id: orderId,
    p_reason: cleanReason,
  });

  if (error) {
    return {
      success: false,
      error: normalizeOrderErrorMessage(error.message),
    };
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);

  return { success: true };
}

/**
 * Buyer tạo lại mã OTP mở tủ khi mã cũ đã hết hạn / bị thu hồi.
 * Không thay đổi trạng thái order, product, locker hay payment.
 * Plaintext OTP không bao giờ được trả về từ action này.
 */
export async function regenerateLockerOtpAction(orderId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      success: false,
      error: "Supabase chưa được cấu hình cho môi trường này.",
    };
  }

  const { error } = await supabase.rpc("rpc_regenerate_locker_otp", {
    p_order_id: orderId,
  });

  if (error) {
    return {
      success: false,
      error: normalizeOrderErrorMessage(error.message),
    };
  }

  revalidatePath("/orders");
  revalidatePath(`/orders/${orderId}`);

  return { success: true };
}

