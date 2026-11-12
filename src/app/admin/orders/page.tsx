import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AdminPagination } from "@/components/admin/admin-actions-clients";
import { fetchAdminOrders } from "@/features/admin/admin-repository";
import { formatRelativeTimeVi, formatVND } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: rawPage, status = "ALL" } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const { items, total } = await fetchAdminOrders({
    page,
    pageSize: 15,
    status,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-brand-navy">
          Quản lý Đơn hàng ({total})
        </h2>
        <form action="/admin/orders" method="get" className="flex gap-2">
          <select
            name="status"
            defaultValue={status}
            aria-label="Lọc trạng thái đơn hàng"
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">PENDING</option>
            <option value="AWAITING_DROPOFF">AWAITING_DROPOFF</option>
            <option value="READY_FOR_PICKUP">READY_FOR_PICKUP</option>
            <option value="PICKED_UP">PICKED_UP</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELLED">CANCELLED</option>
            <option value="DISPUTED">DISPUTED</option>
          </select>
          <Button type="submit" size="sm">
            Lọc
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[780px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Mã đơn</th>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Mua / Bán</th>
              <th className="px-4 py-3">Giá trị</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Payment Sim</th>
              <th className="px-4 py-3">Ngăn tủ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((o) => (
              <tr key={o.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-mono font-bold text-brand-blue">
                  <Link href={`/orders/${o.id}`} className="hover:underline">
                    #{o.id.slice(0, 8).toUpperCase()}
                  </Link>
                  <p className="font-sans text-[10px] font-normal text-slate-400">
                    {formatRelativeTimeVi(o.createdAt)}
                  </p>
                </td>
                <td className="px-4 py-3 font-semibold text-brand-navy">
                  {o.productTitle}
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <p>Mua: {o.buyerName}</p>
                  <p className="text-[11px] text-slate-400">
                    Bán: {o.sellerName}
                  </p>
                </td>
                <td className="px-4 py-3 font-bold text-brand-navy">
                  {formatVND(o.totalAmount)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline">{o.status}</Badge>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="secondary">{o.paymentStatus}</Badge>
                </td>
                <td className="px-4 py-3 font-mono font-semibold text-slate-700">
                  {o.compartmentCode ?? "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPagination
        basePath="/admin/orders"
        page={page}
        total={total}
        extraParams={status !== "ALL" ? `status=${status}` : ""}
      />
    </div>
  );
}

