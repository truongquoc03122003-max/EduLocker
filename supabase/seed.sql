-- =============================================================================
-- EduLocker Phase 2 Seed Data (Reference Data Only – No Fake Auth Users)
-- =============================================================================

-- 1. Universities
insert into public.universities (id, code, name, short_name, email_domain, city)
values
  ('uni-ctu', 'CTU', 'Đại học Cần Thơ', 'ĐH Cần Thơ (CTU)', 'student.ctu.edu.vn', 'Cần Thơ'),
  ('uni-ctump', 'CTUMP', 'Đại học Y Dược Cần Thơ', 'ĐH Y Dược Cần Thơ', 'student.ctump.edu.vn', 'Cần Thơ'),
  ('uni-fpt-ct', 'FPTCT', 'Đại học FPT Cần Thơ', 'ĐH FPT Cần Thơ', 'fpt.edu.vn', 'Cần Thơ'),
  ('uni-dnc', 'DNC', 'Đại học Nam Cần Thơ', 'ĐH Nam Cần Thơ', 'nctu.edu.vn', 'Cần Thơ')
on conflict (id) do update
set
  name = excluded.name,
  short_name = excluded.short_name,
  email_domain = excluded.email_domain;

-- 2. Majors (Đại học Cần Thơ)
insert into public.majors (id, university_id, code, name, faculty)
values
  ('major-tdh', 'uni-ctu', 'TDH', 'Tự động hóa', 'Trường Bách Khoa – ĐH Cần Thơ'),
  ('major-cntt', 'uni-ctu', 'CNTT', 'Công nghệ thông tin', 'Trường CNTT & Truyền thông – ĐH Cần Thơ'),
  ('major-ck', 'uni-ctu', 'CK', 'Cơ khí', 'Trường Bách Khoa – ĐH Cần Thơ'),
  ('major-ddt', 'uni-ctu', 'DDT', 'Điện – Điện tử', 'Trường Bách Khoa – ĐH Cần Thơ'),
  ('major-kt', 'uni-ctu', 'KT', 'Kinh tế', 'Trường Kinh tế – ĐH Cần Thơ'),
  ('major-qtkd', 'uni-ctu', 'QTKD', 'Quản trị kinh doanh', 'Trường Kinh tế – ĐH Cần Thơ')
on conflict (id) do update
set
  name = excluded.name,
  faculty = excluded.faculty;

-- 3. Courses
insert into public.courses (id, major_id, code, name, semester_hint)
values
  ('course-giai-tich', 'major-tdh', 'TN001', 'Giải tích', 'Học kỳ 1 – Năm nhất'),
  ('course-dstt', 'major-cntt', 'TN003', 'Đại số tuyến tính', 'Học kỳ 1 – Năm nhất'),
  ('course-ly-thuyet-mach', 'major-ddt', 'KC108', 'Lý thuyết mạch', 'Học kỳ 2 – Năm nhất / Năm hai'),
  ('course-vi-dieu-khien', 'major-tdh', 'KC214', 'Vi điều khiển & Hệ thống nhúng', 'Năm hai / Năm ba'),
  ('course-do-luong-dien', 'major-ddt', 'KC112', 'Kỹ thuật đo lường điện', 'Năm hai'),
  ('course-ctdl-gt', 'major-cntt', 'CT177', 'Cấu trúc dữ liệu', 'Năm hai'),
  ('course-ve-ky-thuat', 'major-ck', 'KC101', 'Hình họa & Vẽ kỹ thuật', 'Năm nhất'),
  ('course-kinh-te-vi-mo', 'major-kt', 'KT101', 'Kinh tế vi mô', 'Năm nhất'),
  ('course-quan-tri-hoc', 'major-qtkd', 'QT102', 'Quản trị học', 'Năm nhất')
on conflict (id) do update
set
  name = excluded.name,
  semester_hint = excluded.semester_hint;

