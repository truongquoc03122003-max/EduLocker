import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import {
  CATEGORIES,
  LOCKER_LOCATIONS,
  UNIVERSITIES,
} from "@/features/marketplace/mock-data";
import { getLockerLocations } from "@/features/marketplace/product-service";
import { getConditionMeta } from "@/lib/utils";
import { isDemoOtpDeliveryEnabled } from "@/lib/demo-mode";
import { shouldAutoExpireOrder } from "./order-state-machine";
import type {
  DemoOtpInfo,
  LockerCompartment,
  LockerLocation,
  OrderDetailData,
  OrderEventItem,
  OrderEventType,
  OrderStatus,
  OrderSummary,
  PaymentSimulatorRecord,
  PaymentSimulatorStatus,
  ProductStatus,
} from "@/types";
import type { Database } from "@/lib/supabase/database.types";

type OrderRow = Database["public"]["Tables"]["orders"]["Row"];
type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type ProfileRow = Database["public"]["Tables"]["profiles"]["Row"];
type LockerLocationRow = Database["public"]["Tables"]["locker_locations"]["Row"];
type LockerCompartmentRow =
  Database["public"]["Tables"]["locker_compartments"]["Row"];
type PaymentRecordRow = Database["public"]["Tables"]["payment_records"]["Row"];

export { isDemoOtpDeliveryEnabled };

function getUniversityShortName(universityId?: string | null): string {
  const found = UNIVERSITIES.find((u) => u.id === universityId);
  return found?.shortName ?? "ĐH Cần Thơ (CTU)";
}

function getCategoryName(categoryId?: string | null): string {
  const found = CATEGORIES.find(
    (c) => c.id === categoryId || c.slug === categoryId,
  );
  return found?.name ?? "Giáo trình";
}

function mapRowToOrderSummary(params: {
  order: OrderRow;
  product: ProductRow | null;
  thumbnailUrl: string;
  buyer: ProfileRow | null;
  seller: ProfileRow | null;
  lockerLocation: LockerLocationRow | null;
  lockerCompartment: LockerCompartmentRow | null;
  payment: PaymentRecordRow | null;
}): OrderSummary {
  const {
    order,
    product,
    thumbnailUrl,
    buyer,
    seller,
    lockerLocation,
    lockerCompartment,
    payment,
  } = params;

  const fallbackLocker = LOCKER_LOCATIONS.find(
    (l) => l.id === order.locker_location_id,
  );

  const conditionMeta = getConditionMeta(product?.condition ?? "GOOD");

  let paymentStatus: PaymentSimulatorStatus = "HELD_DEMO";
  if (payment?.status) {
    paymentStatus = payment.status;
  } else if (order.status === "COMPLETED") {
    paymentStatus = "RELEASED_DEMO";
  } else if (
    order.status === "CANCELLED" ||
    order.status === "EXPIRED" ||
    order.status === "RETURNED"
  ) {
    paymentStatus = "REFUNDED_DEMO";
  }

  return {
    id: order.id,
    buyerId: order.buyer_id,
    sellerId: order.seller_id,
    productId: order.product_id,
    status: order.status as OrderStatus,
    productPrice: order.product_price,
    totalAmount: order.total_amount,
    disputeReason: order.dispute_reason,
    lockerLocationId: order.locker_location_id,
    lockerLocationName:
      lockerLocation?.name ?? fallbackLocker?.name ?? "Trạm Smart Locker Demo",
    lockerLocationCode: lockerLocation?.code ?? fallbackLocker?.code ?? null,
    lockerCompartmentId: order.locker_compartment_id,
    lockerCompartmentCode: lockerCompartment?.code ?? null,
    lockerCompartmentSize: lockerCompartment?.size ?? null,
    lockerCompartmentStatus: lockerCompartment?.status ?? null,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
    sellerConfirmedAt: order.seller_confirmed_at,
    droppedOffAt: order.dropped_off_at,
    readyForPickupAt: order.ready_for_pickup_at,
    pickedUpAt: order.picked_up_at,
    completedAt: order.completed_at,
    cancelledAt: order.cancelled_at,
    expiresAt: order.expires_at,
    product: {
      id: product?.id ?? order.product_id,
      slug: product?.slug ?? order.product_id,
      title: product?.title ?? "Sản phẩm sinh viên EduLocker",
      thumbnailUrl: thumbnailUrl || "/logo-edulocker.png",
      conditionLabel: conditionMeta.label,
      categoryName: getCategoryName(product?.category_id),
      universityName: getUniversityShortName(product?.university_id),
      status: (product?.status ?? "RESERVED") as ProductStatus,
    },
    buyer: {
      id: order.buyer_id,
      fullName: buyer?.full_name ?? "Sinh viên mua hàng",
      cohort: buyer?.cohort ?? "K50",
      universityName: getUniversityShortName(buyer?.university_id),
    },
    seller: {
      id: order.seller_id,
      fullName: seller?.full_name ?? "Sinh viên bán hàng",
      cohort: seller?.cohort ?? "K49",
      universityName: getUniversityShortName(seller?.university_id),
    },
    paymentStatus,
  };
}

