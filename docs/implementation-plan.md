# Kế Hoạch Triển Khai Dự Án EduLocker (Implementation Plan)

> **Dự án:** EduLocker – Nền tảng thương mại trao đổi đồ dùng cho sinh viên kết hợp hệ thống tủ Locker thông minh (Smart Locker)  
> **Slogan:** _Gửi An Tâm – Nhận Tiết Kiệm_  
> **Định hướng triển khai MVP:** Đại học Cần Thơ (CTU) – quy mô mục tiêu hơn 46.000 sinh viên  
> **Nguồn tài liệu gốc:** `docs/KN002E04-Nhom08-EduLocker.pdf` (Báo cáo Đổi mới sáng tạo và Khởi nghiệp – Nhóm 8, ĐH Cần Thơ)

---

## 1. Tổng Quan & Bản Chất Dự Án

**Điểm khác biệt cốt lõi của EduLocker:**

- **Marketplace sinh viên chuyên biệt:** Phân loại theo Cây dữ liệu đào tạo (**Trường → Khoa/Ngành → Môn học → Khóa**).
- **Hạ tầng giao nhận bất đồng bộ qua Smart Locker nội khu (Mô hình đề xuất):** Vị trí đề xuất tại sảnh KTX A và Trung tâm Học liệu (Thư viện) ĐH Cần Thơ.
- **Hệ giá trị cốt lõi T.R.U.S.T:** Transparency – Resourcefulness – User-Centric – Sustainability – Technology-Driven.

---

## 2. Công Nghệ Sử Dụng (Technology Stack)

| Tầng                        | Công nghệ                                                | Mục đích                                                         |
| :-------------------------- | :------------------------------------------------------- | :--------------------------------------------------------------- |
| **Framework**               | Next.js `15.5.29` (App Router)                           | SSR/RSC tối ưu hiệu năng, đã cập nhật bản vá bảo mật Next 15     |
| **Ngôn ngữ**                | TypeScript (`strict: true`)                              | An toàn kiểu dữ liệu xuyên suốt từ Database/Domain tới UI        |
| **Backend, Auth & RPCs**    | Supabase PostgreSQL, `@supabase/ssr`, Supabase Storage   | Xác thực SSR bằng cookie, lưu trữ sản phẩm, đơn hàng & RPCs      |
| **Styling & UI Components** | Tailwind CSS v3 + Radix UI + shadcn-style components     | Giao diện hiện đại, hỗ trợ truy cập (`@radix-ui/react-dialog`)   |
| **Validation & Security**   | Zod + Magic Bytes + Safe Redirect + SHA-256 OTP Hashing  | Chống giả mạo tệp tải lên, chống Open Redirect & bảo mật OTP     |
| **Testing**                 | Vitest                                                   | Bộ kiểm thử đơn vị cho Marketplace, State Machine, Locker & OTP  |

---

## 3. Bảng Minh Bạch Trạng Thái Triển Khai (Transparency Matrix – Cập Nhật Sau Phase 3)

