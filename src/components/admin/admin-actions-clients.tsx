"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  adminModerateProductAction,
  adminResolveDisputeAction,
  adminReviewReportAction,
  adminSetUserStatusAction,
  adminToggleCompartmentMaintenanceAction,
  adminToggleReviewVisibilityAction,
  adminRegisterLockerDeviceAction,
  adminQueueLockerCommandAction,
} from "@/features/admin/admin-actions";

export function AdminPagination({
  basePath,
  page,
  total,
  pageSize = 15,
  extraParams = "",
}: {
  basePath: string;
  page: number;
  total: number;
  pageSize?: number;
  extraParams?: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (totalPages <= 1) return null;

  const qs = (p: number) =>
    `${basePath}?page=${p}${extraParams ? `&${extraParams}` : ""}`;

  return (
    <div className="mt-4 flex items-center justify-between text-xs text-slate-600">
      <span>
        Trang {page}/{totalPages} (Tổng {total} mục)
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Button asChild variant="outline" size="sm">
            <Link href={qs(page - 1)}>Trang trước</Link>
          </Button>
        )}
        {page < totalPages && (
          <Button asChild variant="outline" size="sm">
            <Link href={qs(page + 1)}>Trang sau</Link>
          </Button>
        )}
      </div>
    </div>
  );
}

export function AdminUserStatusButton({
  userId,
  currentStatus,
  role,
}: {
  userId: string;
  currentStatus: "ACTIVE" | "SUSPENDED";
  role: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (role === "admin") {
    return <span className="text-[11px] text-slate-400">Admin</span>;
  }

  const nextStatus = currentStatus === "ACTIVE" ? "SUSPENDED" : "ACTIVE";

  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant={currentStatus === "ACTIVE" ? "outline" : "secondary"}
        disabled={isPending}
        onClick={() => {
          setErr(null);
          startTransition(async () => {
            const res = await adminSetUserStatusAction(userId, nextStatus);
            if (!res.success) setErr(res.error ?? "Lỗi");
            else router.refresh();
          });
        }}
      >
        {currentStatus === "ACTIVE" ? "Tạm khóa" : "Mở khóa"}
      </Button>
      {err && <p className="mt-1 text-[10px] text-rose-600">{err}</p>}
    </div>
  );
}

export function AdminProductModerateButton({
  productId,
  status,
}: {
  productId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (status === "RESERVED" || status === "SOLD") {
    return (
      <span className="text-[11px] text-slate-400">Đang giao dịch/Đã bán</span>
    );
  }

  const isHidden = status === "HIDDEN";

  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending}
        onClick={() => {
          setErr(null);
          startTransition(async () => {
            const res = await adminModerateProductAction(
              productId,
              isHidden ? "RESTORE" : "HIDE",
              isHidden ? "Khôi phục hiển thị" : "Ẩn do vi phạm nội quy",
            );
            if (!res.success) setErr(res.error ?? "Lỗi");
            else router.refresh();
          });
        }}
      >
        {isHidden ? "Khôi phục" : "Ẩn sản phẩm"}
      </Button>
      {err && <p className="mt-1 text-[10px] text-rose-600">{err}</p>}
    </div>
  );
}

export function AdminLockerMaintenanceButton({
  compartmentId,
  status,
}: {
  compartmentId: string;
  status: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const isMaintenance = status === "MAINTENANCE";
  const isBusy = status === "OCCUPIED" || status === "RESERVED";

  return (
    <div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={isPending || isBusy}
        title={
          isBusy
            ? "Không thể bảo trì ngăn đang giữ chỗ hoặc đang chứa hàng"
            : undefined
        }
        onClick={() => {
          setErr(null);
          startTransition(async () => {
            const res = await adminToggleCompartmentMaintenanceAction(
              compartmentId,
              !isMaintenance,
            );
            if (!res.success) setErr(res.error ?? "Lỗi");
            else router.refresh();
          });
        }}
      >
        {isMaintenance ? "Mở lại AVAILABLE" : "Đặt MAINTENANCE"}
      </Button>
      {err && <p className="mt-1 text-[10px] text-rose-600">{err}</p>}
    </div>
  );
}

export function AdminReportActions({
  reportId,
  status,
}: {
  reportId: string;
  status: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (status === "RESOLVED" || status === "REJECTED") {
    return <span className="text-xs text-slate-400">Đã xử lý</span>;
  }

  const handleAction = (next: "REVIEWING" | "RESOLVED" | "REJECTED") => {
    setErr(null);
    startTransition(async () => {
      const res = await adminReviewReportAction(reportId, next, note);
      if (!res.success) setErr(res.error ?? "Lỗi");
      else router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ghi chú admin (tùy chọn)..."
        className="h-8 w-full rounded-lg border border-slate-200 px-2.5 text-xs"
      />
      <div className="flex flex-wrap gap-1.5">
        {status === "PENDING" && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={isPending}
            onClick={() => handleAction("REVIEWING")}
          >
            Xem xét
          </Button>
        )}
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => handleAction("RESOLVED")}
        >
          Chấp nhận (Resolve)
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => handleAction("REJECTED")}
        >
          Từ chối
        </Button>
      </div>
      {err && <p className="text-[10px] text-rose-600">{err}</p>}
    </div>
  );
}

export function AdminDisputeActions({
  disputeId,
  status,
}: {
  disputeId: string;
  status: string;
}) {
  const router = useRouter();
  const [note, setNote] = useState("");
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  if (status !== "OPEN" && status !== "UNDER_REVIEW") {
    return <span className="text-xs font-semibold text-slate-500">Đã đóng</span>;
  }

  const resolve = (outcome: "RESOLVED_BUYER" | "RESOLVED_SELLER") => {
    setErr(null);
    startTransition(async () => {
      const res = await adminResolveDisputeAction(disputeId, outcome, note);
      if (!res.success) setErr(res.error ?? "Không thể xử lý dispute.");
      else router.refresh();
    });
  };

  return (
    <div className="space-y-2">
      <input
        type="text"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Ghi chú quyết định (tối thiểu 5 ký tự)..."
        className="h-8 w-full rounded-lg border border-slate-200 px-2.5 text-xs"
      />
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => resolve("RESOLVED_BUYER")}
        >
          Hoàn tiền Buyer (REFUNDED_DEMO)
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => resolve("RESOLVED_SELLER")}
        >
          Giải ngân Seller (RELEASED_DEMO)
        </Button>
      </div>
      {err && <p className="text-[10px] text-rose-600">{err}</p>}
    </div>
  );
}

