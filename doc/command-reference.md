# 🤖 Command Reference

Tài liệu chi tiết tất cả lệnh bot với cú pháp, tham số và ví dụ sử dụng.

## Quy Ước Chung

### Prefix
Tất cả lệnh bắt đầu bằng `*` (có thể thay đổi trong cài đặt).

### Cú Pháp
- `<tham_số>`: Bắt buộc
- `[tham_số]`: Tùy chọn
- `|`: Hoặc (chọn 1 trong nhiều)
- `...`: Có thể lặp lại

### Định Dạng Thời Gian
Bot hỗ trợ nhiều định dạng:
- `DD-MM-YYYY HH:MM`: `28-04-2026 14:30`
- `DD/MM/YYYY HH:MM`: `28/04/2026 14:30`
- `DD/MM HH:MM`: `28/04 14:30` (năm hiện tại)
- `HH:MM`: `14:30` (hôm nay)
- Từ khóa: `mai`, `chu nhat`, `thu hai`, etc.

---

## 🆕 Khởi Tạo

### `*bat-dau`
Khởi tạo tài khoản người dùng với cài đặt mặc định.

**Cú pháp:**
```
*bat-dau
```

**Mô tả:**
- Tạo profile user trong database
- Thiết lập cài đặt mặc định (timezone VN, nhắc trước 30p)
- Bắt buộc thực hiện trước khi sử dụng các lệnh khác

**Ví dụ:**
```
*bat-dau
```

**Kết quả:**
```
✅ Đã khởi tạo tài khoản thành công!
🌏 Múi giờ: Asia/Ho_Chi_Minh
🔔 Nhắc mặc định: 30 phút trước
📍 Thông báo: Trong channel này

Gõ *help để xem hướng dẫn đầy đủ.
```

---

## 📅 Xem Lịch

### `*lich-hom-nay`
Xem tất cả lịch trong ngày hôm nay.

**Cú pháp:**
```
*lich-hom-nay
```

**Aliases:** `*hqn`

**Ví dụ:**
```
*lich-hom-nay
```

### `*lich-ngay`
Xem lịch theo ngày cụ thể.

**Cú pháp:**
```
*lich-ngay [DD-MM-YYYY | DD/MM]
```

**Tham số:**
- Không có: Lịch hôm nay
- `DD-MM-YYYY`: Ngày cụ thể
- `DD/MM`: Ngày trong năm hiện tại

**Ví dụ:**
```
*lich-ngay                  # Hôm nay
*lich-ngay 28-04-2026       # Ngày 28/04/2026
*lich-ngay 28/04            # Ngày 28/04 năm nay
```

### `*lich-tuan`
Xem lịch theo tuần.

**Cú pháp:**
```
*lich-tuan [DD-MM-YYYY | DD/MM]
*lich-tuan-truoc
*lich-tuan-sau
```

**Tham số:**
- Không có: Tuần hiện tại
- `DD-MM-YYYY`: Tuần chứa ngày này
- `-truoc`: Tuần trước
- `-sau`: Tuần sau

**Ví dụ:**
```
*lich-tuan                  # Tuần này
*lich-tuan 28-04-2026       # Tuần chứa 28/04/2026
*lich-tuan-truoc            # Tuần trước
*lich-tuan-sau              # Tuần sau
```

### `*lich-thang`
Xem lịch cả tháng (chưa implement).

**Cú pháp:**
```
*lich-thang [MM-YYYY]
```

### `*chi-tiet`
Xem chi tiết một lịch cụ thể.

**Cú pháp:**
```
*chi-tiet <ID>
```

**Tham số:**
- `ID`: ID của lịch (số nguyên)

**Ví dụ:**
```
*chi-tiet 123
```

**Kết quả:**
```
📋 Chi tiết lịch

🆔 ID: 123
📌 Tiêu đề: Họp team weekly
🏷️ Loại: Meeting
⚡ Ưu tiên: 🟡 Vừa
⏰ Bắt đầu: 28/04/2026 14:00
⏱️ Kết thúc: 28/04/2026 15:00
📊 Trạng thái: ⏳ Đang chờ
🔔 Nhắc lúc: 28/04/2026 13:30
📝 Mô tả: Review sprint và plan tuần tới
```

