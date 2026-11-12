import crypto from "node:crypto";
import type {
  LockerCompartment,
  LockerCompartmentStatus,
  SmartLockerProvider,
} from "@/types";
import { LOCKER_LOCATIONS } from "@/features/marketplace/mock-data";

/**
 * MockSmartLockerProvider:
 * Abstraction mô phỏng cho Smart Locker (Phase 1 -> Phase 3).
 * Thiết kế theo interface SmartLockerProvider để Phase 5 có thể thay thế bằng
 * ESP32SmartLockerProvider mà không cần viết lại hệ thống đơn hàng.
 */
export class MockSmartLockerProvider implements SmartLockerProvider {
  private compartments = new Map<string, LockerCompartment>();

  constructor(initialCompartments?: LockerCompartment[]) {
    if (initialCompartments) {
      for (const comp of initialCompartments) {
        this.compartments.set(comp.id, { ...comp });
      }
    } else {
      for (const loc of LOCKER_LOCATIONS) {
        for (const comp of loc.compartments) {
          this.compartments.set(comp.id, { ...comp });
        }
      }
    }
  }

  async reserveCompartment(
    lockerId: string,
    compartmentCode: string,
    orderId: string,
  ): Promise<void> {
    const found = Array.from(this.compartments.values()).find(
      (c) => c.lockerId === lockerId && c.code === compartmentCode,
    );
    if (!found) {
      throw new Error("Ngăn tủ không tồn tại.");
    }
    if (found.status !== "AVAILABLE") {
      throw new Error("Ngăn tủ hiện không khả dụng.");
    }
    found.status = "RESERVED";
    found.currentOrderCode = orderId;
  }

  /**
   * Tự động cấp phát ngăn AVAILABLE đầu tiên tại trạm `lockerId`.
   * Không bao giờ chọn ngăn RESERVED, OCCUPIED hoặc MAINTENANCE.
   */
  async allocateAvailableCompartment(
    lockerId: string,
    orderId: string,
  ): Promise<LockerCompartment> {
    const available = Array.from(this.compartments.values())
      .filter((c) => c.lockerId === lockerId && c.status === "AVAILABLE")
      .sort((a, b) => a.code.localeCompare(b.code));

    const chosen = available[0];
    if (!chosen) {
      throw new Error(
        "Hiện không còn ngăn trống tại trạm này. Vui lòng chọn trạm khác.",
      );
    }

    chosen.status = "RESERVED";
    chosen.currentOrderCode = orderId;
    return { ...chosen };
  }

  /**
   * Người bán gửi hàng vào ngăn đã được RESERVED -> chuyển sang OCCUPIED.
   */
  async dropOffCompartment(
    compartmentId: string,
    orderId: string,
  ): Promise<void> {
    const comp = this.compartments.get(compartmentId);
    if (!comp) {
      throw new Error("Ngăn tủ không tồn tại.");
    }
    if (comp.status !== "RESERVED") {
      throw new Error("Ngăn tủ không ở trạng thái chờ gửi hàng (RESERVED).");
    }
    if (comp.currentOrderCode && comp.currentOrderCode !== orderId) {
      throw new Error("Ngăn tủ đang được giữ cho một đơn hàng khác.");
    }
    comp.status = "OCCUPIED";
    comp.currentOrderCode = orderId;
  }

  async releaseCompartment(compartmentId: string): Promise<void> {
    const comp = this.compartments.get(compartmentId);
    if (!comp) {
      throw new Error("Ngăn tủ không tồn tại.");
    }
    if (comp.status === "MAINTENANCE") {
      throw new Error("Ngăn tủ đang bảo trì.");
    }
    comp.status = "AVAILABLE";
    comp.currentOrderCode = undefined;
  }

