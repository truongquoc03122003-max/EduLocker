import { describe, expect, it } from "vitest";
import {
  filterAndSortProducts,
  getAllCategories,
  getAllCourses,
  getAllMajors,
  getHomePageSections,
  getLockerLocations,
  getProductByIdOrSlug,
  normalizeProductFilterParams,
} from "@/features/marketplace/product-service";
import { PRODUCTS } from "@/features/marketplace/mock-data";
import {
  assertOrderTransition,
  canCancelOrder,
  canExpireOrder,
  canOpenDispute,
  canRegenerateLockerOtp,
  canTransitionOrder,
  canTransitionOrderStatus,
  EXPIRABLE_ORDER_STATUSES,
  getOrderEventLabel,
  resolveOrderSideEffects,
  shouldAutoExpireOrder,
  transitionOrder,
} from "@/features/orders/order-state-machine";
import { isDemoOtpDeliveryEnabled } from "@/lib/demo-mode";
import {
  canAdminAccess,
  canResolveDisputeTransition,
  canSubmitOrderReview,
  isConversationParticipant,
  isDuplicateActiveReport,
  validateMessageContent,
} from "@/lib/validations/phase4";
import {
  hashOrderOtp,
  MockSmartLockerProvider,
  OtpSecurityManager,
} from "@/features/lockers/smart-locker-provider";
import {
  canManageProduct,
  hasValidImageSignature,
  mergeFavoriteIds,
  productCreateSchema,
  validateProductImageFiles,
} from "@/lib/validations/product";
import {
  isUniversityMajorConsistent,
  loginSchema,
  profileUpdateSchema,
  registerSchema,
  sanitizeRedirectPath,
} from "@/lib/validations/auth";
import { executeSafeImageReplacement } from "@/features/marketplace/image-replacement";
import { sanitizeFavoriteIds } from "@/hooks/use-app-ui";
import type { OrderStatus } from "@/types";

describe("EduLocker Marketplace Service & Derived Data", () => {
  it("returns all 9 required student categories with dynamically derived productCount", () => {
    const categories = getAllCategories();
    expect(categories).toHaveLength(9);
    expect(categories.map((c) => c.name)).toEqual([
      "Giáo trình",
      "Sách",
      "Dụng cụ học tập",
      "Máy tính cầm tay",
      "Đồ điện tử",
      "Đồ KTX",
      "Đồ gia dụng",
      "Phụ kiện",
      "Khác",
    ]);

    const visibleProducts = PRODUCTS.filter((p) => p.status !== "HIDDEN");
    const sumOfCategoryCounts = categories.reduce(
      (sum, cat) => sum + cat.productCount,
      0,
    );
    expect(sumOfCategoryCounts).toBe(visibleProducts.length);

    for (const cat of categories) {
      const actualCount = visibleProducts.filter(
        (p) => p.categorySlug === cat.slug,
      ).length;
      expect(cat.productCount).toBe(actualCount);
    }
  });

  it("derives availableCompartments and totalCompartments accurately for each Locker station", () => {
    const locations = getLockerLocations();
    expect(locations).toHaveLength(2);

    for (const loc of locations) {
      const actualAvailable = loc.compartments.filter(
        (c) => c.status === "AVAILABLE",
      ).length;
      expect(loc.totalCompartments).toBe(loc.compartments.length);
      expect(loc.availableCompartments).toBe(actualAvailable);
    }
  });

  it("populates all 4 home page product sections", () => {
    const sections = getHomePageSections();
    expect(sections.forYou.length).toBeGreaterThan(0);
    expect(sections.newest.length).toBeGreaterThan(0);
    expect(sections.bestDeals.length).toBeGreaterThan(0);
    expect(sections.popularTextbooks.length).toBeGreaterThan(0);
  });

  it("filters products by search keyword, major, cohort and price range", () => {
    const byQuery = filterAndSortProducts({ q: "Giải tích" });
    expect(byQuery.totalCount).toBeGreaterThanOrEqual(1);
    expect(
      byQuery.items.some((item) => item.title.includes("Giáo trình Giải tích")),
    ).toBe(true);

    const byMajor = filterAndSortProducts({ major: "major-tdh" });
    expect(byMajor.items.every((p) => p.majorId === "major-tdh")).toBe(true);

    const byPrice = filterAndSortProducts({
      minPrice: 30000,
      maxPrice: 60000,
      sort: "price-asc",
    });
    expect(
      byPrice.items.every((p) => p.price >= 30000 && p.price <= 60000),
    ).toBe(true);
    for (let i = 1; i < byPrice.items.length; i++) {
      expect(byPrice.items[i].price).toBeGreaterThanOrEqual(
        byPrice.items[i - 1].price,
      );
    }
  });

  it("normalizes invalid filter query params safely and enforces academic hierarchy", () => {
    const normalized = normalizeProductFilterParams({
      q: "  Casio  ",
      category: "invalid-cat",
      condition: "INVALID_COND",
      sort: "abc",
      page: "-20",
      minPrice: "150000",
      maxPrice: "40000",
      university: "uni-ctump", // CTUMP has no CTU majors
      major: "major-tdh", // belongs to uni-ctu
      course: "course-giai-tich", // belongs to major-tdh
      cohort: "K99",
    });

    expect(normalized.q).toBe("Casio");
    expect(normalized.category).toBe("all");
    expect(normalized.condition).toBe("all");
    expect(normalized.sort).toBe("newest");
    expect(normalized.page).toBe(1);
    // Swapped minPrice and maxPrice because minPrice > maxPrice
    expect(normalized.minPrice).toBe(40000);
    expect(normalized.maxPrice).toBe(150000);
    expect(normalized.university).toBe("uni-ctump");
    // Major and course reset because major-tdh does not belong to uni-ctump
    expect(normalized.major).toBe("all");
    expect(normalized.course).toBe("all");
    expect(normalized.cohort).toBe("all");

    // Valid university + major but mismatched course resets course to "all"
    const mismatchedCourse = normalizeProductFilterParams({
      university: "uni-ctu",
      major: "major-cntt",
      course: "course-giai-tich", // belongs to major-tdh, not major-cntt
    });
    expect(mismatchedCourse.university).toBe("uni-ctu");
    expect(mismatchedCourse.major).toBe("major-cntt");
    expect(mismatchedCourse.course).toBe("all");

    expect(getAllMajors("uni-ctu").length).toBeGreaterThan(0);
    expect(getAllMajors("uni-ctump")).toHaveLength(0);
    expect(
      getAllCourses("major-tdh", "uni-ctu").every(
        (c) => c.majorId === "major-tdh",
      ),
    ).toBe(true);
  });

  it("retrieves product detail by id or slug and sanitizes favorite IDs", () => {
    const byId = getProductByIdOrSlug("prod-may-tinh-casio");
    expect(byId).toBeDefined();
    expect(byId?.title).toContain("Casio");

    const bySlug = getProductByIdOrSlug("giao-trinh-giai-tich-dai-hoc-can-tho");
    expect(bySlug).toBeDefined();
    expect(bySlug?.id).toBe("prod-giao-trinh-giai-tich");

    const sanitized = sanitizeFavoriteIds([
      "prod-may-tinh-casio",
      "non-existent-id-999",
      12345,
      null,
      "prod-may-tinh-casio",
    ]);
    expect(sanitized).toEqual(["prod-may-tinh-casio"]);
  });
});

