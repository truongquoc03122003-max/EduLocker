import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  Award,
  CheckCircle2,
  GraduationCap,
  Leaf,
  Package,
  Star,
} from "lucide-react";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { ProductCard } from "@/components/products/product-card";
import { ReportButtonModal } from "@/components/reports/report-button-modal";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { MAJORS, UNIVERSITIES } from "@/features/marketplace/mock-data";
import { fetchMarketplaceCatalog } from "@/features/marketplace/product-repository";
import { formatRelativeTimeVi } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Hồ Sơ Người Bán – EduLocker",
};

export const dynamic = "force-dynamic";

export default async function PublicSellerProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

  if (!isUuid || !isSupabaseConfigured()) {
    notFound();
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) notFound();

  const [{ data: profile }, { data: reviewsData }, { realProducts }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select(
          "id, full_name, avatar_url, university_id, major_id, cohort, bio, email_verified, campus_verified, rating_avg, rating_count, completed_transactions, eco_points, created_at",
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("reviews")
        .select("*")
        .eq("reviewee_id", id)
        .eq("is_hidden", false)
        .order("created_at", { ascending: false })
        .limit(10),
      fetchMarketplaceCatalog(),
    ]);

  if (!profile) {
    notFound();
  }

  const uniName =
    UNIVERSITIES.find((u) => u.id === profile.university_id)?.name ??
    "Đại học Cần Thơ";
  const majorName =
    MAJORS.find((m) => m.id === profile.major_id)?.name ?? "Chuyên ngành";

  const activeProducts = realProducts.filter(
    (p) => p.sellerId === profile.id && p.status === "AVAILABLE",
  );

  const reviewerIds = Array.from(
    new Set((reviewsData ?? []).map((r) => r.reviewer_id)),
  );
  const { data: reviewers } =
    reviewerIds.length > 0
      ? await supabase
          .from("profiles")
          .select("id, full_name, cohort")
          .in("id", reviewerIds)
      : { data: [] };
  const reviewerMap = new Map((reviewers ?? []).map((r) => [r.id, r]));

  const ratingAvg = Number(profile.rating_avg ?? 5.0);
  const ratingCount = Number(profile.rating_count ?? 0);
  const completedTx = Number(profile.completed_transactions ?? 0);

  return (
    <div className="container py-4 pb-14">
      <Breadcrumbs
        items={[
          { label: "Khám phá", href: "/products" },
          { label: profile.full_name },
        ]}
      />

      {/* Profile Header Card (NEVER displays private email) */}
      <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-brand-navy text-xl font-extrabold text-white">
              {profile.full_name.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-brand-navy sm:text-2xl">
                {profile.full_name}
              </h1>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-600">
                <GraduationCap className="h-4 w-4 text-brand-blue" />
                <span>
                  {uniName} • Ngành {majorName} ({profile.cohort})
                </span>
              </p>

              {/* Trust Badges: never claim "Được CTU xác thực" when campus_verified = false */}
              <div className="mt-3 flex flex-wrap gap-2">
                {profile.email_verified && (
                  <Badge variant="eco" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Email đã xác minh
                  </Badge>
                )}
                {completedTx > 0 && (
                  <Badge variant="default" className="gap-1">
                    <Package className="h-3 w-3" />
                    {completedTx} giao dịch thành công
                  </Badge>
                )}
                {ratingCount > 0 && ratingAvg >= 4.5 && (
                  <Badge variant="warning" className="gap-1">
                    <Award className="h-3 w-3" />
                    Đánh giá cao ({ratingAvg.toFixed(1)}★)
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <ReportButtonModal
            targetType="USER"
            targetId={profile.id}
            buttonLabel="Báo cáo người dùng"
          />
        </div>

        {profile.bio && (
          <p className="mt-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            “{profile.bio}”
          </p>
        )}

        <div className="mt-5 grid grid-cols-3 gap-3 border-t border-slate-100 pt-4 text-center sm:max-w-lg">
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-brand-navy">
              <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
              {ratingAvg.toFixed(1)}
            </p>
            <p className="text-[11px] text-slate-500">{ratingCount} đánh giá</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="text-lg font-extrabold text-brand-navy">
              {completedTx}
            </p>
            <p className="text-[11px] text-slate-500">Giao dịch thành công</p>
          </div>
          <div className="rounded-xl bg-slate-50 p-3">
            <p className="flex items-center justify-center gap-1 text-lg font-extrabold text-brand-green">
              <Leaf className="h-4 w-4" />
              {profile.eco_points}
            </p>
            <p className="text-[11px] text-slate-500">Eco Points</p>
          </div>
        </div>
      </div>

      {/* Active Products */}
      <section className="mt-8">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-brand-navy">
            Sản phẩm đang đăng bán ({activeProducts.length})
          </h2>
          <Link
            href="/products"
            className="text-xs font-bold text-brand-blue hover:underline"
          >
            Xem tất cả trên Marketplace →
          </Link>
        </div>

        {activeProducts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Người bán hiện chưa có sản phẩm nào đang mở bán.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {activeProducts.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Reviews */}
      <section className="mt-10">
        <h2 className="mb-4 text-lg font-extrabold text-brand-navy">
          Đánh giá gần đây ({ratingCount})
        </h2>

        {(reviewsData ?? []).length === 0 ? (
          <p className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Chưa có đánh giá nào từ các giao dịch hoàn tất.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {(reviewsData ?? []).map((rev) => {
              const reviewer = reviewerMap.get(rev.reviewer_id);
              return (
                <div
                  key={rev.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-brand-navy">
                        {reviewer?.full_name ?? "Sinh viên mua hàng"}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {reviewer?.cohort ?? "K50"} •{" "}
                        {formatRelativeTimeVi(rev.created_at)}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                      <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                      {rev.rating}/5
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                    <span>Đúng mô tả: {rev.description_accuracy}/5</span>
                    <span>Tình trạng: {rev.product_condition_rating}/5</span>
                    <span>Giao dịch: {rev.transaction_rating}/5</span>
                  </div>
                  {rev.comment && (
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-700">
                      {rev.comment}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
