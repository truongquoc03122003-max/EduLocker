import type {
  OrderEventType,
  OrderStatus,
  PaymentSimulatorStatus,
  ProductStatus,
} from "@/types";

export const ALLOWED_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING: ["SELLER_CONFIRMED", "CANCELLED", "EXPIRED"],
  SELLER_CONFIRMED: ["AWAITING_DROPOFF", "CANCELLED", "EXPIRED"],
  AWAITING_DROPOFF: ["IN_LOCKER", "CANCELLED", "EXPIRED"],
  IN_LOCKER: ["READY_FOR_PICKUP", "RETURN_PENDING"],
  // Sau khi hàng đã nằm trong tủ: KHÔNG auto-expire (pickup timeout / hoàn trả xử lý ở Phase 4)
  READY_FOR_PICKUP: ["PICKED_UP", "RETURN_PENDING"],
  PICKED_UP: ["COMPLETED", "DISPUTED"],
  COMPLETED: [],
  CANCELLED: [],
  EXPIRED: ["RETURN_PENDING", "RETURNED"],
  DISPUTED: ["COMPLETED", "RETURN_PENDING", "CANCELLED"],
  RETURN_PENDING: ["RETURNED"],
  RETURNED: [],
};

export const CANCELLABLE_ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "SELLER_CONFIRMED",
  "AWAITING_DROPOFF",
];

/**
 * Chỉ các trạng thái TRƯỚC khi người bán gửi hàng vào tủ mới được auto-expire.
 * READY_FOR_PICKUP không nằm trong danh sách: OTP hết hạn không bao giờ được
 * giải phóng ngăn tủ hay đưa sản phẩm trở lại Marketplace.
 */
export const EXPIRABLE_ORDER_STATUSES: OrderStatus[] = [
  "PENDING",
  "SELLER_CONFIRMED",
  "AWAITING_DROPOFF",
];

export function canTransitionOrderStatus(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return ALLOWED_ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
): boolean {
  return canTransitionOrderStatus(from, to);
}

export function assertOrderTransition(
  from: OrderStatus,
  to: OrderStatus,
): OrderStatus {
  if (!canTransitionOrderStatus(from, to)) {
    throw new Error(`Chuyển trạng thái đơn hàng không hợp lệ: ${from} → ${to}`);
  }
  return to;
}

export function transitionOrder(
  from: OrderStatus,
  to: OrderStatus,
): OrderStatus {
  return assertOrderTransition(from, to);
}

export function canCancelOrder(status: OrderStatus): boolean {
  return CANCELLABLE_ORDER_STATUSES.includes(status);
}

export function canExpireOrder(status: OrderStatus): boolean {
  return EXPIRABLE_ORDER_STATUSES.includes(status);
}

/**
 * Quyết định auto-expire của ĐƠN HÀNG (tách biệt hoàn toàn với hạn OTP).
 * Hạn OTP không phải là tham số: OTP hết hạn không ảnh hưởng tới đơn hàng.
 */
export function shouldAutoExpireOrder(params: {
  status: OrderStatus;
  orderExpiresAt: string | null;
  nowMs?: number;
}): boolean {
  if (!canExpireOrder(params.status) || !params.orderExpiresAt) {
    return false;
  }
  return (
    new Date(params.orderExpiresAt).getTime() <= (params.nowMs ?? Date.now())
  );
}

/**
 * Buyer chỉ được tạo lại OTP khi đơn READY_FOR_PICKUP, ngăn tủ vẫn OCCUPIED,
 * chưa mở tủ, và token hiện tại đã hết hạn / bị thu hồi / hết lượt thử.
 */
export function canRegenerateLockerOtp(params: {
  status: OrderStatus;
  compartmentStatus: string | null;
  otpReason?: string | null;
  isUnlocked?: boolean;
}): boolean {
  return (
    params.status === "READY_FOR_PICKUP" &&
    params.compartmentStatus === "OCCUPIED" &&
    !params.isUnlocked &&
    (params.otpReason === "EXPIRED" ||
      params.otpReason === "REVOKED" ||
      params.otpReason === "NO_TOKEN")
  );
}

export function canOpenDispute(status: OrderStatus): boolean {
  return status === "PICKED_UP";
}

/**
 * Ánh xạ trạng thái đơn hàng sang trạng thái Payment Simulator và Product tương ứng.
 */
export function resolveOrderSideEffects(nextOrderStatus: OrderStatus): {
  paymentStatus: PaymentSimulatorStatus;
  productStatus: ProductStatus;
} {
  switch (nextOrderStatus) {
    case "PENDING":
    case "SELLER_CONFIRMED":
    case "AWAITING_DROPOFF":
    case "IN_LOCKER":
    case "READY_FOR_PICKUP":
    case "PICKED_UP":
    case "DISPUTED":
    case "RETURN_PENDING":
      return {
        paymentStatus: "HELD_DEMO",
        productStatus: "RESERVED",
      };
    case "COMPLETED":
      return {
        paymentStatus: "RELEASED_DEMO",
        productStatus: "SOLD",
      };
    case "CANCELLED":
    case "EXPIRED":
    case "RETURNED":
      return {
        paymentStatus: "REFUNDED_DEMO",
        productStatus: "AVAILABLE",
      };
  }
}

