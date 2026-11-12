import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AdminPagination,
  AdminProductModerateButton,
} from "@/components/admin/admin-actions-clients";
import { fetchAdminProducts } from "@/features/admin/admin-repository";
import { formatVND } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const { page: rawPage, q = "", status = "ALL" } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const { items, total } = await fetchAdminProducts({
    page,
    pageSize: 15,
    q,
    status,
  });

  const extraParams = new URLSearchParams();
  if (q) extraParams.set("q", q);
  if (status && status !== "ALL") extraParams.set("status", status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-brand-navy">
          Quản lý Sản phẩm ({total})
        </h2>
        <form action="/admin/products" method="get" className="flex flex-wrap gap-2">
          <Input
            name="q"
            defaultValue={q}
            placeholder="Tìm theo tên sản phẩm..."
            className="h-9 w-52"
          />
          <select
            name="status"
            defaultValue={status}
            aria-label="Lọc trạng thái sản phẩm"
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="RESERVED">RESERVED</option>
            <option value="SOLD">SOLD</option>
            <option value="HIDDEN">HIDDEN</option>
          </select>
          <Button type="submit" size="sm">
            Lọc
          </Button>
        </form>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[740px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Sản phẩm</th>
              <th className="px-4 py-3">Danh mục</th>
              <th className="px-4 py-3">Người bán</th>
              <th className="px-4 py-3">Giá</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Báo cáo</th>
              <th className="px-4 py-3">Điều tiết</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3 font-bold text-brand-navy">
                  <Link
                    href={`/products/${p.slug}`}
                    className="hover:text-brand-blue hover:underline"
                  >
                    {p.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-600">{p.categoryName}</td>
                <td className="px-4 py-3">
                  <Link
                    href={`/profile/${p.sellerId}`}
                    className="text-brand-blue hover:underline"
                  >
                    {p.sellerName}
                  </Link>
                </td>
                <td className="px-4 py-3 font-bold text-brand-navy">
                  {formatVND(p.price)}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={p.status === "AVAILABLE" ? "eco" : "outline"}>
                    {p.status}
                  </Badge>
                </td>
                <td className="px-4 py-3 font-bold text-rose-600">
                  {p.reportCount}
                </td>
                <td className="px-4 py-3">
                  <AdminProductModerateButton productId={p.id} status={p.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPagination
        basePath="/admin/products"
        page={page}
        total={total}
        extraParams={extraParams.toString()}
      />
    </div>
  );
}

