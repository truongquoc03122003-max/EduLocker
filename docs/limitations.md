# Giới Hạn Phạm Vi Demo & Định Hướng Phát Triển (Limitations)

Tài liệu này nêu rõ các giới hạn kỹ thuật và phạm vi trình diễn của **EduLocker MVP** để đảm bảo tính minh bạch khi thuyết trình và bảo vệ đồ án:

1. **Không phải sản phẩm thương mại vận hành chính thức:** EduLocker hiện là phiên bản **MVP Demo** phục vụ học phần **KN002E – Đổi mới sáng tạo và Khởi nghiệp (Nhóm 8)**.
2. **Không phải dịch vụ chính thức của Đại học Cần Thơ (CTU):** Các địa điểm trạm tủ (Ký túc xá A, Trung tâm Học liệu) là **vị trí đề xuất / mô phỏng**; chưa triển khai lắp đặt thực tế tại khuôn viên trường.
3. **Chưa tích hợp CTU SSO:** Xác thực hiện tại sử dụng email/mật khẩu qua Supabase Auth. Nhãn `Email đã xác minh` không đồng nghĩa với xác thực sinh viên chính thức bởi nhà trường (`campus_verified = false` trừ khi có tích hợp chính thức trong tương lai).
4. **Không kết nối Smart Locker vật lý (ESP32 / RFID / QR Scanner):** Luồng giữ ngăn tủ, gửi hàng và nhập OTP mở cửa tủ hoạt động trên **Smart Locker Simulator** (`/lockers/[locationId]`).
5. **Không xử lý thanh toán thật:** Toàn bộ quy trình tạm giữ (`HELD_DEMO`), giải ngân (`RELEASED_DEMO`) và hoàn tiền (`REFUNDED_DEMO`) hoạt động trên **Payment Simulator**, không kết nối cổng thanh toán (VNPay/MoMo/Ngân hàng).
6. **Thống kê kinh tế tuần hoàn:** Chỉ báo cáo **Số sản phẩm đã được tái sử dụng** bằng tổng số đơn hàng ở trạng thái `COMPLETED`, không tự ước lượng lượng khí CO₂ hay khối lượng rác thải giảm thiểu khi chưa có phương pháp đo lường được kiểm chứng.

