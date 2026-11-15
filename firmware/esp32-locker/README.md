# EduLocker ESP32 Smart Locker Bridge

Firmware này thay thế cơ chế prototype cũ đọc/ghi trực tiếp bảng `lockers`.

## Luồng mới

1. Website/Supabase giữ toàn bộ logic đơn hàng và OTP.
2. OTP hợp lệ hoặc seller drop-off tạo một command `OPEN` trong hàng đợi hardware.
3. ESP32 poll `rpc_locker_device_poll` mỗi 2 giây.
4. ESP32 mở servo, sau đó ACK kết quả bằng `rpc_locker_device_ack`.
5. Cửa tự đóng sau thời gian command yêu cầu (mặc định 60 giây).

ESP32 **không nhận plaintext OTP** và **không dùng service-role key**.

## Ghép A01

1. Apply migration `20261115000007_phase5_esp32_hardware_bridge.sql` vào Supabase.
2. Đăng nhập tài khoản admin EduLocker.
3. Mở `/admin/lockers`.
4. Ở ngăn cần ghép, nhập Device ID, ví dụ `EDULOCKER-A01`.
5. Nhấn **Ghép / đổi mã ESP32**.
6. Copy Device Secret vừa hiện ra. Secret chỉ được trả về một lần.
7. Copy `include/secrets.example.h` thành `include/secrets.h`.
8. Điền Wi-Fi, Supabase publishable/anon key, Device ID và Device Secret.
9. Build/upload bằng PlatformIO.
10. Khi ESP32 đã online, nhấn **Test mở tủ** trên trang admin.

## Bảo mật

- `include/secrets.h` đã nằm trong `.gitignore`.
- Không đặt `service_role` key trong firmware.
- Database chỉ lưu SHA-256 của Device Secret.
- Device phải gửi heartbeat gần đây; nếu đã ghép nhưng offline, giao dịch vật lý sẽ bị chặn và transaction rollback để không làm mất OTP.
- Firmware hiện dùng `client.setInsecure()` để tương thích nhanh với prototype/demo. Trước khi triển khai thật cần cấu hình CA certificate và bật kiểm tra TLS.

## Mapping phần cứng từ prototype

- Board: ESP32-S3 DevKitC-1, 16 MB flash / OPI PSRAM
- ST7789: CS 8, DC 9, RST 10, MOSI 11, SCLK 12
- MG90S signal: GPIO 5
- Servo close: 0°
- Servo open: 95°

Nếu phần cứng thực tế khác, chỉnh các define ở đầu `src/main.cpp`.
