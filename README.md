# EduLocker – Gửi An Tâm, Nhận Tiết Kiệm

<p align="center">
  <img src="public/logo-edulocker.png" alt="EduLocker" width="180" />
</p>

> **Nền tảng thương mại trao đổi đồ dùng cho sinh viên kết hợp hệ thống Smart Locker nội khu Campus (MVP Demo)**  
> **Định hướng triển khai MVP:** Đại học Cần Thơ (CTU)  
> **Học phần:** KN002E – Đổi mới sáng tạo và Khởi nghiệp (Nhóm 8)

---

## 1. Giới Thiệu Dự Án

**EduLocker** hướng tới giải quyết bài toán trao đổi giáo trình, máy tính cầm tay, dụng cụ học tập, linh kiện điện tử và đồ dùng ký túc xá (KTX) có giá trị vừa và nhỏ (30.000đ – 400.000đ) trong cộng đồng sinh viên đại học:

- **So với các hội nhóm mạng xã hội (Facebook/Zalo):** Giảm rủi ro mất tiền cọc, hạn chế tình trạng tin đăng bị trôi hoặc bất tiện phải hẹn gặp trực tiếp ở cổng trường khi lệch lịch học.
- **So với các sàn TMĐT đại trà (Shopee/TikTok Shop):** Không qua shipper trung gian liên tỉnh — người bán gửi sản phẩm vào trạm **Smart Locker (Simulator)** đề xuất tại **Ký túc xá A** hoặc **Trung tâm Học liệu (Thư viện)**, người mua đến nhận theo giờ hoạt động dự kiến của từng trạm bằng mã xác thực OTP 6 chữ số.

### Hệ giá trị cốt lõi `T.R.U.S.T`

- **T – Transparency (Minh bạch):** Khai báo rõ độ mới sản phẩm (%), lịch sử giao dịch và đánh giá thực tế từ giao dịch đã hoàn tất.
- **R – Resourcefulness (Tiết kiệm):** Giúp sinh viên tiết kiệm chi phí giáo trình và đồ dùng học tập.
- **U – User-Centric (Lấy sinh viên làm trung tâm):** Tìm kiếm và lọc phụ thuộc theo **Trường → Khoa/Ngành → Môn học → Khóa**.
- **S – Sustainability (Bền vững):** Thúc đẩy kinh tế tuần hoàn trong trường đại học (_Cho đồ cũ một vòng đời mới_).
- **T – Technology-Driven (Công nghệ):** Ứng dụng mô hình Smart Locker Simulator (OTP/QR) và phân loại học thuật.

---

## 2. Tính Năng Đã Hoàn Thiện (Phase 1 – Phase 4)

- **Marketplace & Học thuật:** Trang chủ, Khám phá (`/products`), Chi tiết sản phẩm (`/products/[id]`), Lọc phụ thuộc Trường → Khoa/Ngành → Môn học → Khóa, Tìm kiếm, Sắp xếp, Đồng bộ URL.
- **Tài khoản & Hồ sơ:** Đăng ký, Đăng nhập, Quên mật khẩu (`/login`, `/register`, `/forgot-password`, `/update-password`), Hồ sơ cá nhân (`/profile`) & Hồ sơ công khai người bán (`/profile/[id]` không lộ email).
- **Đăng bán & Yêu thích:** Đăng bán (`/sell`), Chỉnh sửa (`/products/[id]/edit`), Quản lý sản phẩm của tôi (`/my-products`), Upload ảnh Supabase Storage (magic-byte check), Lưu yêu thích (`/favorites`, hợp nhất `localStorage` ↔ DB).
- **Giao dịch, Smart Locker Simulator & Payment Simulator:** Đặt mua (`/checkout/[productId]`), Quản lý đơn hàng (`/orders`, `/orders/[id]`), Order State Machine 12 trạng thái, Tạm giữ & giải ngân/hoàn tiền mô phỏng (`HELD_DEMO` / `RELEASED_DEMO` / `REFUNDED_DEMO`), Smart Locker Simulator (`/lockers`, `/lockers/[locationId]`) với OTP SHA-256 (`token_hash`, TTL 30m, tối đa 5 lần thử, hỗ trợ cấp lại OTP mới không giải phóng ngăn tủ khi OTP hết hạn).
- **Tương tác & Quản trị (Phase 4):**
  - Nhắn tin Người mua – Người bán gắn sản phẩm (`/messages`, `/messages/[conversationId]`, Supabase Realtime).
  - Đánh giá người bán sau đơn `COMPLETED` (`reviews` + trigger tính `rating_avg` & `rating_count` phía server).
  - Thông báo (`/notifications` + chuông đếm chưa đọc trên Header).
  - Báo cáo vi phạm (`reports` kèm chống spam trùng lặp) & Giải quyết khiếu nại (`disputes`).
  - Bảng điều khiển Quản trị (`/admin` gồm Tổng quan, Người dùng, Sản phẩm, Đơn hàng, Smart Locker, Reports, Disputes, Reviews, Statistics).