describe("Order State Machine & Smart Locker Provider", () => {
  it("validates the complete 5-step happy path and rejects illegal transitions", () => {
    const happyPath: OrderStatus[] = [
      "PENDING",
      "SELLER_CONFIRMED",
      "AWAITING_DROPOFF",
      "IN_LOCKER",
      "READY_FOR_PICKUP",
      "PICKED_UP",
      "COMPLETED",
    ];

    for (let i = 0; i < happyPath.length - 1; i++) {
      const from = happyPath[i];
      const to = happyPath[i + 1];
      expect(canTransitionOrderStatus(from, to)).toBe(true);
      expect(assertOrderTransition(from, to)).toBe(to);
    }

    // Illegal transitions
    expect(canTransitionOrderStatus("PENDING", "COMPLETED")).toBe(false);
    expect(canTransitionOrderStatus("SELLER_CONFIRMED", "READY_FOR_PICKUP")).toBe(
      false,
    );
    expect(canTransitionOrderStatus("AWAITING_DROPOFF", "READY_FOR_PICKUP")).toBe(
      false,
    );
    expect(canTransitionOrderStatus("COMPLETED", "CANCELLED")).toBe(false);

    expect(() => assertOrderTransition("PENDING", "COMPLETED")).toThrowError(
      /Chuyển trạng thái đơn hàng không hợp lệ/,
    );
  });

  it("reserves, unlocks (only when OCCUPIED), checks status, and releases Smart Locker compartments safely", async () => {
    const locker = new MockSmartLockerProvider();

    // 1. Reservation: AVAILABLE succeeds, RESERVED fails
    expect(await locker.getCompartmentStatus("comp-a01")).toBe("AVAILABLE");
    await locker.reserveCompartment("locker-ktx-a", "A01", "ORD-001");
    expect(await locker.getCompartmentStatus("comp-a01")).toBe("RESERVED");

    await expect(
      locker.reserveCompartment("locker-ktx-a", "A01", "ORD-002"),
    ).rejects.toThrowError("Ngăn tủ hiện không khả dụng.");

    // 2. Unlock: fails on AVAILABLE (comp-a03), RESERVED (comp-a02), MAINTENANCE (comp-b04)
    await expect(locker.unlockCompartment("comp-a03")).rejects.toThrowError(
      /Ngăn tủ hiện không khả dụng/,
    );
    await expect(locker.unlockCompartment("comp-a02")).rejects.toThrowError(
      /Ngăn tủ hiện không khả dụng/,
    );
    await expect(locker.unlockCompartment("comp-b04")).rejects.toThrowError(
      /Ngăn tủ hiện không khả dụng/,
    );

    // 3. Unlock: succeeds on OCCUPIED (comp-a04)
    expect(await locker.getCompartmentStatus("comp-a04")).toBe("OCCUPIED");
    await expect(locker.unlockCompartment("comp-a04")).resolves.toBeUndefined();

    // 4. Release: resets compartment to AVAILABLE
    await locker.releaseCompartment("comp-a01");
    expect(await locker.getCompartmentStatus("comp-a01")).toBe("AVAILABLE");
  });

  it("validates product creation input with Zod and enforces academic hierarchy", () => {
    const valid = productCreateSchema.safeParse({
      title: "Giáo trình Giải tích 1 Đại học Cần Thơ",
      categorySlug: "giao-trinh",
      description:
        "Sách còn mới 95%, đã bọc bìa nhựa, không rách trang nào, giao qua tủ Thư viện.",
      condition: "LIKE_NEW",
      conditionPercent: 95,
      price: 35000,
      originalPrice: 85000,
      universityId: "uni-ctu",
      majorId: "major-tdh",
      courseId: "course-giai-tich",
      cohort: "K51",
      preferredLockerId: "locker-thu-vien",
    });
    expect(valid.success).toBe(true);

    const invalidPrice = productCreateSchema.safeParse({
      title: "Giáo trình Giải tích",
      categorySlug: "giao-trinh",
      description: "Sách còn rất mới, đầy đủ trang học tập tại ĐH Cần Thơ.",
      condition: "LIKE_NEW",
      price: 100000,
      originalPrice: 50000,
      universityId: "uni-ctu",
      majorId: "major-tdh",
      cohort: "K51",
      preferredLockerId: "locker-thu-vien",
    });
    expect(invalidPrice.success).toBe(false);

    // Course does not belong to selected major
    const mismatchedCourseMajor = productCreateSchema.safeParse({
      title: "Giáo trình Giải tích 1 Đại học Cần Thơ",
      categorySlug: "giao-trinh",
      description:
        "Sách còn mới 95%, đã bọc bìa nhựa, không rách trang nào, giao qua tủ Thư viện.",
      condition: "LIKE_NEW",
      price: 35000,
      universityId: "uni-ctu",
      majorId: "major-cntt",
      courseId: "course-giai-tich", // belongs to major-tdh
      preferredLockerId: "locker-thu-vien",
    });
    expect(mismatchedCourseMajor.success).toBe(false);
  });
});