/**
 * Truy vấn danh sách đơn hàng Mua và Bán của người dùng hiện tại (`/orders`).
 * Tự động kiểm tra và xử lý các đơn hàng đã quá hạn (`expires_at <= now()`).
 */
export async function fetchUserOrders(userId: string): Promise<{
  buyerOrders: OrderSummary[];
  sellerOrders: OrderSummary[];
}> {
  if (!isSupabaseConfigured()) {
    return { buyerOrders: [], sellerOrders: [] };
  }

  const supabase = await createSupabaseServerClient();
  if (!supabase) {
    return { buyerOrders: [], sellerOrders: [] };
  }

  const { data: initialOrders, error } = await supabase
    .from("orders")
    .select("*")
    .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error || !initialOrders || initialOrders.length === 0) {
    return { buyerOrders: [], sellerOrders: [] };
  }

  // Trigger expiration check only for pre-drop-off orders past their own order deadline
  // (OTP expiry never expires an order that already sits in a locker)
  const nowMs = Date.now();
  const expiredCandidates = initialOrders.filter((o) =>
    shouldAutoExpireOrder({
      status: o.status as OrderStatus,
      orderExpiresAt: o.expires_at,
      nowMs,
    }),
  );

  if (expiredCandidates.length > 0) {
    await Promise.all(
      expiredCandidates.map((o) =>
        supabase.rpc("rpc_expire_order_if_needed", { p_order_id: o.id }),
      ),
    );
  }

  const { data: orderRows } =
    expiredCandidates.length > 0
      ? await supabase
          .from("orders")
          .select("*")
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .order("created_at", { ascending: false })
          .limit(50)
      : { data: initialOrders };

  const orders = orderRows ?? [];
  if (orders.length === 0) {
    return { buyerOrders: [], sellerOrders: [] };
  }

  const productIds = Array.from(new Set(orders.map((o) => o.product_id)));
  const profileIds = Array.from(
    new Set(orders.flatMap((o) => [o.buyer_id, o.seller_id])),
  );
  const orderIds = orders.map((o) => o.id);

  const [
    { data: productsData },
    { data: imagesData },
    { data: profilesData },
    { data: locationsData },
    { data: compartmentsData },
    { data: paymentsData },
  ] = await Promise.all([
    supabase.from("products").select("*").in("id", productIds),
    supabase
      .from("product_images")
      .select("*")
      .in("product_id", productIds)
      .order("display_order", { ascending: true }),
    supabase.from("profiles").select("*").in("id", profileIds),
    supabase.from("locker_locations").select("*"),
    supabase.from("locker_compartments").select("*"),
    supabase.from("payment_records").select("*").in("order_id", orderIds),
  ]);

  const productMap = new Map<string, ProductRow>();
  for (const p of productsData ?? []) productMap.set(p.id, p);

  const thumbMap = new Map<string, string>();
  for (const img of imagesData ?? []) {
    if (!thumbMap.has(img.product_id)) {
      thumbMap.set(img.product_id, img.image_url);
    }
  }

  const profileMap = new Map<string, ProfileRow>();
  for (const prof of profilesData ?? []) profileMap.set(prof.id, prof);

  const locationMap = new Map<string, LockerLocationRow>();
  for (const loc of locationsData ?? []) locationMap.set(loc.id, loc);

  const compartmentMap = new Map<string, LockerCompartmentRow>();
  for (const comp of compartmentsData ?? []) compartmentMap.set(comp.id, comp);

  const paymentMap = new Map<string, PaymentRecordRow>();
  for (const pay of paymentsData ?? []) paymentMap.set(pay.order_id, pay);

  const mapped = orders.map((order) =>
    mapRowToOrderSummary({
      order,
      product: productMap.get(order.product_id) ?? null,
      thumbnailUrl: thumbMap.get(order.product_id) ?? "/logo-edulocker.png",
      buyer: profileMap.get(order.buyer_id) ?? null,
      seller: profileMap.get(order.seller_id) ?? null,
      lockerLocation: order.locker_location_id
        ? (locationMap.get(order.locker_location_id) ?? null)
        : null,
      lockerCompartment: order.locker_compartment_id
        ? (compartmentMap.get(order.locker_compartment_id) ?? null)
        : null,
      payment: paymentMap.get(order.id) ?? null,
    }),
  );

  return {
    buyerOrders: mapped.filter((o) => o.buyerId === userId),
    sellerOrders: mapped.filter((o) => o.sellerId === userId),
  };
}