| Hạng mục                                    | Trạng thái hiện tại (Sau Phase 3)                                                                       | Ghi chú minh bạch                                                                                                            |
| :------------------------------------------ | :------------------------------------------------------------------------------------------------------ | :--------------------------------------------------------------------------------------------------------------------------- |
| **Marketplace UI / Search / Filter / Sort** | **Code implemented – Kết nối Supabase DB + Mock Fallback**                                              | Đọc sản phẩm `AVAILABLE` thật từ Supabase; tự động fallback sang Typed Mock Data có gắn nhãn minh bạch khi chưa cấu hình/rỗng |
| **Supabase Database & Seed (15 bảng P2+P3)**| **Database migration created – Phase 2 & 3**                                                            | Đã tạo `20261112000001`, `20261112000002`, `20261112000003_phase3_orders_lockers_otp_payment.sql` & `seed.sql`               |
| **Supabase Auth & Protected Routes**        | **Code implemented – Phase 2 & 3**                                                                      | Đã triển khai `/login`, `/register`, `/forgot-password`, `/update-password`, `/auth/callback`, bảo vệ `/sell`, `/profile`, `/my-products`, `/checkout`, `/orders` |
| **RLS Policies & Privilege Protection**     | **Database migration created & Code implemented**                                                       | Xóa `email` khỏi `public.profiles`, khóa trường đặc quyền, chặn đọc `token_hash` và kiểm soát đơn hàng chỉ cho Buyer/Seller  |
| **Profile (`/profile`) & Sell (`/sell`)**   | **Code implemented – Phase 2**                                                                          | Cho phép sửa hồ sơ, đăng bán, chỉnh sửa an toàn (`executeSafeImageReplacement`), xóa DB trước khi xóa Storage (`/my-products`) |
| **Favorites (`/favorites`)**                | **Code implemented – Dual Mode (`localStorage` + Supabase DB)**                                         | Tự động merge và khử trùng lặp danh sách yêu thích khi sinh viên đăng nhập                                                   |
| **Checkout & Quản lý Đơn hàng (`/orders`)** | **Code implemented – Phase 3**                                                                          | Đặt mua sản phẩm (`/checkout/[productId]`), quản lý đơn mua/đơn bán (`/orders`) và chi tiết đơn hàng (`/orders/[id]`)         |
| **Smart Locker Simulator & OTP Flow**       | **Code implemented – Simulator (Phase 3)**                                                              | Phân bổ ngăn tủ tự động, mô phỏng gửi hàng, tạo mã OTP 6 chữ số (SHA-256 `token_hash`, TTL 30m, tối đa 5 lần thử) tại `/lockers/[locationId]` |
| **Payment Simulator**                       | **Code implemented – Simulator (Phase 3)**                                                              | Mô phỏng giữ tiền (`HELD_DEMO`), giải ngân (`RELEASED_DEMO`) và hoàn tiền (`REFUNDED_DEMO`) gắn nhãn minh bạch               |
| **Messaging, Reviews, Notifications, Admin**| **Planned – Phase 4**                                                                                   | Hoàn thiện tương tác sau giao dịch                                                                                           |

---

## 4. Lộ Trình Triển Khai Theo Từng Phase (Synchronized Roadmap)

### **Phase 1: Foundation + Brand System + Marketplace UI (Đã hoàn thành)**
- Thiết lập Next.js 15 App Router, TypeScript, Tailwind CSS v3, `<BrandLogo />`, Marketplace Explorer, Order State Machine và `MockSmartLockerProvider`.

### **Phase 2: Supabase Backend + Authentication + Profile + Sell + Storage + Favorites (Đã hoàn thành)**
- Cập nhật bảo mật `next@15.5.29` và `eslint-config-next@15.5.29`.
- Tích hợp `@supabase/ssr`, `middleware.ts`, SQL Migrations + RLS Policies + Seed data.
- Hoàn thiện `/login`, `/register`, `/forgot-password`, `/update-password`, `/auth/callback`, `/profile`, `/sell`, `/my-products`, `/products/[id]/edit` và đồng bộ `/favorites`.

### **Phase 3: Transaction Flow + Smart Locker + OTP + Payment Simulator (Đã hoàn thành)**
- Xây dựng trang Đặt mua (`/checkout/[productId]`), Danh sách & Chi tiết đơn hàng (`/orders`, `/orders/[id]`).
- Triển khai Smart Locker Simulator tương tác (`/lockers/[locationId]`), bảo mật OTP (SHA-256 `token_hash`, TTL 30 phút, giới hạn 5 lần thử sai), hủy đơn, hết hạn giữ chỗ và khiếu nại cơ bản (`DISPUTED`).

### **Phase 4: Messaging, Reviews, Notifications, Admin & E2E Testing (Planned)**
- Xây dựng trang Tin nhắn (`/messages`), Đánh giá 1–5 sao (`reviews`), Thông báo (`notifications`) và Quản trị (`/admin`).