export function getOrderStatusMeta(status: OrderStatus): {
  label: string;
  shortDesc: string;
  badgeVariant: "default" | "secondary" | "eco" | "warning" | "outline";
  badgeClass: string;
} {
  switch (status) {
    case "PENDING":
      return {
        label: "Chờ người bán xác nhận",
        shortDesc:
          "Đơn hàng đã tạo. Đang chờ người bán xác nhận và cấp ngăn tủ Smart Locker.",
        badgeVariant: "warning",
        badgeClass: "border-amber-300 bg-amber-50 text-amber-800",
      };
    case "SELLER_CONFIRMED":
      return {
        label: "Người bán đã xác nhận",
        shortDesc: "Người bán đã xác nhận đơn hàng.",
        badgeVariant: "default",
        badgeClass: "border-blue-300 bg-blue-50 text-blue-800",
      };
    case "AWAITING_DROPOFF":
      return {
        label: "Chờ gửi vào Locker",
        shortDesc:
          "Hệ thống đã giữ ngăn tủ. Đang chờ người bán mang sản phẩm gửi vào Smart Locker.",
        badgeVariant: "default",
        badgeClass: "border-blue-300 bg-blue-50 text-blue-800",
      };
    case "IN_LOCKER":
      return {
        label: "Đã gửi vào Locker",
        shortDesc: "Người bán đã đặt sản phẩm vào ngăn tủ.",
        badgeVariant: "secondary",
        badgeClass: "border-indigo-300 bg-indigo-50 text-indigo-800",
      };
    case "READY_FOR_PICKUP":
      return {
        label: "Sẵn sàng nhận hàng",
        shortDesc:
          "Sản phẩm đã nằm trong ngăn tủ và mã OTP mở khóa 1 lần đã sẵn sàng cho người mua.",
        badgeVariant: "eco",
        badgeClass: "border-emerald-300 bg-emerald-50 text-emerald-800",
      };
    case "PICKED_UP":
      return {
        label: "Đã lấy hàng",
        shortDesc:
          "Người mua đã mở tủ lấy sản phẩm. Vui lòng kiểm tra và bấm xác nhận hoàn tất giao dịch.",
        badgeVariant: "default",
        badgeClass: "border-sky-300 bg-sky-50 text-sky-800",
      };
    case "COMPLETED":
      return {
        label: "Hoàn tất",
        shortDesc:
          "Giao dịch hoàn tất! Khoản thanh toán mô phỏng đã được giải ngân cho người bán.",
        badgeVariant: "eco",
        badgeClass: "border-emerald-400 bg-emerald-100 text-emerald-900",
      };
    case "CANCELLED":
      return {
        label: "Đã hủy",
        shortDesc:
          "Đơn hàng đã bị hủy. Sản phẩm được mở lại và khoản thanh toán mô phỏng đã hoàn trả.",
        badgeVariant: "outline",
        badgeClass: "border-slate-300 bg-slate-100 text-slate-700",
      };
    case "EXPIRED":
      return {
        label: "Đã hết hạn",
        shortDesc:
          "Đơn hàng quá thời hạn xử lý. Hệ thống đã tự động giải phóng ngăn tủ và sản phẩm.",
        badgeVariant: "outline",
        badgeClass: "border-slate-300 bg-slate-100 text-slate-600",
      };
    case "DISPUTED":
      return {
        label: "Đang khiếu nại",
        shortDesc:
          "Người mua báo sản phẩm không đúng mô tả. Khoản thanh toán mô phỏng tiếp tục được tạm giữ (HELD_DEMO).",
        badgeVariant: "warning",
        badgeClass: "border-rose-300 bg-rose-50 text-rose-800",
      };
    case "RETURN_PENDING":
      return {
        label: "Chờ hoàn trả",
        shortDesc: "Đơn hàng đang trong quy trình chờ hoàn trả sản phẩm.",
        badgeVariant: "warning",
        badgeClass: "border-amber-300 bg-amber-50 text-amber-800",
      };
    case "RETURNED":
      return {
        label: "Đã hoàn trả",
        shortDesc: "Sản phẩm đã được hoàn trả cho người bán.",
        badgeVariant: "outline",
        badgeClass: "border-slate-300 bg-slate-100 text-slate-700",
      };
  }
}