  /**
   * unlockCompartment:
   * Chỉ cho phép mở tủ khi ngăn đang ở trạng thái OCCUPIED (đã có hàng bên trong).
   * Từ chối mở nếu ngăn đang AVAILABLE, RESERVED hoặc MAINTENANCE.
   */
  async unlockCompartment(compartmentId: string): Promise<void> {
    const comp = this.compartments.get(compartmentId);
    if (!comp) {
      throw new Error("Ngăn tủ không tồn tại.");
    }
    if (comp.status !== "OCCUPIED") {
      throw new Error(
        "Ngăn tủ hiện không khả dụng hoặc chưa có hàng để mở.",
      );
    }
  }

  /**
   * Người mua xác nhận đã lấy hàng -> giải phóng ngăn về AVAILABLE.
   */
  async confirmPickupFromCompartment(compartmentId: string): Promise<void> {
    const comp = this.compartments.get(compartmentId);
    if (!comp) {
      throw new Error("Ngăn tủ không tồn tại.");
    }
    if (comp.status !== "OCCUPIED") {
      throw new Error("Ngăn tủ hiện không có hàng để xác nhận lấy.");
    }
    comp.status = "AVAILABLE";
    comp.currentOrderCode = undefined;
  }

  async getCompartmentStatus(
    compartmentId: string,
  ): Promise<LockerCompartmentStatus> {
    const comp = this.compartments.get(compartmentId);
    if (!comp) {
      throw new Error("Ngăn tủ không tồn tại.");
    }
    return comp.status;
  }
}

// =============================================================================
// CRYPTO-SECURE OTP HASHING & VALIDATION ENGINE (Never stores plaintext OTP)
// =============================================================================

export interface HashedAccessTokenRecord {
  id: string;
  orderId: string;
  buyerId: string;
  compartmentId: string;
  tokenHash: string;
  expiresAtMs: number;
  usedAtMs: number | null;
  revokedAtMs: number | null;
  attemptCount: number;
  maxAttempts: number;
}

export function generateSecureSixDigitOtp(): string {
  const num = crypto.randomInt(100000, 1000000);
  return String(num).padStart(6, "0");
}

export function hashOrderOtp(orderId: string, otpCode: string): string {
  return crypto
    .createHash("sha256")
    .update(`${orderId}:${otpCode.trim()}`)
    .digest("hex");
}

export class OtpSecurityManager {
  private tokensByOrder = new Map<string, HashedAccessTokenRecord>();
  private revokedHistoryByOrder = new Map<string, HashedAccessTokenRecord[]>();

  issueToken(params: {
    orderId: string;
    buyerId: string;
    compartmentId: string;
    ttlMs?: number;
    maxAttempts?: number;
    nowMs?: number;
  }): { otpCode: string; record: HashedAccessTokenRecord } {
    const now = params.nowMs ?? Date.now();
    const ttl = params.ttlMs ?? 30 * 60 * 1000; // Default 30 minutes
    const maxAttempts = params.maxAttempts ?? 5;
    const otpCode = generateSecureSixDigitOtp();
    const tokenHash = hashOrderOtp(params.orderId, otpCode);

    const record: HashedAccessTokenRecord = {
      id: crypto.randomUUID(),
      orderId: params.orderId,
      buyerId: params.buyerId,
      compartmentId: params.compartmentId,
      tokenHash,
      expiresAtMs: now + ttl,
      usedAtMs: null,
      revokedAtMs: null,
      attemptCount: 0,
      maxAttempts,
    };

    this.tokensByOrder.set(params.orderId, record);
    return { otpCode, record: { ...record } };
  }