/**
 * Truy vấn chi tiết 1 đơn hàng (`/orders/[id]`) kèm Timeline `order_events`,
 * trạng thái `payment_records` và thông tin Mã OTP Demo (chỉ cho Buyer trong chế độ Demo).
 */
export async function fetchOrderDetail(
  orderId: string,
  currentUserId: string,
): Promise<OrderDetailData | null> {
  if (!isSupabaseConfigured()) return null;

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      orderId,
    );
  if (!isUuid) return null;

  const supabase = await createSupabaseServerClient();
  if (!supabase) return null;

  // Expire order if needed before reading detail
  await supabase.rpc("rpc_expire_order_if_needed", { p_order_id: orderId });

  const { data: orderRow, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (error || !orderRow) return null;

  // Authorization check: only buyer or seller can view
  if (
    orderRow.buyer_id !== currentUserId &&
    orderRow.seller_id !== currentUserId
  ) {
    return null;
  }

  const [
    { data: productRow },
    { data: imagesData },
    { data: profilesData },
    { data: lockerLocationRow },
    { data: lockerCompartmentRow },
    { data: eventsData },
    { data: paymentRow },
    { data: reviewRow },
    { data: disputeRow },
  ] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("id", orderRow.product_id)
      .maybeSingle(),
    supabase
      .from("product_images")
      .select("*")
      .eq("product_id", orderRow.product_id)
      .order("display_order", { ascending: true }),
    supabase
      .from("profiles")
      .select("*")
      .in("id", [orderRow.buyer_id, orderRow.seller_id]),
    orderRow.locker_location_id
      ? supabase
          .from("locker_locations")
          .select("*")
          .eq("id", orderRow.locker_location_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    orderRow.locker_compartment_id
      ? supabase
          .from("locker_compartments")
          .select("*")
          .eq("id", orderRow.locker_compartment_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase
      .from("order_events")
      .select("*")
      .eq("order_id", orderRow.id)
      .order("created_at", { ascending: true }),
    supabase
      .from("payment_records")
      .select("*")
      .eq("order_id", orderRow.id)
      .maybeSingle(),
    supabase
      .from("reviews")
      .select("*")
      .eq("order_id", orderRow.id)
      .maybeSingle(),
    supabase
      .from("disputes")
      .select("*")
      .eq("order_id", orderRow.id)
      .maybeSingle(),
  ]);

  const buyerProfile =
    (profilesData ?? []).find((p) => p.id === orderRow.buyer_id) ?? null;
  const sellerProfile =
    (profilesData ?? []).find((p) => p.id === orderRow.seller_id) ?? null;
  const thumbnailUrl = imagesData?.[0]?.image_url ?? "/logo-edulocker.png";

  const summary = mapRowToOrderSummary({
    order: orderRow,
    product: productRow ?? null,
    thumbnailUrl,
    buyer: buyerProfile,
    seller: sellerProfile,
    lockerLocation: lockerLocationRow ?? null,
    lockerCompartment: lockerCompartmentRow ?? null,
    payment: paymentRow ?? null,
  });

  const events: OrderEventItem[] = (eventsData ?? []).map((ev) => ({
    id: ev.id,
    orderId: ev.order_id,
    actorId: ev.actor_id,
    eventType: ev.event_type as OrderEventType,
    previousStatus: (ev.previous_status as OrderStatus) ?? null,
    newStatus: (ev.new_status as OrderStatus) ?? null,
    metadata:
      ev.metadata && typeof ev.metadata === "object" && !Array.isArray(ev.metadata)
        ? (ev.metadata as Record<string, unknown>)
        : {},
    createdAt: ev.created_at,
  }));

  const isLockerUnlockedByOtp = events.some(
    (e) => e.eventType === "LOCKER_UNLOCKED",
  );

  let demoOtpInfo: DemoOtpInfo | null = null;
  if (
    orderRow.buyer_id === currentUserId &&
    orderRow.status === "READY_FOR_PICKUP" &&
    isDemoOtpDeliveryEnabled()
  ) {
    const { data: otpJson } = await supabase.rpc("rpc_get_buyer_demo_otp", {
      p_order_id: orderRow.id,
    });

    if (otpJson && typeof otpJson === "object" && !Array.isArray(otpJson)) {
      const obj = otpJson as Record<string, unknown>;
      // Database xác nhận Demo Mode đang tắt → không hiển thị bảng OTP Demo
      if (obj.reason === "DEMO_MODE_DISABLED") {
        demoOtpInfo = null;
      } else {
      demoOtpInfo = {
        available: Boolean(obj.available),
        unlocked: Boolean(obj.unlocked) || isLockerUnlockedByOtp,
        demoOtp: typeof obj.demo_otp === "string" ? obj.demo_otp : undefined,
        expiresAt:
          typeof obj.expires_at === "string" ? obj.expires_at : undefined,
        attemptCount:
          typeof obj.attempt_count === "number" ? obj.attempt_count : undefined,
        maxAttempts:
          typeof obj.max_attempts === "number" ? obj.max_attempts : undefined,
        reason: typeof obj.reason === "string" ? obj.reason : undefined,
      };
      }
    }
  }

  const payment: PaymentSimulatorRecord | null = paymentRow
    ? {
        id: paymentRow.id,
        orderId: paymentRow.order_id,
        buyerId: paymentRow.buyer_id,
        sellerId: paymentRow.seller_id,
        amount: paymentRow.amount,
        status: paymentRow.status,
        heldAt: paymentRow.held_at,
        releasedAt: paymentRow.released_at,
        refundedAt: paymentRow.refunded_at,
      }
    : null;

  return {
    ...summary,
    events,
    payment,
    isLockerUnlockedByOtp:
      isLockerUnlockedByOtp || Boolean(demoOtpInfo?.unlocked),
    demoOtpInfo,
    review: reviewRow
      ? {
          id: reviewRow.id,
          orderId: reviewRow.order_id,
          reviewerId: reviewRow.reviewer_id,
          revieweeId: reviewRow.reviewee_id,
          rating: reviewRow.rating,
          descriptionAccuracy: reviewRow.description_accuracy,
          productConditionRating: reviewRow.product_condition_rating,
          transactionRating: reviewRow.transaction_rating,
          comment: reviewRow.comment,
          isHidden: reviewRow.is_hidden,
          createdAt: reviewRow.created_at,
        }
      : null,
    dispute: disputeRow
      ? {
          id: disputeRow.id,
          orderId: disputeRow.order_id,
          openedBy: disputeRow.opened_by,
          reason: disputeRow.reason,
          description: disputeRow.description,
          status: disputeRow.status,
          resolution: disputeRow.resolution,
          resolvedBy: disputeRow.resolved_by,
          createdAt: disputeRow.created_at,
          resolvedAt: disputeRow.resolved_at,
        }
      : null,
  };
}