export function getPaymentStatusMeta(status: PaymentSimulatorStatus): {
  label: string;
  description: string;
  badgeClass: string;
} {
  switch (status) {
    case "PENDING":
      return {
        label: "Đang khởi tạo (Demo)",
        description: "Khoản thanh toán mô phỏng đang được khởi tạo.",
        badgeClass: "border-slate-300 bg-slate-100 text-slate-700",
      };
    case "HELD_DEMO":
      return {
        label: "Đang tạm giữ (Demo)",
        description:
          "Khoản tiền mô phỏng được giữ an toàn cho đến khi người mua lấy hàng từ Smart Locker và xác nhận đúng mô tả.",
        badgeClass: "border-amber-300 bg-amber-50 text-amber-800",
      };
    case "RELEASED_DEMO":
      return {
        label: "Đã giải ngân cho người bán (Demo)",
        description:
          "Người mua đã xác nhận nhận hàng thành công. Khoản thanh toán mô phỏng đã chuyển cho người bán.",
        badgeClass: "border-emerald-300 bg-emerald-50 text-emerald-800",
      };
    case "REFUNDED_DEMO":
      return {
        label: "Đã hoàn lại người mua (Demo)",
        description:
          "Đơn hàng đã hủy hoặc hết hạn. Khoản thanh toán mô phỏng đã được hoàn trả cho người mua.",
        badgeClass: "border-blue-300 bg-blue-50 text-blue-800",
      };
  }
}

export function getOrderEventLabel(
  eventType: OrderEventType,
  metadata?: Record<string, unknown>,
): { title: string; subtitle: string } {
  const compCode =
    typeof metadata?.compartment_code === "string"
      ? metadata.compartment_code
      : null;

  switch (eventType) {
    case "ORDER_CREATED":
      return {
        title: "Đơn được tạo",
        subtitle:
          "Người mua đặt hàng thành công. Khoản thanh toán mô phỏng chuyển sang trạng thái Đang tạm giữ (HELD_DEMO).",
      };
    case "SELLER_CONFIRMED":
      return {
        title: "Người bán xác nhận",
        subtitle: "Người bán đã xác nhận đơn hàng và chọn trạm Smart Locker.",
      };
    case "LOCKER_RESERVED":
      return {
        title: compCode
          ? `Đã cấp ngăn Locker ${compCode}`
          : "Đã cấp ngăn Smart Locker",
        subtitle: compCode
          ? `Hệ thống đã giữ chỗ ngăn tủ ${compCode} (RESERVED) chờ người bán gửi hàng.`
          : "Hệ thống đã giữ chỗ ngăn tủ chờ người bán gửi hàng.",
      };
    case "ITEM_DROPPED_OFF":
      return {
        title: "Người bán gửi hàng",
        subtitle: compCode
          ? `Người bán đã đặt sản phẩm vào ngăn tủ ${compCode} (OCCUPIED).`
          : "Người bán đã đặt sản phẩm vào ngăn tủ Smart Locker.",
      };
    case "OTP_GENERATED":
      return {
        title: "Sẵn sàng nhận (Đã cấp mã OTP)",
        subtitle:
          "Hệ thống đã tạo mã OTP 6 số dùng 1 lần (hiệu lực 30 phút, tối đa 5 lần thử) cho người mua.",
      };
    case "OTP_REGENERATED":
      return {
        title: "Đã cấp lại mã OTP mới",
        subtitle:
          "Mã OTP cũ đã hết hạn hoặc bị thu hồi và đã bị vô hiệu hóa. Người mua nhận mã OTP 6 số mới (hiệu lực 30 phút, tối đa 5 lần thử). Sản phẩm vẫn nằm an toàn trong ngăn tủ.",
      };
    case "LOCKER_UNLOCKED":
      return {
        title: "Người mua mở tủ",
        subtitle:
          "Người mua đã nhập đúng mã OTP và mở cửa ngăn tủ Smart Locker.",
      };
    case "ITEM_PICKED_UP":
      return {
        title: "Đã nhận hàng từ ngăn tủ",
        subtitle:
          "Người mua đã lấy sản phẩm ra khỏi tủ. Ngăn tủ được giải phóng về trạng thái Trống (AVAILABLE).",
      };
    case "ORDER_COMPLETED":
      return {
        title: "Hoàn tất giao dịch",
        subtitle:
          "Người mua xác nhận sản phẩm đúng mô tả. Sản phẩm chuyển sang Đã bán (SOLD) và giải ngân mô phỏng (RELEASED_DEMO).",
      };
    case "ORDER_CANCELLED":
      return {
        title: "Đơn hàng đã hủy",
        subtitle:
          typeof metadata?.reason === "string"
            ? `Lý do: ${metadata.reason}. Đã giải phóng sản phẩm/ngăn tủ và hoàn trả thanh toán mô phỏng (REFUNDED_DEMO).`
            : "Đã giải phóng sản phẩm/ngăn tủ và hoàn trả thanh toán mô phỏng (REFUNDED_DEMO).",
      };
    case "ORDER_EXPIRED":
      return {
        title: "Đơn hàng đã hết hạn",
        subtitle:
          "Quá thời hạn xử lý. Hệ thống tự động giải phóng sản phẩm, ngăn tủ và hoàn lại khoản thanh toán mô phỏng.",
      };
    case "DISPUTE_OPENED":
      return {
        title: "Mở báo cáo sản phẩm không đúng mô tả",
        subtitle:
          typeof metadata?.dispute_reason === "string"
            ? `Lý do khiếu nại: "${metadata.dispute_reason}". Khoản thanh toán mô phỏng tiếp tục được giữ (HELD_DEMO).`
            : "Khoản thanh toán mô phỏng tiếp tục được giữ (HELD_DEMO) chờ đối soát.",
      };
  }
}