### `*sap-toi`
Xem các lịch sắp tới gần nhất.

**Cú pháp:**
```
*sap-toi [N] [--uutien <mức>]
```

**Tham số:**
- `N`: Số lượng lịch (1-20, mặc định 5)
- `--uutien`: Lọc theo mức ưu tiên (cao/vua/thap)

**Aliases:** `*st`

**Ví dụ:**
```
*sap-toi                    # 5 lịch gần nhất
*sap-toi 10                 # 10 lịch gần nhất
*sap-toi 5 --uutien cao     # 5 lịch ưu tiên cao gần nhất
```

### `*danh-sach`
Liệt kê tất cả lịch đang chờ (phân trang).

**Cú pháp:**
```
*danh-sach [trang] [--uutien <mức>]
```

**Tham số:**
- `trang`: Số trang (mặc định 1, mỗi trang 10 lịch)
- `--uutien`: Lọc theo mức ưu tiên

**Ví dụ:**
```
*danh-sach                  # Trang 1
*danh-sach 2                # Trang 2
*danh-sach --uutien cao     # Chỉ ưu tiên cao
```

### `*lich-tre`
Liệt kê lịch quá hạn (đã qua giờ bắt đầu nhưng chưa hoàn thành).

**Cú pháp:**
```
*lich-tre [trang] [--uutien <mức>]
```

### `*tim-kiem`
Tìm kiếm lịch theo từ khóa.

**Cú pháp:**
```
*tim-kiem <từ_khóa> [trang]
```

**Tham số:**
- `từ_khóa`: Từ khóa tìm trong tiêu đề và mô tả
- `trang`: Số trang kết quả

**Aliases:** `*tk`

**Ví dụ:**
```
*tim-kiem họp               # Tìm lịch có từ "họp"
*tim-kiem "team meeting"    # Tìm cụm từ chính xác
*tim-kiem họp 2             # Trang 2 kết quả
```

### `*thong-ke`
Xem thống kê lịch trình.

**Cú pháp:**
```
*thong-ke [khoảng]
```

**Tham số:**
- `khoảng`: `tuan` | `thang` | `nam` | `all` (mặc định: 30 ngày qua)

**Ví dụ:**
```
*thong-ke                   # 30 ngày qua
*thong-ke tuan              # Tuần này
*thong-ke thang             # Tháng này
*thong-ke nam               # Năm này
*thong-ke all               # Tất cả
```

**Kết quả bao gồm:**
- Tỷ lệ hoàn thành
- Giờ cao điểm (khung giờ có nhiều lịch nhất)
- Phân bố theo loại (task, meeting, event, reminder)
- Phân bố theo ưu tiên (cao, vừa, thấp)

---

## ✏️ Quản Lý Lịch

### `*them-lich`
Thêm lịch mới thông qua form interactive.

**Cú pháp:**
```
*them-lich
```

**Quy trình:**
1. Bot hiển thị form với các trường:
   - Tiêu đề (bắt buộc)
   - Mô tả (tùy chọn)
   - Loại lịch (task/meeting/event/reminder)
   - Ngày & giờ bắt đầu (bắt buộc)
   - Ngày & giờ kết thúc (bắt buộc)
   - Ưu tiên (thấp/vừa/cao)
   - Lặp lại (không/daily/weekly/monthly)
   - Khoảng lặp (số)
   - Dừng lặp sau ngày (tùy chọn)

2. User điền thông tin và bấm "Xác nhận"
3. Bot validate và lưu vào database
4. Hiển thị thông tin lịch đã tạo

### `*them-lich-excel`
Import nhiều lịch từ file Excel.

**Cú pháp:**
```
*them-lich-excel
```

**Quy trình:**
1. Bot yêu cầu upload file Excel
2. File phải có các cột:
   - `tieu_de` (bắt buộc)
   - `thoi_gian` (bắt buộc, định dạng DD/MM/YYYY HH:MM)
   - `mo_ta` (tùy chọn)
   - `uu_tien` (tùy chọn: cao/vua/thap)
   - `loai` (tùy chọn: task/meeting/event/reminder)

