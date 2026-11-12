import React from "react";
import { Leaf } from "lucide-react";
import { fetchAdminStatistics } from "@/features/admin/admin-repository";
import { formatVND } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminStatisticsPage() {
  const stats = await fetchAdminStatistics();
  const { overview } = stats;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-extrabold text-brand-navy">
          Thống kê Hệ thống &amp; Kinh tế tuần hoàn
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Toàn bộ chỉ số được tính trực tiếp từ cơ sở dữ liệu PostgreSQL, không
          ước lượng hay suy diễn dữ liệu môi trường chưa kiểm chứng.
        </p>
      </div>

      {/* Circular Economy Card (Strictly completed orders count) */}
      <div className="flex items-center justify-between gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-700">
            Kinh tế tuần hoàn Campus
          </p>
          <p className="mt-1 text-3xl font-extrabold text-emerald-950">
            {overview.reusedItemCount} sản phẩm
          </p>
          <p className="mt-1 text-xs text-emerald-800">
            Số sản phẩm đã được tái sử dụng (= tổng số đơn hàng ở trạng thái{" "}
            <code>COMPLETED</code>).
          </p>
        </div>
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white">
          <Leaf className="h-6 w-6" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Giá sản phẩm trung bình</p>
          <p className="mt-1 text-xl font-extrabold text-brand-navy">
            {formatVND(stats.avgProductPrice)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Tỷ lệ hoàn tất đơn (Conversion)</p>
          <p className="mt-1 text-xl font-extrabold text-brand-green">
            {stats.conversionRate}%
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Tỷ lệ hủy đơn</p>
          <p className="mt-1 text-xl font-extrabold text-amber-600">
            {stats.cancellationRate}%
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs text-slate-500">Tỷ lệ khiếu nại (Dispute)</p>
          <p className="mt-1 text-xl font-extrabold text-rose-600">
            {stats.disputeRate}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-brand-navy">
            Phân bố sản phẩm theo danh mục
          </h3>
          <div className="mt-3 space-y-2">
            {stats.categoryDistribution.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có dữ liệu sản phẩm.</p>
            ) : (
              stats.categoryDistribution.map((c) => (
                <div
                  key={c.name}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-slate-700">{c.name}</span>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-brand-navy">
                    {c.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="text-sm font-extrabold text-brand-navy">
            Phân bố trạng thái đơn hàng
          </h3>
          <div className="mt-3 space-y-2">
            {stats.orderStatusDistribution.length === 0 ? (
              <p className="text-xs text-slate-400">Chưa có dữ liệu đơn hàng.</p>
            ) : (
              stats.orderStatusDistribution.map((o) => (
                <div
                  key={o.status}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="font-mono font-semibold text-slate-700">
                    {o.status}
                  </span>
                  <span className="rounded-lg bg-slate-100 px-2 py-0.5 font-bold text-brand-navy">
                    {o.count}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