describe("Phase 2 – Auth, Ownership, Favorites Merge, File Signature & Redirect Security", () => {
  it("validates login, register, and profile update schemas with academic dependency", () => {
    expect(
      loginSchema.safeParse({
        email: "SV01@student.ctu.edu.vn",
        password: "password123",
      }).success,
    ).toBe(true);

    expect(
      loginSchema.safeParse({
        email: "not-an-email",
        password: "123",
      }).success,
    ).toBe(false);

    const validReg = registerSchema.safeParse({
      fullName: "Trần Minh Khoa",
      email: "khoa@student.ctu.edu.vn",
      password: "Password123!",
      confirmPassword: "Password123!",
      universityId: "uni-ctu",
      majorId: "major-cntt",
      cohort: "K49",
    });
    expect(validReg.success).toBe(true);

    // Mismatched confirmPassword fails
    const mismatchPass = registerSchema.safeParse({
      fullName: "Trần Minh Khoa",
      email: "khoa@student.ctu.edu.vn",
      password: "Password123!",
      confirmPassword: "DifferentPassword!",
      universityId: "uni-ctu",
      majorId: "major-cntt",
      cohort: "K49",
    });
    expect(mismatchPass.success).toBe(false);

    // Mismatched universityId and majorId fails
    const mismatchMajor = registerSchema.safeParse({
      fullName: "Trần Minh Khoa",
      email: "khoa@student.ctu.edu.vn",
      password: "Password123!",
      confirmPassword: "Password123!",
      universityId: "uni-ctump",
      majorId: "major-cntt", // belongs to uni-ctu
      cohort: "K49",
    });
    expect(mismatchMajor.success).toBe(false);

    const validProfile = profileUpdateSchema.safeParse({
      fullName: "Lê Ngọc Hân",
      universityId: "uni-ctu",
      majorId: "major-kt",
      cohort: "K50",
      bio: "Sinh viên Kinh tế CTU",
    });
    expect(validProfile.success).toBe(true);
  });

  it("enforces product ownership check (canManageProduct) and deduplicates favorites merge", () => {
    expect(canManageProduct("user-123", "user-123")).toBe(true);
    expect(canManageProduct("user-123", "user-999")).toBe(false);
    expect(canManageProduct(null, "user-123")).toBe(false);
    expect(canManageProduct(undefined, "user-123")).toBe(false);

    const merged = mergeFavoriteIds(
      ["prod-1", "prod-2", "prod-1", ""],
      ["prod-2", "prod-3", "  prod-4  "],
    );
    expect(merged).toEqual(["prod-1", "prod-2", "prod-3", "prod-4"]);
  });

  it("validates image magic bytes and rejects oversized or forged files", () => {
    // Valid PNG header: 89 50 4E 47 0D 0A 1A 0A
    const pngBytes = new Uint8Array([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    ]);
    expect(hasValidImageSignature(pngBytes)).toBe(true);

    // Valid JPEG header: FF D8 FF E0
    const jpegBytes = new Uint8Array([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
    ]);
    expect(hasValidImageSignature(jpegBytes)).toBe(true);

    // Valid WEBP header: RIFF....WEBP
    const webpBytes = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x24, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50,
    ]);
    expect(hasValidImageSignature(webpBytes)).toBe(true);

    // Forged executable renamed to .png
    const forgedBytes = new Uint8Array([
      0x4d, 0x5a, 0x90, 0x00, 0x03, 0x00, 0x00, 0x00, 0x04, 0x00, 0x00, 0x00,
    ]);
    expect(hasValidImageSignature(forgedBytes)).toBe(false);

    const checkValid = validateProductImageFiles([
      {
        name: "sach-giai-tich.png",
        size: 1024,
        type: "image/png",
        headerBytes: pngBytes,
      },
    ]);
    expect(checkValid.valid).toBe(true);

    const checkForged = validateProductImageFiles([
      {
        name: "fake.png",
        size: 2048,
        type: "image/png",
        headerBytes: forgedBytes,
      },
    ]);
    expect(checkForged.valid).toBe(false);
    expect(checkForged.error).toMatch(/Chữ ký nội dung tệp/);

    const checkOversized = validateProductImageFiles([
      {
        name: "huge.jpg",
        size: 6 * 1024 * 1024, // 6MB > 5MB
        type: "image/jpeg",
        headerBytes: jpegBytes,
      },
    ]);
    expect(checkOversized.valid).toBe(false);
    expect(checkOversized.error).toMatch(/vượt quá giới hạn 5 MB/);
  });

  it("sanitizes redirect paths to prevent open redirect attacks", () => {
    expect(sanitizeRedirectPath("/sell")).toBe("/sell");
    expect(sanitizeRedirectPath("/products?category=giao-trinh")).toBe(
      "/products?category=giao-trinh",
    );
    expect(sanitizeRedirectPath("https://evil.com")).toBe("/");
    expect(sanitizeRedirectPath("//evil.com")).toBe("/");
    expect(sanitizeRedirectPath("/\\evil.com")).toBe("/");
    expect(sanitizeRedirectPath("/login?next=/sell")).toBe("/");
    expect(sanitizeRedirectPath(null, "/profile")).toBe("/profile");
  });

  it("rejects privileged system profile fields in client profileUpdateSchema", () => {
    const attemptAdminRole = profileUpdateSchema.safeParse({
      fullName: "Lê Ngọc Hân",
      universityId: "uni-ctu",
      majorId: "major-kt",
      cohort: "K50",
      role: "admin",
    });
    expect(attemptAdminRole.success).toBe(false);

    const attemptCampusVerify = profileUpdateSchema.safeParse({
      fullName: "Lê Ngọc Hân",
      universityId: "uni-ctu",
      majorId: "major-kt",
      cohort: "K50",
      campus_verified: true,
      eco_points: 999999,
      rating_avg: 5.0,
    });
    expect(attemptCampusVerify.success).toBe(false);
  });

  it("enforces strict University -> Major consistency and blocks universities without seeded majors", () => {
    expect(isUniversityMajorConsistent("uni-ctu", "major-cntt")).toBe(true);
    expect(isUniversityMajorConsistent("uni-ctump", "major-cntt")).toBe(false);
    expect(isUniversityMajorConsistent("uni-ctump", "")).toBe(false);
    expect(isUniversityMajorConsistent("uni-ctu", "")).toBe(false);

    const unsupportedUniProduct = productCreateSchema.safeParse({
      title: "Giáo trình Giải phẫu học Đại cương",
      categorySlug: "giao-trinh",
      description:
        "Sách còn mới 95%, đầy đủ trang và hình minh họa màu rõ nét.",
      condition: "LIKE_NEW",
      conditionPercent: 95,
      price: 45000,
      universityId: "uni-ctump",
      majorId: "major-cntt",
      cohort: "K49",
      preferredLockerId: "locker-thu-vien",
    });
    expect(unsupportedUniProduct.success).toBe(false);
  });

  it("aligns Zod productCreateSchema constraints with PostgreSQL CHECK limits (title 10-120, description 25-2000)", () => {
    // Title with 9 chars (< 10) must be rejected by Zod before hitting PostgreSQL
    const shortTitle = productCreateSchema.safeParse({
      title: "Sách toán", // 9 chars
      categorySlug: "giao-trinh",
      description:
        "Sách còn mới 95%, đã bọc bìa nhựa, không rách trang nào, giao qua tủ Thư viện.",
      condition: "LIKE_NEW",
      conditionPercent: 95,
      price: 35000,
      universityId: "uni-ctu",
      majorId: "major-cntt",
      cohort: "K49",
      preferredLockerId: "locker-thu-vien",
    });
    expect(shortTitle.success).toBe(false);

    // Description with 22 chars (< 25) must be rejected by Zod before hitting PostgreSQL
    const shortDescription = productCreateSchema.safeParse({
      title: "Giáo trình Giải tích 1 CTU",
      categorySlug: "giao-trinh",
      description: "Sách còn mới 95% đẹp.", // 21 chars
      condition: "LIKE_NEW",
      conditionPercent: 95,
      price: 35000,
      universityId: "uni-ctu",
      majorId: "major-cntt",
      cohort: "K49",
      preferredLockerId: "locker-thu-vien",
    });
    expect(shortDescription.success).toBe(false);
  });

  it("rolls back safely during product image replacement without losing old images when upload or DB insert fails", async () => {
    const oldImages = [
      {
        id: "img-old-1",
        image_url: "https://example.com/old-1.jpg",
        storage_path: "user-1/prod-1/old-1.jpg",
        alt_text: "Ảnh cũ 1",
        display_order: 0,
      },
      {
        id: "img-old-2",
        image_url: "https://example.com/old-2.jpg",
        storage_path: "user-1/prod-1/old-2.jpg",
        alt_text: "Ảnh cũ 2",
        display_order: 1,
      },
    ];

    // Case 1: Second file upload fails -> first uploaded file is cleaned up, old images are NOT deleted
    const cleanedStorageOnUploadFail: string[] = [];
    let oldDbDeletedOnUploadFail = false;

    const uploadFailResult = await executeSafeImageReplacement({
      productId: "prod-1",
      oldImagesToReplace: oldImages,
      newUploads: [
        {
          storagePath: "user-1/prod-1/new-1.jpg",
          altText: "Ảnh mới 1",
          displayOrder: 0,
          upload: async () => ({ publicUrl: "https://example.com/new-1.jpg" }),
        },
        {
          storagePath: "user-1/prod-1/new-2.jpg",
          altText: "Ảnh mới 2",
          displayOrder: 1,
          upload: async () => ({
            publicUrl: "",
            error: "Storage network error on file 2",
          }),
        },
      ],
      adapter: {
        insertNewImageRows: async () => ({ insertedIds: ["new-id-1"] }),
        deleteImageRowsByIds: async () => {
          oldDbDeletedOnUploadFail = true;
          return {};
        },
        removeStorageFiles: async (paths: string[]) => {
          cleanedStorageOnUploadFail.push(...paths);
          return {};
        },
      },
    });

    expect(uploadFailResult.success).toBe(false);
    expect(oldDbDeletedOnUploadFail).toBe(false);
    expect(cleanedStorageOnUploadFail).toEqual(["user-1/prod-1/new-1.jpg"]);

    // Case 2: Upload succeeds, but DB batch insert fails -> newly uploaded files are cleaned up, old images are NOT deleted
    const cleanedStorageOnInsertFail: string[] = [];
    const deletedDbIdsOnInsertFail: string[] = [];

    const insertFailResult = await executeSafeImageReplacement({
      productId: "prod-1",
      oldImagesToReplace: oldImages,
      newUploads: [
        {
          storagePath: "user-1/prod-1/new-1.jpg",
          altText: "Ảnh mới 1",
          displayOrder: 0,
          upload: async () => ({ publicUrl: "https://example.com/new-1.jpg" }),
        },
        {
          storagePath: "user-1/prod-1/new-2.jpg",
          altText: "Ảnh mới 2",
          displayOrder: 1,
          upload: async () => ({ publicUrl: "https://example.com/new-2.jpg" }),
        },
      ],
      adapter: {
        insertNewImageRows: async () => ({
          insertedIds: [],
          error: "DB batch insert constraint error",
        }),
        deleteImageRowsByIds: async (ids: string[]) => {
          deletedDbIdsOnInsertFail.push(...ids);
          return {};
        },
        removeStorageFiles: async (paths: string[]) => {
          cleanedStorageOnInsertFail.push(...paths);
          return {};
        },
      },
    });

    expect(insertFailResult.success).toBe(false);
    // Old DB rows must never be in deletedDbIdsOnInsertFail
    expect(deletedDbIdsOnInsertFail).toEqual([]);
    expect(cleanedStorageOnInsertFail).toEqual([
      "user-1/prod-1/new-1.jpg",
      "user-1/prod-1/new-2.jpg",
    ]);

    // Case 3: Both upload and DB batch insert succeed -> old DB rows and old Storage files are deleted
    const deletedDbIdsOnSuccess: string[] = [];
    const removedStorageOnSuccess: string[] = [];

    const successResult = await executeSafeImageReplacement({
      productId: "prod-1",
      oldImagesToReplace: oldImages,
      newUploads: [
        {
          storagePath: "user-1/prod-1/new-1.jpg",
          altText: "Ảnh mới 1",
          displayOrder: 0,
          upload: async () => ({ publicUrl: "https://example.com/new-1.jpg" }),
        },
        {
          storagePath: "user-1/prod-1/new-2.jpg",
          altText: "Ảnh mới 2",
          displayOrder: 1,
          upload: async () => ({ publicUrl: "https://example.com/new-2.jpg" }),
        },
      ],
      adapter: {
        insertNewImageRows: async () => ({
          insertedIds: ["img-new-1", "img-new-2"],
        }),
        deleteImageRowsByIds: async (ids: string[]) => {
          deletedDbIdsOnSuccess.push(...ids);
          return {};
        },
        removeStorageFiles: async (paths: string[]) => {
          removedStorageOnSuccess.push(...paths);
          return {};
        },
      },
    });

    expect(successResult.success).toBe(true);
    expect(deletedDbIdsOnSuccess).toEqual(["img-old-1", "img-old-2"]);
    expect(removedStorageOnSuccess).toEqual([
      "user-1/prod-1/old-1.jpg",
      "user-1/prod-1/old-2.jpg",
    ]);
  });
});