  /**
   * Thu hồi token cũ (nếu chưa dùng) và cấp token mới với TTL 30 phút, attemptCount = 0.
   */
  regenerateToken(params: {
    orderId: string;
    actorUserId: string;
    ttlMs?: number;
    maxAttempts?: number;
    nowMs?: number;
  }): {
    otpCode: string;
    oldRecord: HashedAccessTokenRecord | undefined;
    newRecord: HashedAccessTokenRecord;
  } {
    const now = params.nowMs ?? Date.now();
    const existing = this.tokensByOrder.get(params.orderId);
    if (!existing) {
      throw new Error("Không tìm thấy phiên OTP để cấp lại.");
    }
    if (existing.buyerId !== params.actorUserId) {
      throw new Error("Bạn không có quyền thao tác đơn hàng này.");
    }
    if (existing.usedAtMs !== null) {
      throw new Error("Mã OTP này đã được sử dụng.");
    }

    const oldCopy: HashedAccessTokenRecord = {
      ...existing,
      revokedAtMs: existing.revokedAtMs ?? now,
    };
    existing.revokedAtMs = oldCopy.revokedAtMs;

    const history = this.revokedHistoryByOrder.get(params.orderId) ?? [];
    history.push(oldCopy);
    this.revokedHistoryByOrder.set(params.orderId, history);

    const { otpCode, record: newRecord } = this.issueToken({
      orderId: params.orderId,
      buyerId: existing.buyerId,
      compartmentId: existing.compartmentId,
      ttlMs: params.ttlMs,
      maxAttempts: params.maxAttempts,
      nowMs: now,
    });

    return {
      otpCode,
      oldRecord: oldCopy,
      newRecord,
    };
  }

  getRevokedHistory(orderId: string): HashedAccessTokenRecord[] {
    return (this.revokedHistoryByOrder.get(orderId) ?? []).map((r) => ({
      ...r,
    }));
  }

  revokeToken(orderId: string, nowMs = Date.now()): void {
    const token = this.tokensByOrder.get(orderId);
    if (token && !token.usedAtMs && !token.revokedAtMs) {
      token.revokedAtMs = nowMs;
    }
  }

  getStoredRecord(orderId: string): HashedAccessTokenRecord | undefined {
    const found = this.tokensByOrder.get(orderId);
    return found ? { ...found } : undefined;
  }

  verifyOtp(params: {
    orderId: string;
    actorUserId: string;
    otpInput: string;
    nowMs?: number;
  }): {
    success: boolean;
    errorCode?:
      | "UNAUTHORIZED"
      | "NO_TOKEN"
      | "ALREADY_USED"
      | "REVOKED"
      | "MAX_ATTEMPTS"
      | "OTP_EXPIRED"
      | "INVALID_OTP";
    message?: string;
    attemptCount?: number;
  } {
    const now = params.nowMs ?? Date.now();
    const token = this.tokensByOrder.get(params.orderId);

    if (!token) {
      return {
        success: false,
        errorCode: "NO_TOKEN",
        message: "Mã OTP không đúng.",
      };
    }

    if (token.buyerId !== params.actorUserId) {
      return {
        success: false,
        errorCode: "UNAUTHORIZED",
        message: "Bạn không có quyền thao tác đơn hàng này.",
      };
    }

    if (token.usedAtMs !== null) {
      return {
        success: false,
        errorCode: "ALREADY_USED",
        message: "Mã OTP này đã được sử dụng.",
      };
    }

    if (
      token.revokedAtMs !== null ||
      token.attemptCount >= token.maxAttempts
    ) {
      return {
        success: false,
        errorCode: "MAX_ATTEMPTS",
        message: "Bạn đã nhập sai quá số lần cho phép.",
        attemptCount: token.attemptCount,
      };
    }

    if (token.expiresAtMs <= now) {
      return {
        success: false,
        errorCode: "OTP_EXPIRED",
        message: "Mã OTP đã hết hạn.",
      };
    }

    const inputHash = hashOrderOtp(params.orderId, params.otpInput);
    if (inputHash !== token.tokenHash) {
      token.attemptCount += 1;
      if (token.attemptCount >= token.maxAttempts) {
        token.revokedAtMs = now;
        return {
          success: false,
          errorCode: "MAX_ATTEMPTS",
          message: "Bạn đã nhập sai quá số lần cho phép.",
          attemptCount: token.attemptCount,
        };
      }
      return {
        success: false,
        errorCode: "INVALID_OTP",
        message: "Mã OTP không đúng.",
        attemptCount: token.attemptCount,
      };
    }

    token.usedAtMs = now;
    return {
      success: true,
      attemptCount: token.attemptCount,
    };
  }
}
