import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  CATEGORIES,
  MAJORS,
  UNIVERSITIES,
} from "@/features/marketplace/mock-data";
import type {
  AdminOverviewStats,
  DisputeItem,
  LockerLocation,
  ReportItem,
  ReviewItem,
} from "@/types";
import { fetchLiveLockerLocations } from "@/features/orders/order-repository";

function getUniName(id?: string | null): string {
  return UNIVERSITIES.find((u) => u.id === id)?.shortName ?? "ĐH Cần Thơ";
}

function getMajorName(id?: string | null): string {
  return MAJORS.find((m) => m.id === id)?.name ?? "Chuyên ngành";
}

function getCategoryName(id?: string | null): string {
  return CATEGORIES.find((c) => c.id === id)?.name ?? "Khác";
}

export async function requireActiveAdmin(): Promise<{
  userId: string;
  fullName: string;
} | null> {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, account_status")
    .eq("id", user.id)
    .maybeSingle();

  if (
    !profile ||
    profile.role !== "admin" ||
    profile.account_status !== "ACTIVE"
  ) {
    return null;
  }

  return { userId: profile.id, fullName: profile.full_name };
}

export async function fetchAdminOverviewStats(): Promise<AdminOverviewStats> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return {
      totalUsers: 0,
      newUsers7d: 0,
      totalProducts: 0,
      availableProducts: 0,
      soldProducts: 0,
      totalOrders: 0,
      completedOrders: 0,
      cancelledOrders: 0,
      disputedOrders: 0,
      totalDemoVolume: 0,
      lockerTotalCompartments: 0,
      lockerUsedCompartments: 0,
      pendingReports: 0,
      openDisputes: 0,
      reusedItemCount: 0,
    };
  }

  const sevenDaysAgo = new Date(
    Date.now() - 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    { count: totalUsers },
    { count: newUsers7d },
    { count: totalProducts },
    { count: availableProducts },
    { count: soldProducts },
    { count: totalOrders },
    { count: completedOrders },
    { count: cancelledOrders },
    { count: disputedOrders },
    { data: completedAmounts },
    { data: compartments },
    { count: pendingReports },
    { count: openDisputes },
  ] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .gte("created_at", sevenDaysAgo),
    supabase.from("products").select("id", { count: "exact", head: true }),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "AVAILABLE"),
    supabase
      .from("products")
      .select("id", { count: "exact", head: true })
      .eq("status", "SOLD"),
    supabase.from("orders").select("id", { count: "exact", head: true }),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "COMPLETED"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "CANCELLED"),
    supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("status", "DISPUTED"),
    supabase
      .from("orders")
      .select("total_amount")
      .eq("status", "COMPLETED"),
    supabase.from("locker_compartments").select("status"),
    supabase
      .from("reports")
      .select("id", { count: "exact", head: true })
      .in("status", ["PENDING", "REVIEWING"]),
    supabase
      .from("disputes")
      .select("id", { count: "exact", head: true })
      .in("status", ["OPEN", "UNDER_REVIEW"]),
  ]);

  const totalDemoVolume = (completedAmounts ?? []).reduce(
    (sum, r) => sum + (r.total_amount ?? 0),
    0,
  );
  const lockerTotalCompartments = (compartments ?? []).length;
  const lockerUsedCompartments = (compartments ?? []).filter(
    (c) => c.status === "RESERVED" || c.status === "OCCUPIED",
  ).length;

  return {
    totalUsers: totalUsers ?? 0,
    newUsers7d: newUsers7d ?? 0,
    totalProducts: totalProducts ?? 0,
    availableProducts: availableProducts ?? 0,
    soldProducts: soldProducts ?? 0,
    totalOrders: totalOrders ?? 0,
    completedOrders: completedOrders ?? 0,
    cancelledOrders: cancelledOrders ?? 0,
    disputedOrders: disputedOrders ?? 0,
    totalDemoVolume,
    lockerTotalCompartments,
    lockerUsedCompartments,
    pendingReports: pendingReports ?? 0,
    openDisputes: openDisputes ?? 0,
    reusedItemCount: completedOrders ?? 0,
  };
}