export function AdminReviewVisibilityButton({
  reviewId,
  isHidden,
}: {
  reviewId: string;
  isHidden: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={isPending}
      onClick={() => {
        startTransition(async () => {
          await adminToggleReviewVisibilityAction(reviewId, !isHidden);
          router.refresh();
        });
      }}
    >
      {isHidden ? "Hiện lại" : "Ẩn đánh giá"}
    </Button>
  );
}



export function AdminLockerHardwareControls({
  compartmentId,
  compartmentCode,
}: {
  compartmentId: string;
  compartmentCode: string;
}) {
  const [deviceId, setDeviceId] = useState(`EDULOCKER-${compartmentCode}`);
  const [deviceSecret, setDeviceSecret] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const pairDevice = () => {
    setMessage(null);
    setDeviceSecret(null);
    startTransition(async () => {
      const res = await adminRegisterLockerDeviceAction(
        compartmentId,
        deviceId,
        `EduLocker ${compartmentCode}`,
      );
      if (!res.success) {
        setMessage(res.error ?? "Không thể ghép ESP32.");
        return;
      }
      setDeviceSecret(res.deviceSecret ?? null);
      setMessage(
        "Ghép thiết bị thành công. Hãy chép Device ID và Device Secret vào firmware ESP32.",
      );
    });
  };

  const sendCommand = (action: "OPEN" | "CLOSE") => {
    setMessage(null);
    startTransition(async () => {
      const res = await adminQueueLockerCommandAction(compartmentId, action);
      if (!res.success) {
        setMessage(res.error ?? "Không thể gửi lệnh.");
        return;
      }
      setMessage(
        action === "OPEN"
          ? "Đã gửi lệnh mở. ESP32 sẽ nhận ở lần poll kế tiếp."
          : "Đã gửi lệnh đóng. ESP32 sẽ nhận ở lần poll kế tiếp.",
      );
    });
  };

  return (
    <div className="mt-3 space-y-2 rounded-xl border border-dashed border-brand-blue/30 bg-white p-3">
      <p className="text-[11px] font-bold text-brand-navy">
        ESP32 vật lý • {compartmentCode}
      </p>
      <input
        type="text"
        value={deviceId}
        onChange={(e) => setDeviceId(e.target.value.toUpperCase())}
        placeholder="Device ID, ví dụ EDULOCKER-A01"
        className="h-8 w-full rounded-lg border border-slate-200 px-2.5 font-mono text-[11px]"
        disabled={isPending}
      />
      <div className="flex flex-wrap gap-1.5">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending || deviceId.trim().length < 3}
          onClick={pairDevice}
        >
          Ghép / đổi mã ESP32
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() => sendCommand("OPEN")}
        >
          Test mở tủ
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() => sendCommand("CLOSE")}
        >
          Test đóng tủ
        </Button>
      </div>

      {deviceSecret && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-2 text-[10px] text-amber-900">
          <p className="font-bold">
            Device Secret chỉ hiển thị lần này — đừng commit lên GitHub:
          </p>
          <code className="mt-1 block break-all select-all font-mono">
            {deviceSecret}
          </code>
        </div>
      )}

      {message && (
        <p className="text-[10px] leading-relaxed text-slate-600">{message}</p>
      )}
    </div>
  );
}
