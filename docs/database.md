# Thiết Kế Cơ Sở Dữ Liệu EduLocker (Database Documentation – Final Phase 4)

Hệ thống cơ sở dữ liệu gồm **22 bảng** (Phase 2: 10 bảng, Phase 3: 5 bảng + 1 bảng runtime settings, Phase 4: 6 bảng), toàn bộ đều bật **Row Level Security (RLS)** và kiểm soát ghi nhạy cảm qua các hàm **PostgreSQL `SECURITY DEFINER` RPCs**.

---

## 1. Tổng Hợp Các Bảng Theo Phase

### Phase 2 – Danh mục, Hồ sơ, Sản phẩm & Yêu thích
1. **`universities`**, **`majors`**, **`courses`**, **`categories`**, **`locker_locations`**, **`locker_compartments`**: Bảng tham chiếu công khai (chặn client ghi).
2. **`profiles`**: Hồ sơ công khai sinh viên (liên kết `auth.users(id)`, **không lưu `email`**; bảo vệ `role`, `account_status`, `campus_verified`, `email_verified`, `rating_avg`, `rating_count`, `completed_transactions`, `eco_points` bằng trigger `protect_profile_privileged_fields`).
3. **`products`**, **`product_images`**: Sản phẩm & ảnh Storage (trigger `validate_product_academic_integrity`, trigger `protect_product_order_lock`).
4. **`favorites`**: `UNIQUE(user_id, product_id)`.

### Phase 3 – Đơn hàng, Smart Locker, OTP & Payment Simulator
5. **`orders`**: Đơn hàng 12 trạng thái (`idx_orders_one_active_per_product` chống 2 người mua đặt trùng 1 sản phẩm).
6. **`order_events`**: Nhật ký sự kiện đơn hàng (tự động kích hoạt trigger `trg_notify_on_order_event` sinh thông báo).
7. **`locker_reservations`**: Đặt chỗ ngăn tủ (`idx_locker_reservations_one_active_per_comp`).
8. **`locker_access_tokens`**: Lưu SHA-256 `token_hash` (TTL 30m, `max_attempts = 5`). **Không có policy SELECT nào cho client**.
9. **`payment_records`**: Bản ghi thanh toán mô phỏng (`HELD_DEMO`, `RELEASED_DEMO`, `REFUNDED_DEMO`).
10. **`app_runtime_settings`**: Cờ cấu hình phía DB (`demo_mode`), revoke hoàn toàn quyền truy cập từ `public/anon/authenticated`.

### Phase 4 – Messaging, Reviews, Notifications, Reports & Disputes
11. **`conversations`**: `UNIQUE(product_id, buyer_id, seller_id)`, `CHECK(buyer_id <> seller_id)`. RLS: chỉ `buyer_id` hoặc `seller_id` đọc.
12. **`messages`**: Tin nhắn văn bản (`1..1000` ký tự), bật Supabase Realtime. RLS: chỉ thành viên cuộc trò chuyện đọc.
13. **`reviews`**: Đánh giá 1–5 sao (`UNIQUE(order_id)`), `CHECK(reviewer_id <> reviewee_id)`. RLS: công khai các đánh giá chưa bị ẩn (`is_hidden = false`).
14. **`notifications`**: 12 loại thông báo (`ORDER_CREATED` … `REPORT_STATUS_CHANGED`), tạo tự động phía server/DB. RLS: chỉ `user_id = auth.uid()` đọc và đánh dấu đã đọc.
15. **`reports`**: Báo cáo `PRODUCT` / `USER` / `MESSAGE`, Partial Unique Index `idx_reports_unique_active` chống spam báo cáo trùng lặp khi đang `PENDING`/`REVIEWING`.
16. **`disputes`**: Khiếu nại gắn `UNIQUE(order_id)` với trạng thái `OPEN`, `UNDER_REVIEW`, `RESOLVED_BUYER`, `RESOLVED_SELLER`, `CLOSED`.

---

## 2. Indexes & Ràng Buộc Chính
- `idx_orders_buyer_id`, `idx_orders_seller_id`, `idx_orders_status`, `idx_orders_one_active_per_product`
- `idx_locker_reservations_one_active_per_comp`, `idx_locker_access_tokens_order_id`
- `idx_conversations_buyer_last`, `idx_conversations_seller_last`, `idx_messages_conversation_created`
- `idx_reviews_reviewee_created`, `idx_notifications_user_unread`
- `idx_reports_unique_active`, `idx_reports_status_created`, `idx_disputes_status_created`

---

## 3. Danh Sách RPCs (`SECURITY DEFINER`, đã `REVOKE ALL FROM PUBLIC, anon`)
- **Phase 3:** `rpc_create_order`, `rpc_seller_confirm_order`, `rpc_seller_dropoff`, `rpc_get_buyer_demo_otp`, `rpc_regenerate_locker_otp`, `rpc_verify_locker_otp`, `rpc_confirm_pickup`, `rpc_complete_order`, `rpc_cancel_order`, `rpc_open_dispute`, `rpc_expire_order_if_needed`.
- **Phase 4:** `rpc_get_or_create_conversation`, `rpc_send_message`, `rpc_mark_conversation_read`, `rpc_submit_review`, `rpc_submit_report`, `rpc_admin_review_report`, `rpc_admin_resolve_dispute`, `rpc_admin_moderate_product`, `rpc_admin_toggle_compartment_maintenance`, `rpc_admin_set_user_status`, `rpc_admin_toggle_review_visibility`.