export async function fetchAdminUsers(page = 1, pageSize = 15) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0 };

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from("profiles")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  return {
    items: (data ?? []).map((u) => ({
      id: u.id,
      fullName: u.full_name,
      universityName: getUniName(u.university_id),
      majorName: getMajorName(u.major_id),
      cohort: u.cohort,
      ratingAvg: Number(u.rating_avg),
      ratingCount: u.rating_count,
      completedTransactions: u.completed_transactions,
      ecoPoints: u.eco_points,
      role: u.role,
      accountStatus: u.account_status,
      emailVerified: u.email_verified,
      createdAt: u.created_at,
    })),
    total: count ?? 0,
  };
}

export async function fetchAdminProducts(params: {
  page?: number;
  pageSize?: number;
  q?: string;
  status?: string;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0 };

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 15;
  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  let query = supabase
    .from("products")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.q?.trim()) {
    query = query.ilike("title", `%${params.q.trim()}%`);
  }
  if (
    params.status &&
    ["AVAILABLE", "RESERVED", "SOLD", "HIDDEN", "DRAFT"].includes(params.status)
  ) {
    query = query.eq(
      "status",
      params.status as "AVAILABLE" | "RESERVED" | "SOLD" | "HIDDEN" | "DRAFT",
    );
  }

  const { data, count } = await query.range(from, to);
  const rows = data ?? [];
  if (rows.length === 0) return { items: [], total: count ?? 0 };

  const sellerIds = Array.from(new Set(rows.map((p) => p.seller_id)));
  const productIds = rows.map((p) => p.id);

  const [{ data: sellers }, { data: reports }] = await Promise.all([
    supabase.from("profiles").select("id, full_name").in("id", sellerIds),
    supabase
      .from("reports")
      .select("target_id")
      .eq("target_type", "PRODUCT")
      .in("target_id", productIds),
  ]);

  const sellerMap = new Map((sellers ?? []).map((s) => [s.id, s.full_name]));
  const reportCountMap = new Map<string, number>();
  for (const r of reports ?? []) {
    reportCountMap.set(r.target_id, (reportCountMap.get(r.target_id) ?? 0) + 1);
  }

  return {
    items: rows.map((p) => ({
      id: p.id,
      slug: p.slug,
      title: p.title,
      price: p.price,
      status: p.status,
      categoryName: getCategoryName(p.category_id),
      sellerId: p.seller_id,
      sellerName: sellerMap.get(p.seller_id) ?? "Sinh viên",
      reportCount: reportCountMap.get(p.id) ?? 0,
      moderationNote: p.moderation_note,
      createdAt: p.created_at,
    })),
    total: count ?? 0,
  };
}

export async function fetchAdminOrders(params: {
  page?: number;
  pageSize?: number;
  status?: string;
}) {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0 };

  const page = params.page ?? 1;
  const pageSize = params.pageSize ?? 15;
  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  let query = supabase
    .from("orders")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (params.status && params.status !== "ALL") {
    query = query.eq("status", params.status as never);
  }

  const { data, count } = await query.range(from, to);
  const rows = data ?? [];
  if (rows.length === 0) return { items: [], total: count ?? 0 };

  const userIds = Array.from(
    new Set(rows.flatMap((o) => [o.buyer_id, o.seller_id])),
  );
  const productIds = Array.from(new Set(rows.map((o) => o.product_id)));
  const orderIds = rows.map((o) => o.id);

  const [{ data: users }, { data: prods }, { data: pays }, { data: comps }] =
    await Promise.all([
      supabase.from("profiles").select("id, full_name").in("id", userIds),
      supabase.from("products").select("id, title").in("id", productIds),
      supabase
        .from("payment_records")
        .select("order_id, status")
        .in("order_id", orderIds),
      supabase.from("locker_compartments").select("id, code"),
    ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u.full_name]));
  const prodMap = new Map((prods ?? []).map((p) => [p.id, p.title]));
  const payMap = new Map((pays ?? []).map((p) => [p.order_id, p.status]));
  const compMap = new Map((comps ?? []).map((c) => [c.id, c.code]));

  return {
    items: rows.map((o) => ({
      id: o.id,
      status: o.status,
      totalAmount: o.total_amount,
      buyerName: userMap.get(o.buyer_id) ?? "Người mua",
      sellerName: userMap.get(o.seller_id) ?? "Người bán",
      productTitle: prodMap.get(o.product_id) ?? "Sản phẩm",
      paymentStatus: payMap.get(o.id) ?? "HELD_DEMO",
      compartmentCode: o.locker_compartment_id
        ? (compMap.get(o.locker_compartment_id) ?? null)
        : null,
      createdAt: o.created_at,
    })),
    total: count ?? 0,
  };
}

