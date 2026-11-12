import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  AdminDisputeActions,
  AdminPagination,
} from "@/components/admin/admin-actions-clients";
import { fetchAdminDisputes } from "@/features/admin/admin-repository";
import { formatRelativeTimeVi, formatVND } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDisputesPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const { items, total } = await fetchAdminDisputes(page, 15);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-brand-navy">
          Giải quyết Khiếu nại (Disputes – {total})
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Khoản tiền đang ở trạng thái <code>HELD_DEMO</code> (Payment
          Simulator – không phải giao dịch tài chính thật). Quản trị viên có thể
          phân xử hoàn tiền cho Người mua (<code>REFUNDED_DEMO</code>) hoặc giải
          ngân cho Người bán (<code>RELEASED_DEMO</code>).
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Chưa có khiếu nại nào cần xử lý.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((d) => (
            <div
              key={d.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        d.status === "OPEN" || d.status === "UNDER_REVIEW"
                          ? "warning"
                          : "eco"
                      }
                    >
                      {d.status}
                    </Badge>
                    {d.paymentStatus && (
                      <Badge variant="secondary">
                        Payment Sim: {d.paymentStatus}
                      </Badge>
                    )}
                    <span className="text-xs text-slate-400">
                      {formatRelativeTimeVi(d.createdAt)}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-extrabold text-brand-navy">
                    {d.productTitle ?? "Đơn hàng"} —{" "}
                    {d.totalAmount ? formatVND(d.totalAmount) : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Đơn{" "}
                    <Link
                      href={`/orders/${d.orderId}`}
                      className="font-mono font-bold text-brand-blue hover:underline"
                    >
                      #{d.orderId.slice(0, 8).toUpperCase()}
                    </Link>{" "}
                    • Mua: <strong>{d.buyerName}</strong> • Bán:{" "}
                    <strong>{d.sellerName}</strong>
                  </p>

                  <p className="mt-2 rounded-xl border border-rose-100 bg-rose-50/70 p-2.5 text-xs text-rose-900">
                    <strong>Lý do khiếu nại:</strong> {d.reason}
                  </p>
                  {d.resolution && (
                    <p className="mt-2 text-xs font-semibold text-emerald-800">
                      Kết quả xử lý: {d.resolution}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-80">
                  <AdminDisputeActions disputeId={d.id} status={d.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminPagination basePath="/admin/disputes" page={page} total={total} />
    </div>
  );
}

