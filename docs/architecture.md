# Kiến Trúc Hệ Thống EduLocker (System Architecture – Final Phase 4)

## 1. Mục Tiêu Kiến Trúc

- **Modular Monolith trên Next.js `15.5.29` App Router (TypeScript `strict: true`):** Tối ưu vận hành trên Windows và triển khai gọn nhẹ cho giai đoạn MVP.
- **Bảo mật Defense-in-Depth:** Kết hợp `@supabase/ssr` (cookie-based session), Next.js Middleware bảo vệ route, Server Actions kiểm tra quyền sở hữu/admin (`requireActiveAdmin`), PostgreSQL **Row Level Security (RLS)** và các hàm `SECURITY DEFINER` RPC nguyên tử.
- **Phân tách rõ Implemented / Simulated / Future IoT:**
  - **Implemented (Real DB-Backed):** Auth, Profiles, Products, Favorites, Orders, Conversations, Messages (Realtime), Reviews, Notifications, Reports, Disputes, Admin Console & Statistics.
  - **Simulated:** Smart Locker Hardware (`/lockers/[locationId]`), Demo OTP Channel (`EDULOCKER_DEMO_MODE` + `app_runtime_settings.demo_mode`), Payment Simulator (`HELD_DEMO` / `RELEASED_DEMO` / `REFUNDED_DEMO`).
  - **Định hướng phát triển (Future IoT / Phase 5+):** Phần cứng ESP32, cảm biến cửa ngăn tủ, đầu đọc QR/RFID vật lý, cổng thanh toán thật, CTU SSO.

---

## 2. Cấu Trúc Thư Mục Thực Tế (`CURRENT PHASE 4 STRUCTURE`)

```text
supabase/
  migrations/
    20261112000001_phase2_schema_and_rls.sql
    20261112000002_phase2_security_hardening.sql
    20261112000003_phase3_orders_lockers_otp_payment.sql
    20261112000004_phase3_critical_hardening.sql
    20261112000005_phase4_messaging_reviews_notifications_reports_disputes_admin.sql
  seed.sql

e2e/
  edulocker-core.spec.ts        # Playwright E2E Core Flows

src/
  middleware.ts                 # Làm mới session & bảo vệ /sell, /profile, /my-products, /checkout, /orders, /messages, /notifications, /admin
  app/
    admin/                      # Khu vực Quản trị (server-side requireActiveAdmin + 403 guard)
      page.tsx                  # Tổng quan KPI
      users/page.tsx            # Quản lý người dùng (ACTIVE / SUSPENDED)
      products/page.tsx         # Điều tiết sản phẩm (HIDE / RESTORE)
      orders/page.tsx           # Giám sát đơn hàng & Payment Simulator
      lockers/page.tsx          # Bảo trì ngăn tủ (AVAILABLE <-> MAINTENANCE)
      reports/page.tsx          # Xử lý báo cáo vi phạm
      disputes/page.tsx         # Phân xử khiếu nại (RESOLVED_BUYER / RESOLVED_SELLER)
      reviews/page.tsx          # Ẩn/hiện đánh giá vi phạm
      statistics/page.tsx       # Thống kê & Kinh tế tuần hoàn
    auth/callback/route.ts      # PKCE Code Exchange
    checkout/[productId]/page.tsx
    favorites/page.tsx
    forgot-password/page.tsx
    lockers/
      page.tsx
      [locationId]/page.tsx     # Smart Locker Simulator tương tác OTP 6 số
    login/page.tsx
    messages/
      page.tsx                  # Danh sách hội thoại & khung chat
      [conversationId]/page.tsx # Chi tiết cuộc trò chuyện Realtime
    my-products/page.tsx
    notifications/page.tsx      # Trung tâm thông báo (unread / mark read)
    orders/
      page.tsx
      [id]/page.tsx             # Chi tiết đơn hàng, OTP Demo, Hủy, Khiếu nại, Đánh giá người bán
    products/
      page.tsx
      [id]/page.tsx
      [id]/edit/page.tsx
    profile/
      page.tsx                  # Hồ sơ cá nhân
      [id]/page.tsx             # Hồ sơ công khai người bán (không email) + Đánh giá + Báo cáo
    register/page.tsx
    sell/page.tsx
    update-password/page.tsx
  features/
    admin/                      # admin-repository.ts, admin-actions.ts
    auth/                       # auth-service.ts, actions.ts
    lockers/                    # smart-locker-provider.ts
    marketplace/                # product-repository.ts, product-actions.ts, product-service.ts, __tests__/
    messages/                   # message-repository.ts, message-actions.ts
    notifications/              # notification-repository.ts, notification-actions.ts
    orders/                     # order-repository.ts, order-actions.ts, order-state-machine.ts
    reports/                    # report-actions.ts
    reviews/                    # review-actions.ts
```