/**
 * Truy vấn danh sách Trạm Smart Locker & Ngăn tủ trực tiếp từ Supabase (nếu đã cấu hình).
 * Không bao giờ trả về `currentOrderCode` của đơn hàng người khác để đảm bảo quyền riêng tư.
 */
export async function fetchLiveLockerLocations(): Promise<LockerLocation[]> {
  if (!isSupabaseConfigured()) {
    return getLockerLocations();
  }

  try {
    const supabase = await createSupabaseServerClient();
    if (!supabase) {
      return getLockerLocations();
    }

    const [{ data: locRows, error: locErr }, { data: compRows, error: compErr }] =
      await Promise.all([
        supabase
          .from("locker_locations")
          .select("*")
          .order("code", { ascending: true }),
        supabase
          .from("locker_compartments")
          .select("*")
          .order("code", { ascending: true }),
      ]);

    if (locErr || compErr || !locRows || locRows.length === 0) {
      return getLockerLocations();
    }

    const compsByStation = new Map<string, LockerCompartment[]>();
    for (const c of compRows ?? []) {
      const list = compsByStation.get(c.locker_id) ?? [];
      list.push({
        id: c.id,
        lockerId: c.locker_id,
        code: c.code,
        size: c.size,
        sizeLabel: c.size_label,
        status: c.status,
        // Không expose mã đơn hàng riêng tư lên trang sơ đồ công khai
        currentOrderCode: undefined,
      });
      compsByStation.set(c.locker_id, list);
    }

    return locRows.map((loc) => {
      const compartments = compsByStation.get(loc.id) ?? [];
      const availableCount = compartments.filter(
        (c) => c.status === "AVAILABLE",
      ).length;
      return {
        id: loc.id,
        code: loc.code,
        name: loc.name,
        campusArea: loc.campus_area,
        address: loc.address,
        universityId: loc.university_id,
        universityName: getUniversityShortName(loc.university_id),
        operatingHours: loc.operating_hours,
        description: loc.description,
        totalCompartments: compartments.length,
        availableCompartments: availableCount,
        compartments,
      };
    });
  } catch {
    return getLockerLocations();
  }
}

