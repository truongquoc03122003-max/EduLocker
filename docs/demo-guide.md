# Hướng Dẫn Trình Diễn (Demo Guide) – EduLocker MVP

## 1. Chuẩn Bị Tài Khoản Thử Nghiệm (Không Lưu Mật Khẩu Vào Git)

1. **Tài khoản Người bán (User A) & Người mua (User B):** Đăng ký trực tiếp qua `/register` trên giao diện web (hoặc tạo qua Supabase Dashboard → Authentication → Users).
2. **Tài khoản Quản trị viên (Admin D):**
   - Tạo user mới qua Supabase Dashboard hoặc `/register`.
   - Cấp quyền `admin` an toàn bằng SQL trong **Supabase SQL Editor** (tuyệt đối không commit email/password thật vào mã nguồn):

```sql
do $$
begin
  perform set_config('edulocker.trusted_auth_sync', 'true', true);
  update public.profiles
  set role = 'admin', account_status = 'ACTIVE'
  where id = '<UUID_CUA_TAI_KHOAN_ADMIN>';
end;
$$;
```

3. **Bật Demo OTP cho buổi thuyết trình (nếu cần hiện hộp OTP Demo):**
   - Đặt `EDULOCKER_DEMO_MODE=true` trong `.env.local` (server-only).
   - Chạy trong Supabase SQL Editor: `update public.app_runtime_settings set bool_value = true where key = 'demo_mode';`.

---

## 2. DEMO 5–7 PHÚT (Kịch Bản Thuyết Trình Đề Xuất)

1. **Trang chủ (`/`) & Marketplace (`/products`):** Giới thiệu bài toán sinh viên CTU, thương hiệu EduLocker, 9 danh mục và bộ lọc phụ thuộc **Trường → Khoa/Ngành → Môn học → Khóa**.
2. **Chi tiết sản phẩm (`/products/[id]`):** Chỉ rõ độ mới (%), trạm Smart Locker đề xuất, nút **Nhắn người bán** và **Báo cáo sản phẩm**.
3. **Đăng nhập (`/login`):** Đăng nhập bằng tài khoản **Người mua (User B)**.
4. **Đặt mua & Payment Simulator (`/checkout/[productId]`):** Chọn trạm Smart Locker và nhấn xác nhận → Đơn chuyển `PENDING`, sản phẩm thành `RESERVED`, thanh toán mô phỏng ở trạng thái `HELD_DEMO`.
5. **Người bán xác nhận & Gửi tủ (`/orders/[id]`):** Chuyển sang **Người bán (User A)** → bấm **Xác nhận đơn & Giữ ngăn tủ** (`AWAITING_DROPOFF`, ngăn tủ chuyển `RESERVED`) → bấm **Mô phỏng đã gửi hàng vào ngăn tủ** (`READY_FOR_PICKUP`, ngăn tủ chuyển `OCCUPIED`, sinh OTP SHA-256).
6. **Smart Locker Simulator & OTP (`/lockers/[locationId]`):** Quay lại **Người mua (User B)**, lấy mã OTP 6 số trong hộp Demo OTP → mở `/lockers/[locationId]` → nhập OTP mở cửa ngăn tủ (`OPEN`) → bấm **Xác nhận đã lấy hàng** (`PICKED_UP`, ngăn tủ giải phóng về `AVAILABLE`).
7. **Hoàn tất & Đánh giá (`/orders/[id]`):** Người mua bấm **Đã nhận hàng đúng mô tả** → Đơn chuyển `COMPLETED`, sản phẩm thành `SOLD`, thanh toán mô phỏng giải ngân `RELEASED_DEMO` → gửi **Đánh giá người bán** (cập nhật `rating_avg` & `rating_count`).
8. **Chat Realtime (`/messages`):** Mở cuộc trò chuyện gắn thẻ sản phẩm giữa User B và User A, gửi tin nhắn qua lại và quan sát thông báo (`/notifications`).
9. **Admin Dashboard (`/admin`):** Đăng nhập **Admin D** → xem KPI tổng quan, quản lý Smart Locker, xử lý Reports/Disputes và xem thống kê **Số sản phẩm đã được tái sử dụng** (`COMPLETED`).

---

## 3. Demo Failure Recovery (Dự Phòng Khi Mạng Chập Chờn)

- **Nếu mạng mất kết nối Supabase khi đang trình diễn giao diện công khai:** Hệ thống tự động fallback sang `Typed Mock Data` trên `/`, `/products`, `/products/[id]`, `/lockers` để vẫn thuyết trình được giao diện và bộ lọc học thuật.
- **Nếu cần nhảy nhanh vào bước Mở Tủ hoặc Hoàn Tất:** Chuẩn bị sẵn 1 đơn hàng ở trạng thái `READY_FOR_PICKUP` (để demo nhập OTP mở tủ ngay) và 1 đơn ở trạng thái `COMPLETED` (để demo màn hình đánh giá & thống kê).
- **Nếu OTP hết hạn sau 30 phút trong lúc chờ thuyết trình:** Người mua bấm nút **Tạo mã OTP mới** ngay trên `/orders/[id]` — ngăn tủ vẫn giữ nguyên trạng thái `OCCUPIED` và sản phẩm vẫn nằm an toàn trong tủ.
