import React from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  AdminPagination,
  AdminUserStatusButton,
} from "@/components/admin/admin-actions-clients";
import { fetchAdminUsers } from "@/features/admin/admin-repository";
import { formatRelativeTimeVi } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const { items, total } = await fetchAdminUsers(page, 15);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-extrabold text-brand-navy">
        Quản lý Người dùng ({total})
      </h2>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full min-w-[720px] text-left text-xs">
          <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase text-slate-500">
            <tr>
              <th className="px-4 py-3">Sinh viên</th>
              <th className="px-4 py-3">Trường / Ngành</th>
              <th className="px-4 py-3">Uy tín</th>
              <th className="px-4 py-3">Trạng thái</th>
              <th className="px-4 py-3">Tham gia</th>
              <th className="px-4 py-3">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {items.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/70">
                <td className="px-4 py-3">
                  <Link
                    href={`/profile/${u.id}`}
                    className="font-bold text-brand-navy hover:text-brand-blue hover:underline"
                  >
                    {u.fullName}
                  </Link>
                  <p className="text-[11px] text-slate-400">{u.cohort}</p>
                </td>
                <td className="px-4 py-3 text-slate-600">
                  <p className="font-semibold">{u.universityName}</p>
                  <p className="text-[11px] text-slate-400">{u.majorName}</p>
                </td>
                <td className="px-4 py-3">
                  <p className="font-bold text-amber-600">
                    {u.ratingAvg.toFixed(1)}★ ({u.ratingCount})
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {u.completedTransactions} giao dịch
                  </p>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant={u.accountStatus === "ACTIVE" ? "eco" : "warning"}
                  >
                    {u.accountStatus}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatRelativeTimeVi(u.createdAt)}
                </td>
                <td className="px-4 py-3">
                  <AdminUserStatusButton
                    userId={u.id}
                    currentStatus={u.accountStatus}
                    role={u.role}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AdminPagination basePath="/admin/users" page={page} total={total} />
    </div>
  );
}