---

## 3. Công Nghệ & Kiến Trúc

- **Framework:** Next.js `15.5.29` (App Router, TypeScript `strict: true`)
- **Backend, Auth & Realtime:** Supabase PostgreSQL (RLS + Atomic `SECURITY DEFINER` RPCs), `@supabase/ssr`, Supabase Storage (`product-images`), Supabase Realtime
- **UI & Styling:** Tailwind CSS v3 + Radix UI + Lucide Icons + `Be Vietnam Pro`
- **Validation & Security:** Zod + Magic-byte image verification + Open-redirect sanitization + SHA-256 OTP Hashing + Server-only `EDULOCKER_DEMO_MODE` + DB `app_runtime_settings`
- **Testing:** Vitest (Unit) + Playwright (E2E)

---

## 4. Cài Đặt, Supabase & Chạy Dự Án

### Yêu cầu môi trường
- Node.js `>= 20.x`, npm `>= 10.x`

### Bước 1: Cài đặt & Cấu hình `.env.local`

```bash
npm install
copy .env.example .env.local
```

Biến môi trường trong `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
# Chỉ dùng phía Server (KHÔNG có prefix NEXT_PUBLIC_):
EDULOCKER_DEMO_MODE=true
```

### Bước 2: Chạy Migrations & Seed trên Supabase SQL Editor

Chạy lần lượt các file theo đúng thứ tự:

1. `supabase/migrations/20261112000001_phase2_schema_and_rls.sql`
2. `supabase/migrations/20261112000002_phase2_security_hardening.sql`
3. `supabase/migrations/20261112000003_phase3_orders_lockers_otp_payment.sql`
4. `supabase/migrations/20261112000004_phase3_critical_hardening.sql`
5. `supabase/migrations/20261112000005_phase4_messaging_reviews_notifications_reports_disputes_admin.sql`
6. `supabase/seed.sql`

> Nếu trình diễn tính năng Demo OTP ở môi trường demo, bật cờ DB trong SQL Editor:  
> `update public.app_runtime_settings set bool_value = true where key = 'demo_mode';`

### Bước 3: Chạy Dev, Kiểm tra & Build

```bash
npm run dev
npm run typecheck
npm run lint
npm run test
npm run build
npm run test:e2e
```

### Tài khoản Demo & Admin
- Không lưu hay commit mật khẩu vào Git. Xem hướng dẫn tạo tài khoản thử nghiệm (Seller, Buyer, Admin) trong [docs/demo-guide.md](docs/demo-guide.md).

---

## 5. Minh Bạch Hệ Thống (Transparency)

| Thành phần | Trạng thái | Ghi chú |
| :--- | :--- | :--- |
| **Auth, Profiles, Products, Favorites, Orders, Messages, Reviews, Notifications, Reports, Disputes, Admin** | **Real Database-Backed** | Dữ liệu thật lưu trữ trên Supabase PostgreSQL & Storage với RLS + Atomic RPCs |
| **Smart Locker Hardware** | **Simulated (Simulator)** | Mô phỏng trạng thái ngăn tủ và thao tác mở khóa bằng OTP trên web (`/lockers/[locationId]`), chưa kết nối ESP32/phần cứng thật |
| **OTP Delivery Channel (Demo Box)** | **Simulated (Demo Only)** | Kiểm soát kép bởi `EDULOCKER_DEMO_MODE` (server) và `app_runtime_settings.demo_mode` (DB) |
| **Payment** | **Payment Simulator** | Trạng thái `HELD_DEMO` / `RELEASED_DEMO` / `REFUNDED_DEMO`; không xử lý tiền thật |
| **CTU Official SSO / Campus Deployment** | **Not Implemented (Định hướng phát triển)** | Chưa tích hợp SSO chính thức của ĐH Cần Thơ; không phải dịch vụ chính thức của nhà trường |