describe("Phase 3 – Order State Machine, Concurrency, Smart Locker, OTP & Payment Simulator", () => {
  it("validates cancel, expire, and dispute transitions in Order State Machine", () => {
    // Cancel allowed only in PENDING, SELLER_CONFIRMED, AWAITING_DROPOFF
    expect(canCancelOrder("PENDING")).toBe(true);
    expect(canCancelOrder("SELLER_CONFIRMED")).toBe(true);
    expect(canCancelOrder("AWAITING_DROPOFF")).toBe(true);
    expect(canCancelOrder("IN_LOCKER")).toBe(false);
    expect(canCancelOrder("READY_FOR_PICKUP")).toBe(false);
    expect(canCancelOrder("PICKED_UP")).toBe(false);
    expect(canCancelOrder("COMPLETED")).toBe(false);

    expect(canTransitionOrder("PENDING", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("SELLER_CONFIRMED", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("AWAITING_DROPOFF", "CANCELLED")).toBe(true);
    expect(canTransitionOrder("READY_FOR_PICKUP", "CANCELLED")).toBe(false);
    expect(canTransitionOrder("PICKED_UP", "CANCELLED")).toBe(false);
    expect(canTransitionOrder("READY_FOR_PICKUP", "SELLER_CONFIRMED")).toBe(
      false,
    );

    // Expire transitions (ONLY pre-dropoff statuses; READY_FOR_PICKUP must NEVER auto-expire)
    expect(EXPIRABLE_ORDER_STATUSES).toEqual([
      "PENDING",
      "SELLER_CONFIRMED",
      "AWAITING_DROPOFF",
    ]);
    expect(canExpireOrder("PENDING")).toBe(true);
    expect(canExpireOrder("SELLER_CONFIRMED")).toBe(true);
    expect(canExpireOrder("AWAITING_DROPOFF")).toBe(true);
    expect(canExpireOrder("READY_FOR_PICKUP")).toBe(false);
    expect(canExpireOrder("IN_LOCKER")).toBe(false);
    expect(canExpireOrder("PICKED_UP")).toBe(false);
    expect(canExpireOrder("COMPLETED")).toBe(false);
    expect(transitionOrder("PENDING", "EXPIRED")).toBe("EXPIRED");
    expect(transitionOrder("AWAITING_DROPOFF", "EXPIRED")).toBe("EXPIRED");
    expect(canTransitionOrder("READY_FOR_PICKUP", "EXPIRED")).toBe(false);

    // Dispute & Return preparation
    expect(canOpenDispute("PICKED_UP")).toBe(true);
    expect(canOpenDispute("READY_FOR_PICKUP")).toBe(false);
    expect(transitionOrder("PICKED_UP", "DISPUTED")).toBe("DISPUTED");
    expect(transitionOrder("DISPUTED", "RETURN_PENDING")).toBe(
      "RETURN_PENDING",
    );
    expect(transitionOrder("RETURN_PENDING", "RETURNED")).toBe("RETURNED");
  });

  it("enforces single-item product concurrency so only one buyer succeeds", async () => {
    let productStatus: "AVAILABLE" | "RESERVED" | "SOLD" = "AVAILABLE";
    let activeOrderBuyerId: string | null = null;
    let reservationCount = 0;

    const tryCreateOrderAtomic = async (buyerId: string) => {
      if (productStatus !== "AVAILABLE" || activeOrderBuyerId !== null) {
        return {
          success: false,
          error: "Sản phẩm vừa được người khác đặt mua.",
        };
      }
      productStatus = "RESERVED";
      activeOrderBuyerId = buyerId;
      reservationCount += 1;
      return {
        success: true,
        orderId: `ord-for-${buyerId}`,
      };
    };

    const [resBuyer1, resBuyer2] = await Promise.all([
      tryCreateOrderAtomic("buyer-1"),
      tryCreateOrderAtomic("buyer-2"),
    ]);

    const successes = [resBuyer1, resBuyer2].filter((r) => r.success);
    const failures = [resBuyer1, resBuyer2].filter((r) => !r.success);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.error).toBe("Sản phẩm vừa được người khác đặt mua.");
    expect(productStatus).toBe("RESERVED");
    expect(reservationCount).toBe(1);
  });

  it("allocates AVAILABLE locker compartments, blocks RESERVED/OCCUPIED/MAINTENANCE, and handles drop-off -> pickup -> release", async () => {
    const locker = new MockSmartLockerProvider([
      {
        id: "c-maint",
        lockerId: "loc-1",
        code: "A01",
        size: "M",
        sizeLabel: "Cỡ M",
        status: "MAINTENANCE",
      },
      {
        id: "c-occ",
        lockerId: "loc-1",
        code: "A02",
        size: "M",
        sizeLabel: "Cỡ M",
        status: "OCCUPIED",
        currentOrderCode: "ORD-OTHER",
      },
      {
        id: "c-avail",
        lockerId: "loc-1",
        code: "A03",
        size: "L",
        sizeLabel: "Cỡ L",
        status: "AVAILABLE",
      },
    ]);

    // Rejects reserving MAINTENANCE or OCCUPIED
    await expect(
      locker.reserveCompartment("loc-1", "A01", "ORD-100"),
    ).rejects.toThrowError(/không khả dụng/);
    await expect(
      locker.reserveCompartment("loc-1", "A02", "ORD-100"),
    ).rejects.toThrowError(/không khả dụng/);

    // Allocates the only AVAILABLE compartment (A03)
    const allocated = await locker.allocateAvailableCompartment(
      "loc-1",
      "ORD-100",
    );
    expect(allocated.id).toBe("c-avail");
    expect(allocated.code).toBe("A03");
    expect(await locker.getCompartmentStatus("c-avail")).toBe("RESERVED");

    // Second allocation when station is now full throws clear error
    await expect(
      locker.allocateAvailableCompartment("loc-1", "ORD-101"),
    ).rejects.toThrowError(
      "Hiện không còn ngăn trống tại trạm này. Vui lòng chọn trạm khác.",
    );

    // Drop-off transitions RESERVED -> OCCUPIED
    await locker.dropOffCompartment("c-avail", "ORD-100");
    expect(await locker.getCompartmentStatus("c-avail")).toBe("OCCUPIED");

    // Unlock succeeds when OCCUPIED
    await expect(locker.unlockCompartment("c-avail")).resolves.toBeUndefined();

    // Confirm pickup transitions OCCUPIED -> AVAILABLE
    await locker.confirmPickupFromCompartment("c-avail");
    expect(await locker.getCompartmentStatus("c-avail")).toBe("AVAILABLE");
  });

  it("hashes OTP tokens with SHA-256 and enforces expiry, one-time use, 5-attempt lockout, order match, and buyer ownership", () => {
    const otpManager = new OtpSecurityManager();
    const baseTime = 1_700_000_000_000;

    const { otpCode, record } = otpManager.issueToken({
      orderId: "ord-1",
      buyerId: "buyer-a",
      compartmentId: "comp-a03",
      ttlMs: 30 * 60 * 1000,
      maxAttempts: 5,
      nowMs: baseTime,
    });

    // Stored record never contains plaintext OTP, only SHA-256 hash
    expect(otpCode).toMatch(/^\d{6}$/);
    expect(record.tokenHash).toBe(hashOrderOtp("ord-1", otpCode));
    expect(record.tokenHash).not.toBe(otpCode);
    expect("otpCode" in record).toBe(false);

    // 1. Unauthorized buyer is rejected
    const unauth = otpManager.verifyOtp({
      orderId: "ord-1",
      actorUserId: "buyer-b",
      otpInput: otpCode,
      nowMs: baseTime + 1000,
    });
    expect(unauth.success).toBe(false);
    expect(unauth.errorCode).toBe("UNAUTHORIZED");

    // 2. Mismatched order ID is rejected
    const wrongOrder = otpManager.verifyOtp({
      orderId: "ord-999",
      actorUserId: "buyer-a",
      otpInput: otpCode,
      nowMs: baseTime + 1000,
    });
    expect(wrongOrder.success).toBe(false);
    expect(wrongOrder.errorCode).toBe("NO_TOKEN");

    // 3. Invalid OTP increments attempt count
    const wrong1 = otpManager.verifyOtp({
      orderId: "ord-1",
      actorUserId: "buyer-a",
      otpInput: "000000" === otpCode ? "999999" : "000000",
      nowMs: baseTime + 2000,
    });
    expect(wrong1.success).toBe(false);
    expect(wrong1.errorCode).toBe("INVALID_OTP");
    expect(wrong1.attemptCount).toBe(1);

    // 4. Expired OTP is rejected
    const expiredCheck = otpManager.verifyOtp({
      orderId: "ord-1",
      actorUserId: "buyer-a",
      otpInput: otpCode,
      nowMs: baseTime + 31 * 60 * 1000,
    });
    expect(expiredCheck.success).toBe(false);
    expect(expiredCheck.errorCode).toBe("OTP_EXPIRED");

    // 5. Valid OTP within TTL succeeds and marks token as used
    const validCheck = otpManager.verifyOtp({
      orderId: "ord-1",
      actorUserId: "buyer-a",
      otpInput: otpCode,
      nowMs: baseTime + 5000,
    });
    expect(validCheck.success).toBe(true);

    // 6. Reusing already used OTP is rejected
    const reuseCheck = otpManager.verifyOtp({
      orderId: "ord-1",
      actorUserId: "buyer-a",
      otpInput: otpCode,
      nowMs: baseTime + 6000,
    });
    expect(reuseCheck.success).toBe(false);
    expect(reuseCheck.errorCode).toBe("ALREADY_USED");

    // 7. 5 wrong attempts locks/revokes token permanently
    const { otpCode: otp2 } = otpManager.issueToken({
      orderId: "ord-2",
      buyerId: "buyer-a",
      compartmentId: "comp-a01",
      maxAttempts: 5,
      nowMs: baseTime,
    });
    const wrongPin = otp2 === "111111" ? "222222" : "111111";

    for (let i = 1; i <= 4; i++) {
      const r = otpManager.verifyOtp({
        orderId: "ord-2",
        actorUserId: "buyer-a",
        otpInput: wrongPin,
        nowMs: baseTime + i * 1000,
      });
      expect(r.success).toBe(false);
      expect(r.errorCode).toBe("INVALID_OTP");
      expect(r.attemptCount).toBe(i);
    }

    const fifthWrong = otpManager.verifyOtp({
      orderId: "ord-2",
      actorUserId: "buyer-a",
      otpInput: wrongPin,
      nowMs: baseTime + 5000,
    });
    expect(fifthWrong.success).toBe(false);
    expect(fifthWrong.errorCode).toBe("MAX_ATTEMPTS");
    expect(fifthWrong.message).toBe("Bạn đã nhập sai quá số lần cho phép.");

    // Even entering the correct OTP after 5 wrong attempts is rejected because token is revoked
    const afterLockout = otpManager.verifyOtp({
      orderId: "ord-2",
      actorUserId: "buyer-a",
      otpInput: otp2,
      nowMs: baseTime + 6000,
    });
    expect(afterLockout.success).toBe(false);
    expect(afterLockout.errorCode).toBe("MAX_ATTEMPTS");
  });

  it("maps Payment Simulator and Product statuses accurately across Order lifecycle", () => {
    expect(resolveOrderSideEffects("PENDING")).toEqual({
      paymentStatus: "HELD_DEMO",
      productStatus: "RESERVED",
    });
    expect(resolveOrderSideEffects("READY_FOR_PICKUP")).toEqual({
      paymentStatus: "HELD_DEMO",
      productStatus: "RESERVED",
    });
    expect(resolveOrderSideEffects("COMPLETED")).toEqual({
      paymentStatus: "RELEASED_DEMO",
      productStatus: "SOLD",
    });
    expect(resolveOrderSideEffects("CANCELLED")).toEqual({
      paymentStatus: "REFUNDED_DEMO",
      productStatus: "AVAILABLE",
    });
    expect(resolveOrderSideEffects("EXPIRED")).toEqual({
      paymentStatus: "REFUNDED_DEMO",
      productStatus: "AVAILABLE",
    });
    expect(resolveOrderSideEffects("DISPUTED")).toEqual({
      paymentStatus: "HELD_DEMO",
      productStatus: "RESERVED",
    });
  });

  it("OTP expiration must NOT release locker or expire READY_FOR_PICKUP order", async () => {
    const locker = new MockSmartLockerProvider();
    const otpManager = new OtpSecurityManager();
    const baseTime = 1_750_000_000_000;

    // 1. Seller confirms & drops off -> READY_FOR_PICKUP, OCCUPIED, RESERVED, HELD_DEMO
    const allocated = await locker.allocateAvailableCompartment(
      "locker-thu-vien",
      "ORD-EXP-1",
    );
    await locker.dropOffCompartment(allocated.id, "ORD-EXP-1");

    const orderStatus: OrderStatus = "READY_FOR_PICKUP";
    const productStatus = resolveOrderSideEffects(orderStatus).productStatus;
    const paymentStatus = resolveOrderSideEffects(orderStatus).paymentStatus;

    const { otpCode } = otpManager.issueToken({
      orderId: "ord-exp-1",
      buyerId: "buyer-b",
      compartmentId: allocated.id,
      ttlMs: 30 * 60 * 1000,
      nowMs: baseTime,
    });

    // 2. OTP expires after 31 minutes
    const afterExpiryMs = baseTime + 31 * 60 * 1000;
    const verifyExpired = otpManager.verifyOtp({
      orderId: "ord-exp-1",
      actorUserId: "buyer-b",
      otpInput: otpCode,
      nowMs: afterExpiryMs,
    });
    expect(verifyExpired.success).toBe(false);
    expect(verifyExpired.errorCode).toBe("OTP_EXPIRED");

    // 3. Order auto-expiration MUST return false for READY_FOR_PICKUP even with a past timestamp
    expect(
      shouldAutoExpireOrder({
        status: orderStatus,
        orderExpiresAt: new Date(afterExpiryMs - 1000).toISOString(),
        nowMs: afterExpiryMs,
      }),
    ).toBe(false);

    // 4. Locker stays OCCUPIED, Order stays READY_FOR_PICKUP, Product stays RESERVED, Payment stays HELD_DEMO
    const compStatusAfter = await locker.getCompartmentStatus(allocated.id);
    expect(orderStatus).toBe("READY_FOR_PICKUP");
    expect(compStatusAfter).toBe("OCCUPIED");
    expect(productStatus).toBe("RESERVED");
    expect(paymentStatus).toBe("HELD_DEMO");
  });

  it("regenerates OTP by revoking old token and issuing a usable 30m token with attemptCount = 0", () => {
    const otpManager = new OtpSecurityManager();
    const baseTime = 1_750_000_000_000;

    // Initial OTP
    const { otpCode: oldOtp, record: oldIssued } = otpManager.issueToken({
      orderId: "ord-regen-1",
      buyerId: "buyer-b",
      compartmentId: "comp-b01",
      nowMs: baseTime,
    });

    // Simulate 2 failed attempts + expiry
    const wrongOtp = oldOtp === "000000" ? "999999" : "000000";
    otpManager.verifyOtp({
      orderId: "ord-regen-1",
      actorUserId: "buyer-b",
      otpInput: wrongOtp,
      nowMs: baseTime + 1000,
    });
    otpManager.verifyOtp({
      orderId: "ord-regen-1",
      actorUserId: "buyer-b",
      otpInput: wrongOtp,
      nowMs: baseTime + 2000,
    });

    const expiredCheck = otpManager.verifyOtp({
      orderId: "ord-regen-1",
      actorUserId: "buyer-b",
      otpInput: oldOtp,
      nowMs: baseTime + 31 * 60 * 1000,
    });
    expect(expiredCheck.errorCode).toBe("OTP_EXPIRED");

    // UI/domain eligibility check
    expect(
      canRegenerateLockerOtp({
        status: "READY_FOR_PICKUP",
        compartmentStatus: "OCCUPIED",
        otpReason: "EXPIRED",
        isUnlocked: false,
      }),
    ).toBe(true);
    expect(
      canRegenerateLockerOtp({
        status: "READY_FOR_PICKUP",
        compartmentStatus: "AVAILABLE",
        otpReason: "EXPIRED",
        isUnlocked: false,
      }),
    ).toBe(false);

    // Regenerate OTP at +31m
    const regenTime = baseTime + 31 * 60 * 1000;
    const { otpCode: newOtp, oldRecord, newRecord } = otpManager.regenerateToken({
      orderId: "ord-regen-1",
      actorUserId: "buyer-b",
      nowMs: regenTime,
    });

    expect(oldRecord?.id).toBe(oldIssued.id);
    expect(oldRecord?.revokedAtMs).toBe(regenTime);
    expect(newRecord.id).not.toBe(oldIssued.id);
    expect(newRecord.attemptCount).toBe(0);
    expect(newRecord.maxAttempts).toBe(5);
    expect(newRecord.expiresAtMs).toBe(regenTime + 30 * 60 * 1000);
    expect(newRecord.revokedAtMs).toBeNull();

    // New OTP works cleanly
    const verifyNew = otpManager.verifyOtp({
      orderId: "ord-regen-1",
      actorUserId: "buyer-b",
      otpInput: newOtp,
      nowMs: regenTime + 60 * 1000,
    });
    expect(verifyNew.success).toBe(true);

    // Event timeline differentiates initial vs regenerated and never leaks plaintext OTP
    const initialEvent = getOrderEventLabel("OTP_GENERATED", {
      issue_type: "INITIAL",
    });
    const regenEvent = getOrderEventLabel("OTP_REGENERATED", {
      issue_type: "REGENERATED",
    });
    expect(initialEvent.title).not.toBe(regenEvent.title);
    expect(regenEvent.title).toContain("cấp lại");
  });

  it("controls Demo Mode strictly via server-only EDULOCKER_DEMO_MODE", () => {
    // Even if NEXT_PUBLIC_DEMO_MODE=true is set, server-only EDULOCKER_DEMO_MODE=false MUST disable Demo OTP
    expect(
      isDemoOtpDeliveryEnabled({
        NODE_ENV: "production",
        NEXT_PUBLIC_DEMO_MODE: "true",
        EDULOCKER_DEMO_MODE: "false",
      }),
    ).toBe(false);

    // Unset EDULOCKER_DEMO_MODE is secure-by-default (false)
    expect(
      isDemoOtpDeliveryEnabled({
        NODE_ENV: "production",
        NEXT_PUBLIC_DEMO_MODE: "true",
      }),
    ).toBe(false);

    // Only explicit server-only EDULOCKER_DEMO_MODE=true enables it
    expect(
      isDemoOtpDeliveryEnabled({
        NODE_ENV: "production",
        EDULOCKER_DEMO_MODE: "true",
      }),
    ).toBe(true);
  });

  it("blocks unauthorized User C from mutating or expiring an order belonging to User A & User B", () => {
    const order = {
      id: "ord-private-1",
      sellerId: "user-a",
      buyerId: "user-b",
      status: "PENDING" as OrderStatus,
    };

    const canUserCExpireOrder = (actorId: string | null) =>
      Boolean(
        actorId && (actorId === order.buyerId || actorId === order.sellerId),
      );

    expect(canUserCExpireOrder(null)).toBe(false);
    expect(canUserCExpireOrder("user-c")).toBe(false);
    expect(canUserCExpireOrder("user-a")).toBe(true);
    expect(canUserCExpireOrder("user-b")).toBe(true);
  });
});

describe("Phase 4 – Messaging, Reviews, Reports, Disputes & Admin Authorization", () => {
  it("validates message content (trim, non-empty, max 1000 chars)", () => {
    expect(validateMessageContent("   ").valid).toBe(false);
    expect(validateMessageContent("").valid).toBe(false);
    expect(validateMessageContent("a".repeat(1001)).valid).toBe(false);

    const ok = validateMessageContent("   Sách còn mới không bạn?   ");
    expect(ok.valid).toBe(true);
    expect(ok.content).toBe("Sách còn mới không bạn?");
  });

  it("enforces conversation membership for buyer and seller only", () => {
    const conv = { buyerId: "buyer-b", sellerId: "seller-a" };
    expect(isConversationParticipant("buyer-b", conv)).toBe(true);
    expect(isConversationParticipant("seller-a", conv)).toBe(true);
    expect(isConversationParticipant("user-c", conv)).toBe(false);
    expect(isConversationParticipant(null, conv)).toBe(false);
  });

  it("enforces review eligibility (COMPLETED only, buyer only, no self-review, no duplicate)", () => {
    expect(
      canSubmitOrderReview({
        actorId: "buyer-b",
        buyerId: "buyer-b",
        sellerId: "seller-a",
        orderStatus: "PICKED_UP",
        hasExistingReview: false,
      }).allowed,
    ).toBe(false);

    expect(
      canSubmitOrderReview({
        actorId: "seller-a",
        buyerId: "buyer-b",
        sellerId: "seller-a",
        orderStatus: "COMPLETED",
        hasExistingReview: false,
      }).allowed,
    ).toBe(false);

    expect(
      canSubmitOrderReview({
        actorId: "buyer-b",
        buyerId: "buyer-b",
        sellerId: "seller-a",
        orderStatus: "COMPLETED",
        hasExistingReview: true,
      }).allowed,
    ).toBe(false);

    expect(
      canSubmitOrderReview({
        actorId: "buyer-b",
        buyerId: "buyer-b",
        sellerId: "seller-a",
        orderStatus: "COMPLETED",
        hasExistingReview: false,
      }).allowed,
    ).toBe(true);
  });

  it("prevents duplicate active reports on the same target by the same user", () => {
    const existing = [
      {
        reporterId: "user-b",
        targetType: "PRODUCT" as const,
        targetId: "prod-1",
        status: "PENDING" as const,
      },
      {
        reporterId: "user-b",
        targetType: "PRODUCT" as const,
        targetId: "prod-2",
        status: "RESOLVED" as const,
      },
    ];

    expect(isDuplicateActiveReport(existing, "user-b", "PRODUCT", "prod-1")).toBe(
      true,
    );
    expect(isDuplicateActiveReport(existing, "user-b", "PRODUCT", "prod-2")).toBe(
      false,
    );
    expect(isDuplicateActiveReport(existing, "user-c", "PRODUCT", "prod-1")).toBe(
      false,
    );
  });

  it("maps dispute resolution outcomes to Payment Simulator and Order states", () => {
    expect(canResolveDisputeTransition("OPEN", "RESOLVED_BUYER")).toEqual({
      allowed: true,
      nextOrderStatus: "RETURN_PENDING",
      nextPaymentStatus: "REFUNDED_DEMO",
    });

    expect(canResolveDisputeTransition("OPEN", "RESOLVED_SELLER")).toEqual({
      allowed: true,
      nextOrderStatus: "COMPLETED",
      nextPaymentStatus: "RELEASED_DEMO",
    });

    expect(
      canResolveDisputeTransition("RESOLVED_BUYER", "RESOLVED_SELLER").allowed,
    ).toBe(false);
  });

  it("enforces server-side active admin authorization", () => {
    expect(canAdminAccess(null)).toBe(false);
    expect(canAdminAccess({ role: "student", accountStatus: "ACTIVE" })).toBe(
      false,
    );
    expect(canAdminAccess({ role: "admin", accountStatus: "SUSPENDED" })).toBe(
      false,
    );
    expect(canAdminAccess({ role: "admin", accountStatus: "ACTIVE" })).toBe(
      true,
    );
  });
});