3. Bot xử lý từng dòng và báo cáo kết quả

### `*mau-lich-excel`
Tải file Excel mẫu để import lịch.

**Cú pháp:**
```
*mau-lich-excel
```

### `*sua-lich`
Chỉnh sửa lịch hiện có.

**Cú pháp:**
```
*sua-lich <ID>
```

**Quy trình:**
1. Bot hiển thị thông tin hiện tại
2. User chọn trường cần sửa:
   - Tiêu đề
   - Thời gian bắt đầu
   - Thời gian kết thúc
   - Mô tả
   - Trạng thái
   - Ưu tiên
3. Nhập giá trị mới
4. Bot cập nhật và xác nhận

**Ví dụ:**
```
*sua-lich 123
```

### `*xoa-lich`
Xóa lịch (có xác nhận).

**Cú pháp:**
```
*xoa-lich <ID>
```

**Quy trình:**
1. Bot hiển thị thông tin lịch
2. Yêu cầu xác nhận bằng cách reply `yes`
3. Xóa khỏi database nếu xác nhận

**Ví dụ:**
```
*xoa-lich 123
Bot: ⚠️ Bạn có chắc muốn xóa lịch này?
     [thông tin lịch]
     Reply 'yes' để xác nhận
User: yes
Bot: ✅ Đã xóa lịch #123
```

### `*hoan-thanh`
Đánh dấu lịch đã hoàn thành.

**Cú pháp:**
```
*hoan-thanh <ID>
```

**Aliases:** `*ht`

**Ví dụ:**
```
*hoan-thanh 123
```

**Kết quả:**
```
🎉 Chúc mừng! Đã hoàn thành
✅ Họp team weekly
⏰ 28/04/2026 15:00
```

### `*hoan-tac`
Hoàn tác thao tác gần nhất (trong vòng 10 phút).

**Cú pháp:**
```
*hoan-tac
```

**Có thể hoàn tác:**
- Thêm lịch mới
- Sửa lịch
- Xóa lịch
- Hoàn thành lịch

### `*lich-lap`
Bật lặp lại cho lịch.

**Cú pháp:**
```
*lich-lap <ID> <daily|weekly|monthly> [interval] [--den DD/MM/YYYY]
```

**Tham số:**
- `ID`: ID của lịch
- `daily|weekly|monthly`: Kiểu lặp
- `interval`: Khoảng lặp (mặc định 1)
- `--den`: Dừng lặp sau ngày này

**Ví dụ:**
```
*lich-lap 123 daily                    # Lặp hàng ngày
*lich-lap 123 weekly 2                 # Lặp 2 tuần 1 lần
*lich-lap 123 monthly --den 31/12/2026 # Lặp hàng tháng đến cuối năm
```

### `*bo-lap`
Tắt lặp lại cho lịch.

**Cú pháp:**
```
*bo-lap <ID>
```

### `*copy-lich`
Sao chép lịch sang thời gian khác (chưa implement).

**Cú pháp:**
```
*copy-lich <ID> <DD-MM-YYYY> [HH:MM]
```

---

## 🏷️ Nhãn (Tags)

### `*tag-them`
Tạo nhãn mới.

**Cú pháp:**
```
*tag-them <tên> [#màu]
```

**Tham số:**
- `tên`: Tên nhãn (a-z, 0-9, -, _, tối đa 30 ký tự)
- `màu`: Mã màu hex (tùy chọn)

**Ví dụ:**
```
*tag-them work              # Tạo tag "work"
*tag-them personal #ff0000  # Tạo tag "personal" màu đỏ
```

### `*tag-xoa`
Xóa nhãn (gỡ khỏi tất cả lịch).

**Cú pháp:**
```
*tag-xoa <tên>
```

### `*tag-ds`
Liệt kê tất cả nhãn của user.

**Cú pháp:**
```
*tag-ds
```

### `*tag`
Gắn nhãn vào lịch.

**Cú pháp:**
```
*tag <ID> <tên1> [tên2] [...]
```

**Ví dụ:**
```
*tag 123 work               # Gắn tag "work"
*tag 123 work personal      # Gắn nhiều tag
```