export async function fetchAdminLockers(): Promise<{
  locations: LockerLocation[];
  activeReservations: Array<{
    id: string;
    orderId: string;
    compartmentId: string;
    status: string;
    reservedAt: string;
  }>;
}> {
  const supabase = await createSupabaseServerClient();
  const locations = await fetchLiveLockerLocations();
  if (!supabase) return { locations, activeReservations: [] };

  const { data: reservations } = await supabase
    .from("locker_reservations")
    .select("*")
    .in("status", ["ACTIVE", "USED"])
    .order("reserved_at", { ascending: false })
    .limit(50);

  return {
    locations,
    activeReservations: (reservations ?? []).map((r) => ({
      id: r.id,
      orderId: r.order_id,
      compartmentId: r.compartment_id,
      status: r.status,
      reservedAt: r.reserved_at,
    })),
  };
}

export async function fetchAdminReports(
  page = 1,
  pageSize = 15,
  statusFilter = "ALL",
): Promise<{ items: ReportItem[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0 };

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  let query = supabase
    .from("reports")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (
    statusFilter !== "ALL" &&
    ["PENDING", "REVIEWING", "RESOLVED", "REJECTED"].includes(statusFilter)
  ) {
    query = query.eq(
      "status",
      statusFilter as "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED",
    );
  }

  const { data, count } = await query.range(from, to);
  const rows = data ?? [];
  if (rows.length === 0) return { items: [], total: count ?? 0 };

  const reporterIds = Array.from(new Set(rows.map((r) => r.reporter_id)));
  const { data: reporters } = await supabase
    .from("profiles")
    .select("id, full_name")
    .in("id", reporterIds);
  const repMap = new Map((reporters ?? []).map((p) => [p.id, p.full_name]));

  return {
    items: rows.map((r) => ({
      id: r.id,
      reporterId: r.reporter_id,
      reporterName: repMap.get(r.reporter_id) ?? "Sinh viên",
      targetType: r.target_type,
      targetId: r.target_id,
      reason: r.reason,
      description: r.description,
      status: r.status,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at,
      adminNote: r.admin_note,
      createdAt: r.created_at,
    })),
    total: count ?? 0,
  };
}

export async function fetchAdminDisputes(
  page = 1,
  pageSize = 15,
): Promise<{ items: DisputeItem[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0 };

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from("disputes")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const rows = data ?? [];
  if (rows.length === 0) return { items: [], total: count ?? 0 };

  const orderIds = rows.map((d) => d.order_id);
  const [{ data: orders }, { data: payments }] = await Promise.all([
    supabase.from("orders").select("*").in("id", orderIds),
    supabase.from("payment_records").select("*").in("order_id", orderIds),
  ]);

  const orderMap = new Map((orders ?? []).map((o) => [o.id, o]));
  const payMap = new Map((payments ?? []).map((p) => [p.order_id, p.status]));

  const userIds = Array.from(
    new Set((orders ?? []).flatMap((o) => [o.buyer_id, o.seller_id])),
  );
  const productIds = Array.from(new Set((orders ?? []).map((o) => o.product_id)));

  const [{ data: users }, { data: prods }] = await Promise.all([
    userIds.length > 0
      ? supabase.from("profiles").select("id, full_name").in("id", userIds)
      : Promise.resolve({ data: [] }),
    productIds.length > 0
      ? supabase.from("products").select("id, title").in("id", productIds)
      : Promise.resolve({ data: [] }),
  ]);

  const userMap = new Map((users ?? []).map((u) => [u.id, u.full_name]));
  const prodMap = new Map((prods ?? []).map((p) => [p.id, p.title]));

  return {
    items: rows.map((d) => {
      const ord = orderMap.get(d.order_id);
      return {
        id: d.id,
        orderId: d.order_id,
        openedBy: d.opened_by,
        reason: d.reason,
        description: d.description,
        status: d.status,
        resolution: d.resolution,
        resolvedBy: d.resolved_by,
        createdAt: d.created_at,
        resolvedAt: d.resolved_at,
        buyerName: ord ? userMap.get(ord.buyer_id) : undefined,
        sellerName: ord ? userMap.get(ord.seller_id) : undefined,
        productTitle: ord ? prodMap.get(ord.product_id) : undefined,
        totalAmount: ord?.total_amount,
        paymentStatus: payMap.get(d.order_id),
      };
    }),
    total: count ?? 0,
  };
}

