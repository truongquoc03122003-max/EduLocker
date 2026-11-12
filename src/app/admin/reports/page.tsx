import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AdminPagination,
  AdminReportActions,
} from "@/components/admin/admin-actions-clients";
import { fetchAdminReports } from "@/features/admin/admin-repository";
import { formatRelativeTimeVi } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const { page: rawPage, status = "ALL" } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const { items, total } = await fetchAdminReports(page, 15, status);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-extrabold text-brand-navy">
          Quản lý Báo cáo vi phạm ({total})
        </h2>
        <form action="/admin/reports" method="get" className="flex gap-2">
          <select
            name="status"
            defaultValue={status}
            aria-label="Lọc trạng thái báo cáo"
            className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING">PENDING</option>
            <option value="REVIEWING">REVIEWING</option>
            <option value="RESOLVED">RESOLVED</option>
            <option value="REJECTED">REJECTED</option>
          </select>
          <Button type="submit" size="sm">
            Lọc
          </Button>
        </form>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Không có báo cáo đang chờ xử lý.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((rep) => (
            <div
              key={rep.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{rep.targetType}</Badge>
                    <Badge
                      variant={
                        rep.status === "PENDING"
                          ? "warning"
                          : rep.status === "RESOLVED"
                            ? "eco"
                            : "secondary"
                      }
                    >
                      {rep.status}
                    </Badge>
                    <span className="text-xs text-slate-400">
                      {formatRelativeTimeVi(rep.createdAt)}
                    </span>
                  </div>
                  <p className="mt-2 text-sm font-extrabold text-brand-navy">
                    Lý do: {rep.reason}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Người báo cáo: <strong>{rep.reporterName}</strong> • Target
                    ID: <code className="font-mono">{rep.targetId}</code>
                  </p>
                  {rep.description && (
                    <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700">
                      {rep.description}
                    </p>
                  )}
                  {rep.adminNote && (
                    <p className="mt-2 text-xs font-semibold text-brand-blue">
                      Ghi chú xử lý: {rep.adminNote}
                    </p>
                  )}
                </div>

                <div className="w-full sm:w-64">
                  <AdminReportActions reportId={rep.id} status={rep.status} />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <AdminPagination
        basePath="/admin/reports"
        page={page}
        total={total}
        extraParams={status !== "ALL" ? `status=${status}` : ""}
      />
    </div>
  );
}

