import React from "react";
import { Star } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  AdminPagination,
  AdminReviewVisibilityButton,
} from "@/components/admin/admin-actions-clients";
import { fetchAdminReviews } from "@/features/admin/admin-repository";
import { formatRelativeTimeVi } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  const { page: rawPage } = await searchParams;
  const page = Math.max(1, Number(rawPage) || 1);
  const { items, total } = await fetchAdminReviews(page, 15);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-extrabold text-brand-navy">
          Kiểm duyệt Đánh giá ({total})
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Quản trị viên chỉ được ẩn/hiện lại đánh giá vi phạm quy chuẩn, không
          chỉnh sửa nội dung đánh giá của sinh viên.
        </p>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
          Chưa có đánh giá nào.
        </div>
      ) : (
        <div className="space-y-3">
          {items.map((rev) => (
            <div
              key={rev.id}
              className="flex flex-wrap items-start justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {rev.rating}/5
                  </span>
                  {rev.isHidden && <Badge variant="warning">Đã ẩn</Badge>}
                  <span className="text-xs text-slate-400">
                    {formatRelativeTimeVi(rev.createdAt)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-slate-600">
                  Người đánh giá: <strong>{rev.reviewerName}</strong> → Người
                  bán: <strong>{rev.productTitle}</strong>
                </p>
                {rev.comment && (
                  <p className="mt-2 rounded-xl bg-slate-50 p-2.5 text-xs text-slate-700">
                    “{rev.comment}”
                  </p>
                )}
              </div>
              <AdminReviewVisibilityButton
                reviewId={rev.id}
                isHidden={rev.isHidden}
              />
            </div>
          ))}
        </div>
      )}

      <AdminPagination basePath="/admin/reviews" page={page} total={total} />
    </div>
  );
}

