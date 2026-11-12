import { z } from "zod";
import type {
  DisputeStatus,
  OrderStatus,
  ReportItem,
  ReportTargetType,
} from "@/types";

export const MAX_MESSAGE_LENGTH = 1000;

export const REPORT_REASONS = [
  "Sản phẩm không phù hợp",
  "Thông tin sai lệch",
  "Nội dung lừa đảo",
  "Spam",
  "Ngôn từ không phù hợp",
  "Khác",
] as const;

export function validateMessageContent(raw: string): {
  valid: boolean;
  content: string;
  error?: string;
} {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return {
      valid: false,
      content: "",
      error: "Nội dung tin nhắn không được để trống.",
    };
  }
  if (trimmed.length > MAX_MESSAGE_LENGTH) {
    return {
      valid: false,
      content: trimmed,
      error: `Tin nhắn tối đa ${MAX_MESSAGE_LENGTH} ký tự.`,
    };
  }
  return { valid: true, content: trimmed };
}

export function isConversationParticipant(
  userId: string | null | undefined,
  conversation: { buyerId: string; sellerId: string },
): boolean {
  if (!userId) return false;
  return userId === conversation.buyerId || userId === conversation.sellerId;
}

export const reviewSubmitSchema = z.object({
  rating: z.number().int().min(1).max(5),
  descriptionAccuracy: z.number().int().min(1).max(5),
  productConditionRating: z.number().int().min(1).max(5),
  transactionRating: z.number().int().min(1).max(5),
  comment: z
    .string()
    .trim()
    .max(1000, "Nhận xét tối đa 1000 ký tự.")
    .optional(),
});

export function canSubmitOrderReview(params: {
  actorId: string | null | undefined;
  buyerId: string;
  sellerId: string;
  orderStatus: OrderStatus;
  hasExistingReview: boolean;
}): { allowed: boolean; reason?: string } {
  if (!params.actorId) {
    return { allowed: false, reason: "Vui lòng đăng nhập." };
  }
  if (params.actorId === params.sellerId) {
    return { allowed: false, reason: "Không thể tự đánh giá chính mình." };
  }
  if (params.actorId !== params.buyerId) {
    return {
      allowed: false,
      reason: "Chỉ người mua của đơn hàng mới được đánh giá.",
    };
  }
  if (params.orderStatus !== "COMPLETED") {
    return {
      allowed: false,
      reason: "Chỉ có thể đánh giá sau khi đơn hàng hoàn tất (COMPLETED).",
    };
  }
  if (params.hasExistingReview) {
    return { allowed: false, reason: "Bạn đã đánh giá đơn hàng này rồi." };
  }
  return { allowed: true };
}

export const reportSubmitSchema = z.object({
  targetType: z.enum(["PRODUCT", "USER", "MESSAGE"]),
  targetId: z.string().uuid("Mã đối tượng báo cáo không hợp lệ."),
  reason: z.string().trim().min(3, "Vui lòng chọn lý do báo cáo.").max(200),
  description: z
    .string()
    .trim()
    .max(1000, "Mô tả chi tiết tối đa 1000 ký tự.")
    .optional(),
});

export function isDuplicateActiveReport(
  existingReports: Pick<
    ReportItem,
    "reporterId" | "targetType" | "targetId" | "status"
  >[],
  reporterId: string,
  targetType: ReportTargetType,
  targetId: string,
): boolean {
  return existingReports.some(
    (r) =>
      r.reporterId === reporterId &&
      r.targetType === targetType &&
      r.targetId === targetId &&
      (r.status === "PENDING" || r.status === "REVIEWING"),
  );
}

export function canAdminAccess(
  profile: { role?: string | null; accountStatus?: string | null } | null,
): boolean {
  if (!profile) return false;
  return (
    profile.role === "admin" &&
    (profile.accountStatus ?? "ACTIVE") === "ACTIVE"
  );
}

export function canResolveDisputeTransition(
  currentStatus: DisputeStatus,
  outcome: "RESOLVED_BUYER" | "RESOLVED_SELLER",
): {
  allowed: boolean;
  nextOrderStatus?: "RETURN_PENDING" | "COMPLETED";
  nextPaymentStatus?: "REFUNDED_DEMO" | "RELEASED_DEMO";
} {
  if (currentStatus !== "OPEN" && currentStatus !== "UNDER_REVIEW") {
    return { allowed: false };
  }
  if (outcome === "RESOLVED_BUYER") {
    return {
      allowed: true,
      nextOrderStatus: "RETURN_PENDING",
      nextPaymentStatus: "REFUNDED_DEMO",
    };
  }
  return {
    allowed: true,
    nextOrderStatus: "COMPLETED",
    nextPaymentStatus: "RELEASED_DEMO",
  };
}

