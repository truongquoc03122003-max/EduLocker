/**
 * Server-only Demo Mode flag cho Demo OTP Delivery (Phase 3).
 *
 * - Chỉ đọc biến môi trường server `EDULOCKER_DEMO_MODE` (KHÔNG có prefix `NEXT_PUBLIC_`),
 *   nên giá trị không bao giờ bị bundle ra client.
 * - Mặc định TẮT (secure-by-default) nếu biến không được đặt bằng `"true"`.
 * - Đây chỉ là lớp kiểm soát thứ nhất. Database còn kiểm tra độc lập cờ
 *   `public.app_runtime_settings.demo_mode` bên trong `rpc_get_buyer_demo_otp`,
 *   nên buyer gọi thẳng Supabase RPC cũng không lấy được OTP khi Demo Mode tắt.
 */
export function isDemoOtpDeliveryEnabled(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.EDULOCKER_DEMO_MODE?.trim().toLowerCase() === "true";
}

