export type CategorySlug =
  | "giao-trinh"
  | "sach"
  | "dung-cu-hoc-tap"
  | "may-tinh-cam-tay"
  | "do-dien-tu"
  | "do-ktx"
  | "do-gia-dung"
  | "phu-kien"
  | "khac";

export interface Category {
  id: string;
  slug: CategorySlug;
  name: string;
  shortDescription: string;
  iconName: string;
  productCount: number;
  sortOrder: number;
}

export interface University {
  id: string;
  code: string;
  name: string;
  shortName: string;
  emailDomain: string;
  city: string;
  campusLocations: string[];
}

export interface Major {
  id: string;
  universityId: string;
  code: string;
  name: string;
  faculty: string;
}

export interface Course {
  id: string;
  majorId: string;
  code: string;
  name: string;
  semesterHint?: string;
}

export type ProductCondition = "LIKE_NEW" | "GOOD" | "FAIR" | "WELL_USED";

export type ProductStatus =
  | "DRAFT"
  | "AVAILABLE"
  | "RESERVED"
  | "SOLD"
  | "HIDDEN";

export type DeliveryMethod = "SMART_LOCKER" | "CAMPUS_MEETUP" | "BOTH";

export interface SellerProfile {
  id: string;
  fullName: string;
  avatarUrl: string;
  universityId: string;
  universityName: string;
  majorId: string;
  majorName: string;
  cohort: string; // e.g. "K48", "K49", "K50", "K51"
  emailVerified: boolean;
  campusVerifiedDemo: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedTransactions: number;
  ecoPoints: number;
  joinedAt: string;
  bio?: string;
}

export interface AuthenticatedUserProfile {
  id: string;
  email: string;
  fullName: string;
  avatarUrl: string | null;
  universityId: string;
  universityName: string;
  majorId: string;
  majorName: string;
  cohort: string;
  bio: string | null;
  emailVerified: boolean;
  campusVerified: boolean;
  ratingAvg: number;
  ratingCount: number;
  completedTransactions: number;
  ecoPoints: number;
  role: "student" | "moderator" | "admin";
  createdAt: string;
}

export interface ProductImage {
  id: string;
  productId: string;
  url: string;
  storagePath?: string | null;
  alt: string;
  displayOrder: number;
}

export interface Product {
  id: string;
  slug: string;
  title: string;
  description: string;
  highlights: string[];
  categoryId: string;
  categorySlug: CategorySlug;
  categoryName: string;
  price: number; // VNĐ
  originalPrice?: number; // VNĐ
  condition: ProductCondition;
  conditionLabel: string;
  conditionPercent: number; // e.g., 95, 90, 85
  universityId: string;
  universityName: string;
  majorId: string;
  majorName: string;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
  cohort: string; // "K48" | "K49" | "K50" | "K51" | "Tất cả khóa"
  sellerId: string;
  seller: SellerProfile;
  preferredLockerId: string;
  preferredLockerName: string;
  deliveryMethod: DeliveryMethod;
  images: ProductImage[];
  thumbnailUrl: string;
  status: ProductStatus;
  isFeaturedForYou?: boolean;
  isBestDealToday?: boolean;
  isPopularTextbook?: boolean;
  isDemo?: boolean;
  viewCount: number;
  favoriteCount: number;
  createdAt: string; // ISO string
}

export type ProductSortOption =
  | "newest"
  | "price-asc"
  | "price-desc"
  | "popular";

export interface ProductFilterParams {
  q?: string;
  category?: CategorySlug | "all";
  minPrice?: number;
  maxPrice?: number;
  condition?: ProductCondition | "all";
  university?: string | "all";
  major?: string | "all";
  course?: string | "all";
  cohort?: string | "all";
  sort?: ProductSortOption;
  page?: number;
  pageSize?: number;
}

export type OrderStatus =
  | "PENDING"
  | "SELLER_CONFIRMED"
  | "AWAITING_DROPOFF"
  | "IN_LOCKER"
  | "READY_FOR_PICKUP"
  | "PICKED_UP"
  | "COMPLETED"
  | "CANCELLED"
  | "EXPIRED"
  | "DISPUTED"
  | "RETURN_PENDING"
  | "RETURNED";

export type PaymentSimulatorStatus =
  | "PENDING"
  | "HELD_DEMO"
  | "RELEASED_DEMO"
  | "REFUNDED_DEMO";

export type LockerCompartmentStatus =
  | "AVAILABLE"
  | "RESERVED"
  | "OCCUPIED"
  | "MAINTENANCE";

export interface LockerCompartment {
  id: string;
  lockerId: string;
  code: string; // A01..A04, B01..B04
  size: "S" | "M" | "L";
  sizeLabel: string;
  status: LockerCompartmentStatus;
  currentOrderCode?: string;
}

export interface LockerLocation {
  id: string;
  code: string;
  name: string;
  campusArea: string;
  address: string;
  universityId: string;
  universityName: string;
  operatingHours: string;
  description: string;
  totalCompartments: number;
  availableCompartments: number;
  compartments: LockerCompartment[];
}

export interface SmartLockerProvider {
  reserveCompartment(
    lockerId: string,
    compartmentCode: string,
    orderId: string,
  ): Promise<void>;
  releaseCompartment(compartmentId: string): Promise<void>;
  unlockCompartment(compartmentId: string, accessToken?: string): Promise<void>;
  getCompartmentStatus(compartmentId: string): Promise<LockerCompartmentStatus>;
}

export type OrderEventType =
  | "ORDER_CREATED"
  | "SELLER_CONFIRMED"
  | "LOCKER_RESERVED"
  | "ITEM_DROPPED_OFF"
  | "OTP_GENERATED"
  | "OTP_REGENERATED"
  | "LOCKER_UNLOCKED"
  | "ITEM_PICKED_UP"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED"
  | "ORDER_EXPIRED"
  | "DISPUTE_OPENED";

