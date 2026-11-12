# Bảo Mật Hệ Thống EduLocker (Security Documentation)

Tài liệu này tổng hợp các lớp bảo vệ đang được áp dụng trong mã nguồn và cơ sở dữ liệu PostgreSQL của EduLocker (Phase 1–4).

## 1. Xác Thực & Bảo Vệ Route (`Auth & Middleware`)
- Sử dụng `@supabase/ssr` (cookie-based SSR session) với `supabase.auth.getUser()` ở tầng Server Component, Server Action và `middleware.ts`.
- Các route yêu cầu đăng nhập (`/sell`, `/profile`, `/my-products`, `/products/[id]/edit`, `/checkout`, `/orders`, `/messages`, `/notifications`, `/admin`) tự động chuyển hướng về `/login?next=...` nếu chưa xác thực.
- `sanitizeRedirectPath` chặn lỗ hổng Open Redirect (chỉ cho phép đường dẫn tương đối nội bộ).

## 2. Quyền Riêng Tư Hồ Sơ (`Profiles Privacy`)
- Bảng công khai `public.profiles` **không lưu cột `email`**.
- Email tài khoản chỉ được đọc riêng tư cho chính chủ thông qua `supabase.auth.getUser()`.
- Trigger `protect_profile_privileged_fields` chặn mọi thao tác `INSERT/UPDATE` từ client cố tình sửa `role`, `account_status`, `campus_verified`, `email_verified`, `rating_avg`, `rating_count`, `completed_transactions`, `eco_points`.

## 3. Quyền Sở Hữu Sản Phẩm & Storage
- Chỉ chủ sở hữu (`seller_id = auth.uid()`) được sửa, ẩn/hiện hoặc xóa sản phẩm (kiểm tra kép ở Server Action và RLS).
- Upload ảnh kiểm tra chữ ký nhị phân (magic bytes) cho JPG/PNG/WEBP (≤ 5MB) và xác thực đường dẫn `{user_id}/{product_id}/{filename}` ngay trong Storage RLS policy.
- Trigger `protect_product_order_lock` chặn sửa tay trạng thái `RESERVED` / `SOLD` ngoài các RPC giao dịch.

## 4. Giao Dịch, Smart Locker & Bảo Mật OTP
- **Concurrency:** Partial Unique Index `idx_orders_one_active_per_product` và khóa hàng `SELECT ... FOR UPDATE` ngăn 2 người mua đặt cùng một sản phẩm.
- **OTP Hashing:** Không lưu mã OTP dạng rõ trong DB; chỉ lưu `token_hash` (SHA-256 hex). Bảng `locker_access_tokens` **không có policy SELECT nào cho client**.
- **Tách OTP Expiry & Order Expiry:** Mã OTP hết hạn (30 phút) hoặc sai 5 lần chỉ thu hồi token OTP, tuyệt đối không tự giải phóng ngăn tủ đang `OCCUPIED` hoặc sản phẩm đang `RESERVED`.
- **Demo OTP Control:** Bảo vệ kép ở tầng Server (`EDULOCKER_DEMO_MODE`, không có prefix `NEXT_PUBLIC_`) và tầng Database (`public.app_runtime_settings.demo_mode`).
- **RPC Privileges:** Đã `REVOKE ALL ... FROM PUBLIC, anon` trên toàn bộ RPC giao dịch và hàm nội bộ; `rpc_expire_order_if_needed` chỉ cho phép `buyer_id` hoặc `seller_id` của đơn gọi.

## 5. Messaging, Reviews, Notifications, Reports & Admin
- **Messages & Conversations:** Chỉ `buyer_id` hoặc `seller_id` của `conversations` được xem/gửi tin nhắn; nội dung trim và giới hạn 1–1000 ký tự, không render HTML thô.
- **Reviews:** Chỉ `buyer_id` của đơn `COMPLETED` được đánh giá 1 lần duy nhất (`UNIQUE(order_id)`). `rating_avg` và `rating_count` được tính tự động phía DB (`recalculate_seller_rating`).
- **Notifications:** Chỉ chủ sở hữu (`user_id = auth.uid()`) được xem và đánh dấu đã đọc; mọi thông báo đều sinh từ DB triggers/RPCs (`SECURITY DEFINER`).
- **Reports & Disputes:** Partial Unique Index chống gửi trùng report đang mở; phân xử khiếu nại chỉ do Admin thực hiện.
- **Admin Authorization:** Kiểm tra server-side (`requireActiveAdmin`) và database-side (`public.is_admin()`) trên cả `role = 'admin'` và `account_status = 'ACTIVE'`. Tuyệt đối không đưa `SUPABASE_SERVICE_ROLE_KEY` ra trình duyệt.

## 6. Payment Simulator
- Hệ thống chỉ ghi nhận trạng thái mô phỏng (`HELD_DEMO`, `RELEASED_DEMO`, `REFUNDED_DEMO`) trong bảng `payment_records`, không lưu thông tin thẻ ngân hàng và không xử lý giao dịch tài chính thật.