### `*untag`
Gỡ nhãn khỏi lịch.

**Cú pháp:**
```
*untag <ID> <tên>
```

### `*lich-tag`
Xem lịch theo nhãn.

**Cú pháp:**
```
*lich-tag <tên> [--cho]
```

**Tham số:**
- `--cho`: Chỉ hiển thị lịch đang chờ (pending)

**Ví dụ:**
```
*lich-tag work              # Tất cả lịch có tag "work"
*lich-tag work --cho        # Chỉ lịch pending có tag "work"
```

---

## 👥 Chia Sẻ

### `*chia-se`
Chia sẻ lịch (read-only) cho user khác.

**Cú pháp:**
```
*chia-se <ID> <user_id>
```

**Ví dụ:**
```
*chia-se 123 @username
```

### `*bo-chia-se`
Gỡ chia sẻ lịch.

**Cú pháp:**
```
*bo-chia-se <ID> <user_id>
```

### `*chia-se-ai`
Xem danh sách người được chia sẻ một lịch.

**Cú pháp:**
```
*chia-se-ai <ID>
```

### `*lich-chia-se`
Xem lịch được người khác chia sẻ.

**Cú pháp:**
```
*lich-chia-se
```

---

## 📋 Template

### `*tao-template`
Lưu lịch hiện có thành template.

**Cú pháp:**
```
*tao-template <tên> <ID>
```

### `*tu-template`
Tạo lịch mới từ template.

**Cú pháp:**
```
*tu-template <tên> <DD-MM-YYYY HH:MM>
```

### `*ds-template`
Liệt kê các template đã lưu.

**Cú pháp:**
```
*ds-template
```

### `*xoa-template`
Xóa template.

**Cú pháp:**
```
*xoa-template <tên>
```

---

## 🔔 Nhắc Nhở

### `*nhac`
Đặt nhắc nhở trước giờ bắt đầu.

**Cú pháp:**
```
*nhac <ID> <số_phút>
```

**Tham số:**
- `số_phút`: Số phút trước giờ bắt đầu (1-1440)

**Ví dụ:**
```
*nhac 123 30                # Nhắc trước 30 phút
*nhac 123 60                # Nhắc trước 1 giờ
*nhac 123 1440              # Nhắc trước 1 ngày
```

### `*nhac-sau`
Nhắc nhở sau khoảng thời gian từ bây giờ.

**Cú pháp:**
```
*nhac-sau <ID> <thời_gian>
```

**Định dạng thời gian:**
- `Np`: N phút (vd: `30p`)
- `Nh`: N giờ (vd: `2h`)
- `Nd`: N ngày (vd: `1d`)
- `NhMp`: N giờ M phút (vd: `2h30p`)
- Văn bản: `"1 ngày 12 giờ"`

**Ví dụ:**
```
*nhac-sau 123 30p           # Nhắc sau 30 phút
*nhac-sau 123 2h            # Nhắc sau 2 giờ
*nhac-sau 123 1d            # Nhắc sau 1 ngày
*nhac-sau 123 2h30p         # Nhắc sau 2 giờ 30 phút
*nhac-sau 123 "1 ngày 12 giờ"
```

### `*tat-nhac`
Tắt nhắc nhở cho lịch.

**Cú pháp:**
```
*tat-nhac <ID>
```

### Tương Tác Với Reminder

Khi nhận được reminder, user có thể bấm các button:

- ✅ **Đã nhận**: Tắt reminder cho lịch này
- ⏰ **Snooze**: Nhắc lại sau thời gian mặc định (từ user settings)
- ⏰ **10p**: Nhắc lại sau 10 phút
- ⏰ **1h**: Nhắc lại sau 1 giờ
- ⏰ **4h**: Nhắc lại sau 4 giờ

---

## ⚙️ Cài Đặt

### `*cai-dat`
Xem và chỉnh sửa cài đặt cá nhân thông qua form interactive.

**Cú pháp:**
```
*cai-dat
```