-- 4. Categories (9 Student Categories)
insert into public.categories (id, slug, name, description, icon_name, sort_order)
values
  ('cat-1', 'giao-trinh', 'Giáo trình', 'Giáo trình đại cương & chuyên ngành chuẩn CTU', 'BookOpen', 1),
  ('cat-2', 'sach', 'Sách', 'Sách chuyên ngành, sách tham khảo & ngoại ngữ', 'Library', 2),
  ('cat-3', 'dung-cu-hoc-tap', 'Dụng cụ học tập', 'Bộ vẽ kỹ thuật, dụng cụ thí nghiệm, tài liệu', 'Compass', 3),
  ('cat-4', 'may-tinh-cam-tay', 'Máy tính cầm tay', 'Casio fx-580VN X, Vinacal phục vụ thi cử', 'Calculator', 4),
  ('cat-5', 'do-dien-tu', 'Đồ điện tử', 'Breadboard, đồng hồ vạn năng, linh kiện IoT', 'Cpu', 5),
  ('cat-6', 'do-ktx', 'Đồ KTX', 'Đèn bàn học, quạt mini, kệ sách cho phòng trọ & KTX', 'LampDesk', 6),
  ('cat-7', 'do-gia-dung', 'Đồ gia dụng', 'Nồi điện mini, ổ cắm chống quá tải, bình đun', 'PlugZap', 7),
  ('cat-8', 'phu-kien', 'Phụ kiện', 'Tai nghe học tập, chuột, bàn phím, phụ kiện công nghệ', 'Headphones', 8),
  ('cat-9', 'khac', 'Khác', 'Balo chống sốc & vật dụng cá nhân phù hợp sinh viên', 'Backpack', 9)
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  sort_order = excluded.sort_order;

-- 5. Proposed / Demo Smart Locker Stations
insert into public.locker_locations (
  id, code, name, campus_area, address, university_id, operating_hours, description, total_compartments, available_compartments, is_demo_station
)
values
  (
    'locker-ktx-a',
    'CTU-KTX-A',
    'EduLocker – Ký túc xá A (Demo / Vị trí đề xuất)',
    'Sảnh chính Ký túc xá Khu A – Khu II ĐH Cần Thơ (Vị trí đề xuất)',
    'Đường 3/2, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ',
    'uni-ctu',
    'Giờ hoạt động dự kiến (Demo): 24/7 (Khu vực sảnh KTX)',
    'Trạm tủ mô phỏng đề xuất đặt tại sảnh chờ Ký túc xá Khu A, thuận tiện cho sinh viên nội trú gửi và nhận giáo trình, đồ KTX.',
    4,
    2,
    true
  ),
  (
    'locker-thu-vien',
    'CTU-LIB',
    'EduLocker – Thư viện (Demo / Vị trí đề xuất)',
    'Sảnh tầng trệt Trung tâm Học liệu – Khu II ĐH Cần Thơ (Vị trí đề xuất)',
    'Đường 3/2, Phường Xuân Khánh, Quận Ninh Kiều, TP. Cần Thơ',
    'uni-ctu',
    'Giờ hoạt động dự kiến (Demo): 06:30 – 22:00',
    'Trạm tủ mô phỏng đề xuất đặt tại lối vào Trung tâm Học liệu (Thư viện), hỗ trợ sinh viên trao đổi giáo trình và dụng cụ học tập giữa các ca học.',
    4,
    3,
    true
  )
on conflict (id) do update
set
  name = excluded.name,
  campus_area = excluded.campus_area,
  operating_hours = excluded.operating_hours,
  description = excluded.description;

-- 6. Demo Locker Compartments
insert into public.locker_compartments (id, locker_id, code, size, size_label, status, current_order_code)
values
  ('comp-a01', 'locker-ktx-a', 'A01', 'S', 'Ngăn Nhỏ (Giáo trình, Máy tính Casio, Linh kiện)', 'AVAILABLE', null),
  ('comp-a02', 'locker-ktx-a', 'A02', 'M', 'Ngăn Vừa (Đèn bàn, Quạt mini, Tai nghe)', 'RESERVED', 'EDL-2409'),
  ('comp-a03', 'locker-ktx-a', 'A03', 'M', 'Ngăn Vừa (Bộ sách học kỳ, Nồi điện mini)', 'AVAILABLE', null),
  ('comp-a04', 'locker-ktx-a', 'A04', 'L', 'Ngăn Lớn (Kệ sách tháo rời, Balo, Combo đồ KTX)', 'OCCUPIED', 'EDL-2405'),
  ('comp-b01', 'locker-thu-vien', 'B01', 'S', 'Ngăn Nhỏ (Giáo trình, Sách chuyên ngành)', 'AVAILABLE', null),
  ('comp-b02', 'locker-thu-vien', 'B02', 'S', 'Ngăn Nhỏ (Máy tính cầm tay, Đồng hồ vạn năng)', 'AVAILABLE', null),
  ('comp-b03', 'locker-thu-vien', 'B03', 'M', 'Ngăn Vừa (Combo linh kiện, Dụng cụ vẽ kỹ thuật)', 'AVAILABLE', null),
  ('comp-b04', 'locker-thu-vien', 'B04', 'L', 'Ngăn Lớn (Đồ gia dụng nhỏ, Kệ sách)', 'MAINTENANCE', null)
on conflict (id) do update
set
  status = excluded.status,
  size_label = excluded.size_label;