export type LockerReservationStatus =
  | "ACTIVE"
  | "USED"
  | "EXPIRED"
  | "RELEASED";

export interface OrderEventItem {
  id: string;
  orderId: string;
  actorId: string | null;
  eventType: OrderEventType;
  previousStatus: OrderStatus | null;
  newStatus: OrderStatus | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

export interface PaymentSimulatorRecord {
  id: string;
  orderId: string;
  buyerId: string;
  sellerId: string;
  amount: number;
  status: PaymentSimulatorStatus;
  heldAt: string;
  releasedAt: string | null;
  refundedAt: string | null;
}

export interface DemoOtpInfo {
  available: boolean;
  unlocked: boolean;
  demoOtp?: string;
  expiresAt?: string;
  attemptCount?: number;
  maxAttempts?: number;
  reason?: string;
}

export interface OrderSummary {
  id: string;
  buyerId: string;
  sellerId: string;
  productId: string;
  status: OrderStatus;
  productPrice: number;
  totalAmount: number;
  disputeReason: string | null;
  lockerLocationId: string | null;
  lockerLocationName: string | null;
  lockerLocationCode: string | null;
  lockerCompartmentId: string | null;
  lockerCompartmentCode: string | null;
  lockerCompartmentSize: "S" | "M" | "L" | null;
  lockerCompartmentStatus: LockerCompartmentStatus | null;
  createdAt: string;
  updatedAt: string;
  sellerConfirmedAt: string | null;
  droppedOffAt: string | null;
  readyForPickupAt: string | null;
  pickedUpAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  expiresAt: string | null;
  product: {
    id: string;
    slug: string;
    title: string;
    thumbnailUrl: string;
    conditionLabel: string;
    categoryName: string;
    universityName: string;
    status: ProductStatus;
  };
  buyer: {
    id: string;
    fullName: string;
    cohort: string;
    universityName: string;
  };
  seller: {
    id: string;
    fullName: string;
    cohort: string;
    universityName: string;
  };
  paymentStatus: PaymentSimulatorStatus;
}

export interface OrderDetailData extends OrderSummary {
  events: OrderEventItem[];
  payment: PaymentSimulatorRecord | null;
  isLockerUnlockedByOtp: boolean;
  demoOtpInfo: DemoOtpInfo | null;
  review?: ReviewItem | null;
  dispute?: DisputeItem | null;
}

// =============================================================================
// PHASE 4 TYPES: Messaging, Reviews, Notifications, Reports, Disputes, Admin
// =============================================================================

export interface ConversationSummary {
  id: string;
  productId: string;
  buyerId: string;
  sellerId: string;
  lastMessageAt: string | null;
  createdAt: string;
  product: {
    id: string;
    slug: string;
    title: string;
    price: number;
    status: ProductStatus;
    thumbnailUrl: string;
  };
  otherParticipant: {
    id: string;
    fullName: string;
    cohort: string;
    universityName: string;
    role: string;
  };
  lastMessage: {
    id: string;
    content: string;
    senderId: string;
    createdAt: string;
  } | null;
  unreadCount: number;
}

export interface MessageItem {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  readAt: string | null;
  createdAt: string;
}

export interface ReviewItem {
  id: string;
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number;
  descriptionAccuracy: number;
  productConditionRating: number;
  transactionRating: number;
  comment: string | null;
  isHidden: boolean;
  createdAt: string;
  reviewerName?: string;
  reviewerCohort?: string;
  productTitle?: string;
}

export type NotificationType =
  | "ORDER_CREATED"
  | "ORDER_CONFIRMED"
  | "LOCKER_RESERVED"
  | "READY_FOR_PICKUP"
  | "OTP_REGENERATED"
  | "ORDER_COMPLETED"
  | "ORDER_CANCELLED"
  | "DISPUTE_OPENED"
  | "DISPUTE_RESOLVED"
  | "NEW_MESSAGE"
  | "NEW_REVIEW"
  | "REPORT_STATUS_CHANGED";

export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  href: string | null;
  metadata: Record<string, unknown>;
  readAt: string | null;
  createdAt: string;
}

export type ReportTargetType = "PRODUCT" | "USER" | "MESSAGE";
export type ReportStatus = "PENDING" | "REVIEWING" | "RESOLVED" | "REJECTED";

export interface ReportItem {
  id: string;
  reporterId: string;
  reporterName?: string;
  targetType: ReportTargetType;
  targetId: string;
  targetLabel?: string;
  reason: string;
  description: string | null;
  status: ReportStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  adminNote: string | null;
  createdAt: string;
}

export type DisputeStatus =
  | "OPEN"
  | "UNDER_REVIEW"
  | "RESOLVED_BUYER"
  | "RESOLVED_SELLER"
  | "CLOSED";

export interface DisputeItem {
  id: string;
  orderId: string;
  openedBy: string;
  reason: string;
  description: string | null;
  status: DisputeStatus;
  resolution: string | null;
  resolvedBy: string | null;
  createdAt: string;
  resolvedAt: string | null;
  buyerName?: string;
  sellerName?: string;
  productTitle?: string;
  totalAmount?: number;
  paymentStatus?: PaymentSimulatorStatus;
}

export interface AdminOverviewStats {
  totalUsers: number;
  newUsers7d: number;
  totalProducts: number;
  availableProducts: number;
  soldProducts: number;
  totalOrders: number;
  completedOrders: number;
  cancelledOrders: number;
  disputedOrders: number;
  totalDemoVolume: number;
  lockerTotalCompartments: number;
  lockerUsedCompartments: number;
  pendingReports: number;
  openDisputes: number;
  reusedItemCount: number;
}