**Các cài đặt có thể thay đổi:**
- **Múi giờ**: IANA timezone (vd: Asia/Ho_Chi_Minh)
- **Thời gian nhắc mặc định**: Số phút trước khi bắt đầu
- **Nơi nhận thông báo**: Channel hiện tại hoặc DM
- **Giờ làm việc**: Từ giờ nào đến giờ nào
- **Ngày làm việc**: Các ngày trong tuần (1=Monday, 7=Sunday)

### `*gio-lam`
Đặt nhanh khung giờ làm việc.

**Cú pháp:**
```
*gio-lam [start] [end] [days] | tat
```

**Tham số:**
- `start`: Giờ bắt đầu (HH:MM)
- `end`: Giờ kết thúc (HH:MM)
- `days`: Ngày làm việc (1,2,3,4,5 = T2-T6)
- `tat`: Tắt giờ làm việc

**Ví dụ:**
```
*gio-lam                    # Xem giờ làm hiện tại
*gio-lam 9:00 17:00         # Đặt 9h-17h, T2-T6
*gio-lam 8:30 17:30 1,2,3,4,5,6  # Bao gồm thứ 7
*gio-lam tat                # Tắt giờ làm việc
```

**Tác dụng:**
- Reminder ngoài giờ làm việc sẽ được dồn về sáng ngày làm việc tiếp theo
- Giúp tránh spam notification ngoài giờ

---

## 📤 Import/Export

### `*export-ics`
Xuất lịch ra file .ics (tương thích Google Calendar, Apple Calendar).

**Cú pháp:**
```
*export-ics [khoảng]
```

**Tham số:**
- Không có: Tất cả lịch
- `DD-MM-YYYY DD-MM-YYYY`: Khoảng thời gian
- `tat-ca`: Tất cả lịch (tường minh)

**Ví dụ:**
```
*export-ics                           # Tất cả lịch
*export-ics 01-04-2026 30-04-2026     # Tháng 4/2026
*export-ics tat-ca                    # Tất cả lịch
```

### `*import-ics`
Nhập lịch từ file .ics.

**Cú pháp:**
```
*import-ics [url]
```

**Quy trình:**
1. Upload file .ics hoặc cung cấp URL
2. Bot parse và hiển thị preview
3. Xác nhận để import vào database

---

## ❓ Hỗ Trợ

### `*help`
Xem hướng dẫn sử dụng.

**Cú pháp:**
```
*help
```

**Aliases:** `*huong-dan`, `*trogiup`

---

## 🔧 Tham Số Chung

### Ưu Tiên (`--uutien`)
Nhiều lệnh hỗ trợ filter theo ưu tiên:

```
--uutien cao                # Chỉ ưu tiên cao (🔴)
--uutien vua                # Chỉ ưu tiên vừa (🟡)
--uutien thap               # Chỉ ưu tiên thấp (🟢)
```

### Phân Trang
Các lệnh liệt kê hỗ trợ phân trang:

```
*danh-sach 2                # Trang 2
*tim-kiem họp 3             # Trang 3 kết quả tìm kiếm
```

Mỗi trang hiển thị 10 items.

---

## 💡 Tips & Shortcuts

### Aliases Phổ Biến
- `*hqn` = `*lich-hom-nay`
- `*st` = `*sap-toi`
- `*tk` = `*tim-kiem`
- `*ht` = `*hoan-thanh`

### Định Dạng Thời Gian Linh Hoạt
```
28-04-2026 14:00            # Đầy đủ
28/04/2026 14:00            # Slash format
28/04 14:00                 # Năm hiện tại
14:00                       # Hôm nay
mai 14:00                   # Ngày mai
chu nhat 14:00              # Chủ nhật tuần này
```

### Best Practices
1. **Tiêu đề rõ ràng**: "Họp team sprint review" thay vì "Họp"
2. **Sử dụng mô tả**: Ghi agenda, địa điểm, người tham gia
3. **Đặt ưu tiên phù hợp**: Giúp filter và prioritize
4. **Sử dụng tag**: Phân loại theo project, team, loại công việc
5. **Đặt reminder hợp lý**: 30p cho meeting, 1 ngày cho deadline

---

**Cần hỗ trợ thêm? Gõ `*help` hoặc liên hệ admin của clan.**