export async function fetchAdminReviews(
  page = 1,
  pageSize = 15,
): Promise<{ items: ReviewItem[]; total: number }> {
  const supabase = await createSupabaseServerClient();
  if (!supabase) return { items: [], total: 0 };

  const from = Math.max(0, (page - 1) * pageSize);
  const to = from + pageSize - 1;

  const { data, count } = await supabase
    .from("reviews")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, to);

  const rows = data ?? [];
  if (rows.length === 0) return { items: [], total: count ?? 0 };

  const userIds = Array.from(
    new Set(rows.flatMap((r) => [r.reviewer_id, r.reviewee_id])),
  );
  const { data: users } = await supabase
    .from("profiles")
    .select("id, full_name, cohort")
    .in("id", userIds);
  const userMap = new Map((users ?? []).map((u) => [u.id, u]));

  return {
    items: rows.map((r) => ({
      id: r.id,
      orderId: r.order_id,
      reviewerId: r.reviewer_id,
      revieweeId: r.reviewee_id,
      rating: r.rating,
      descriptionAccuracy: r.description_accuracy,
      productConditionRating: r.product_condition_rating,
      transactionRating: r.transaction_rating,
      comment: r.comment,
      isHidden: r.is_hidden,
      createdAt: r.created_at,
      reviewerName: userMap.get(r.reviewer_id)?.full_name ?? "Người mua",
      reviewerCohort: userMap.get(r.reviewer_id)?.cohort ?? "K50",
      productTitle: userMap.get(r.reviewee_id)?.full_name ?? "Người bán",
    })),
    total: count ?? 0,
  };
}

export async function fetchAdminStatistics() {
  const supabase = await createSupabaseServerClient();
  const overview = await fetchAdminOverviewStats();
  if (!supabase) {
    return {
      overview,
      avgProductPrice: 0,
      conversionRate: 0,
      cancellationRate: 0,
      disputeRate: 0,
      categoryDistribution: [] as Array<{ name: string; count: number }>,
      orderStatusDistribution: [] as Array<{ status: string; count: number }>,
    };
  }

  const [{ data: products }, { data: orders }] = await Promise.all([
    supabase.from("products").select("price, category_id, status"),
    supabase.from("orders").select("status"),
  ]);

  const prodRows = products ?? [];
  const orderRows = orders ?? [];

  const avgProductPrice =
    prodRows.length > 0
      ? Math.round(
          prodRows.reduce((s, p) => s + (p.price ?? 0), 0) / prodRows.length,
        )
      : 0;

  const totalOrd = orderRows.length;
  const completedOrd = orderRows.filter((o) => o.status === "COMPLETED").length;
  const cancelledOrd = orderRows.filter((o) => o.status === "CANCELLED").length;
  const disputedOrd = orderRows.filter((o) => o.status === "DISPUTED").length;

  const catCounts = new Map<string, number>();
  for (const p of prodRows) {
    const label = getCategoryName(p.category_id);
    catCounts.set(label, (catCounts.get(label) ?? 0) + 1);
  }

  const statusCounts = new Map<string, number>();
  for (const o of orderRows) {
    statusCounts.set(o.status, (statusCounts.get(o.status) ?? 0) + 1);
  }

  return {
    overview,
    avgProductPrice,
    conversionRate:
      totalOrd > 0 ? Math.round((completedOrd / totalOrd) * 1000) / 10 : 0,
    cancellationRate:
      totalOrd > 0 ? Math.round((cancelledOrd / totalOrd) * 1000) / 10 : 0,
    disputeRate:
      totalOrd > 0 ? Math.round((disputedOrd / totalOrd) * 1000) / 10 : 0,
    categoryDistribution: Array.from(catCounts.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count),
    orderStatusDistribution: Array.from(statusCounts.entries()).map(
      ([status, count]) => ({ status, count }),
    ),
  };
}

