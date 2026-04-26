# 👥 Hướng Dẫn Sử Dụng Bot Thời Gian Biểu

## 🚀 Bắt Đầu

### Khởi tạo tài khoản
Trước khi sử dụng bot, bạn cần khởi tạo tài khoản:

```
*bat-dau
```

Bot sẽ tạo profile cho bạn với các cài đặt mặc định:
- Múi giờ: Việt Nam (UTC+7)
- Thời gian nhắc mặc định: 30 phút trước
- Nhận thông báo: Trong channel (không qua DM)

### Xem hướng dẫn
```
*help
```

## 📅 Quản Lý Lịch Trình

### ➕ Thêm lịch mới

#### Cách 1: Interactive (Khuyến nghị)
```
*them-lich
```
Bot sẽ hỏi từng thông tin:
1. **Tiêu đề**: Tên công việc/sự kiện
2. **Thời gian**: Định dạng `DD-MM-YYYY HH:MM` hoặc `DD/MM HH:MM`
3. **Mô tả**: Chi tiết thêm (có thể bỏ trống)

**Ví dụ:**
```
User: *them-lich
Bot: 📝 Nhập tiêu đề lịch:
User: Họp team weekly
Bot: ⏰ Nhập thời gian (DD-MM-YYYY HH:MM):
User: 28-04-2026 14:00
Bot: 📄 Nhập mô tả (Enter để bỏ qua):
User: Review sprint và plan tuần tới
Bot: ✅ Đã thêm lịch: Họp team weekly
     🆔 ID: 123
     ⏰ 28/04/2026 14:00
     🔔 Nhắc lúc: 28/04/2026 13:30
```

#### Cách 2: Import từ Excel
```
*them-lich-excel
```
Upload file Excel với các cột:
- `tieu_de` (bắt buộc)
- `thoi_gian` (bắt buộc)
- `mo_ta` (tùy chọn)
- `uu_tien` (tùy chọn): cao/vua/thap

Tải file mẫu:
```
*mau-lich-excel
```

### 👀 Xem lịch

#### Lịch hôm nay
```
*lich-hom-nay
```

#### Lịch theo ngày
```
*lich-ngay 28-04-2026
*lich-ngay 28/04        # Năm hiện tại
*lich-ngay              # Hôm nay
```

#### Lịch theo tuần
```
*lich-tuan              # Tuần này
*lich-tuan 28-04-2026   # Tuần chứa ngày 28/04
*lich-tuan-truoc        # Tuần trước
*lich-tuan-sau          # Tuần sau
```

#### Lịch sắp tới
```
*sap-toi                # 5 lịch gần nhất
*sap-toi 10             # 10 lịch gần nhất
*sap-toi 5 --uutien cao # Chỉ ưu tiên cao
```

#### Danh sách tất cả
```
*danh-sach              # Trang 1
*danh-sach 2            # Trang 2
*danh-sach --uutien cao # Lọc theo ưu tiên
```

### 🔍 Tìm kiếm và chi tiết

#### Tìm kiếm
```
*tim-kiem họp           # Tìm theo từ khóa
*tim-kiem "team meeting" # Tìm cụm từ
*tim-kiem họp 2         # Trang 2 kết quả
```

#### Xem chi tiết
```
*chi-tiet 123           # Xem chi tiết lịch ID 123
```

### ✏️ Chỉnh sửa lịch

#### Sửa lịch
```
*sua-lich 123
```
Bot sẽ hiển thị menu chọn trường cần sửa:
1. Tiêu đề
2. Thời gian  
3. Mô tả
4. Trạng thái
5. Ưu tiên

#### Hoàn thành công việc
```
*hoan-thanh 123
```

#### Xóa lịch
```
*xoa-lich 123
```
Bot sẽ yêu cầu xác nhận bằng cách reply `yes`.

## 🔔 Hệ Thống Nhắc Nhở

### Đặt nhắc nhở
```
*nhac 123 30            # Nhắc trước 30 phút
*nhac 123 60            # Nhắc trước 1 giờ
*nhac 123 1440          # Nhắc trước 1 ngày
```

### Nhắc nhở linh hoạt
```
*nhac-sau 123 30p       # Nhắc sau 30 phút
*nhac-sau 123 2h        # Nhắc sau 2 giờ
*nhac-sau 123 1d        # Nhắc sau 1 ngày
*nhac-sau 123 2h30p     # Nhắc sau 2 giờ 30 phút
*nhac-sau 123 "1 ngày 12 giờ"  # Nhắc sau 1 ngày 12 giờ
```

### Tắt nhắc nhở
```
*tat-nhac 123
```

### Tương tác với reminder
Khi nhận được reminder, bạn có thể:
- ✅ **Đã nhận**: Tắt reminder cho lịch này
- ⏰ **Snooze**: Nhắc lại sau thời gian mặc định
- ⏰ **10p**: Nhắc lại sau 10 phút
- ⏰ **1h**: Nhắc lại sau 1 giờ  
- ⏰ **4h**: Nhắc lại sau 4 giờ

## 🔄 Lịch Lặp Lại

### Bật lặp lại
```
*lich-lap 123 daily             # Lặp hàng ngày
*lich-lap 123 weekly            # Lặp hàng tuần
*lich-lap 123 monthly           # Lặp hàng tháng
*lich-lap 123 daily 2           # Lặp 2 ngày 1 lần
*lich-lap 123 weekly 2          # Lặp 2 tuần 1 lần
*lich-lap 123 daily --den 31/12/2026  # Lặp đến ngày cụ thể
```

### Tắt lặp lại
```
*bo-lap 123
```

## 🏷️ Hệ Thống Tag

### Tạo tag mới
```
*tag tao work               # Tạo tag "work"
*tag tao personal #ff0000   # Tạo tag "personal" màu đỏ
```

### Gắn tag vào lịch
```
*tag gan 123 work           # Gắn tag "work" vào lịch 123
*tag gan 123 work,personal  # Gắn nhiều tag
```

### Xem lịch theo tag
```
*lich-tag work              # Xem tất cả lịch có tag "work"
*lich-tag work,personal     # Xem lịch có tag "work" HOẶC "personal"
```

### Quản lý tag
```
*tag danh-sach              # Xem tất cả tag
*tag sua work "Công việc"   # Đổi tên tag
*tag xoa work               # Xóa tag
```

## 📊 Thống Kê

### Xem thống kê
```
*thong-ke                   # Thống kê tổng quan
*thong-ke tuan              # Thống kê tuần này
*thong-ke thang             # Thống kê tháng này
*thong-ke nam               # Thống kê năm này
```

Thống kê bao gồm:
- **Tỷ lệ hoàn thành**: % lịch đã hoàn thành
- **Giờ cao điểm**: Khung giờ có nhiều lịch nhất
- **Phân bố theo loại**: Task, meeting, event, reminder
- **Phân bố theo ưu tiên**: Cao, vừa, thấp

## ⚙️ Cài Đặt Cá Nhân

### Xem và chỉnh cài đặt
```
*cai-dat
```

Bot sẽ hiển thị form interactive để chỉnh:
- **Múi giờ**: Timezone (VD: Asia/Ho_Chi_Minh)
- **Thời gian nhắc mặc định**: Số phút trước khi bắt đầu
- **Nơi nhận thông báo**: Channel hiện tại hoặc DM
- **Giờ làm việc**: Từ giờ nào đến giờ nào
- **Ngày làm việc**: Thứ 2-6, hoặc custom

### Giờ làm việc
```
*gio-lam                    # Xem giờ làm việc hiện tại
*gio-lam 9:00 17:00         # Đặt giờ làm 9h-17h
*gio-lam 8:30 17:30 2,3,4,5,6  # Custom ngày làm việc
```

## 🔄 Hoàn Tác

### Hoàn tác thao tác cuối
```
*hoan-tac
```

Có thể hoàn tác:
- Thêm lịch mới
- Sửa lịch
- Xóa lịch
- Hoàn thành lịch

## 📤 Chia Sẻ & Export

### Chia sẻ lịch
```
*chia-se 123 @username      # Chia sẻ lịch cho user khác (read-only)
```

### Export ICS
```
*export-ics                 # Export tất cả lịch
*export-ics tuan            # Export lịch tuần này
*export-ics thang           # Export lịch tháng này
```

### Import ICS
```
*import-ics
```
Upload file .ics từ Google Calendar, Outlook, etc.

## 📋 Template

### Tạo template
```
*template tao "Daily Standup"
```
Bot sẽ hỏi thông tin template (title, thời gian, mô tả mặc định).

### Sử dụng template
```
*template su-dung "Daily Standup" 28-04-2026 09:00
```

### Quản lý template
```
*template danh-sach         # Xem tất cả template
*template xoa "Daily Standup"  # Xóa template
```

## 💡 Tips & Tricks

### Định dạng thời gian linh hoạt
Bot hiểu nhiều định dạng:
- `28-04-2026 14:00`
- `28/04/2026 14:00`
- `28/04 14:00` (năm hiện tại)
- `14:00` (hôm nay)
- `mai 14:00` (ngày mai)
- `chu nhat 14:00` (chủ nhật tuần này)

### Ưu tiên
- 🔴 **Cao**: Công việc quan trọng, deadline gấp
- 🟡 **Vừa**: Công việc thường ngày (mặc định)
- 🟢 **Thấp**: Công việc có thể hoãn

### Shortcuts
- `*hqn` = `*lich-hom-nay`
- `*st` = `*sap-toi`
- `*tk` = `*tim-kiem`
- `*ht` = `*hoan-thanh`

### Best Practices
1. **Đặt tiêu đề rõ ràng**: "Họp team" thay vì "Họp"
2. **Sử dụng mô tả**: Ghi agenda, location, participants
3. **Đặt ưu tiên phù hợp**: Giúp filter và prioritize
4. **Sử dụng tag**: Phân loại theo project, team, loại công việc
5. **Đặt reminder hợp lý**: 30p cho meeting, 1 ngày cho deadline

## ❓ Câu Hỏi Thường Gặp

### Q: Làm sao để thay đổi múi giờ?
A: Dùng `*cai-dat` và chọn timezone mới.

### Q: Bot có nhắc qua DM không?
A: Có, bật trong `*cai-dat` → "Nơi nhận thông báo" → "DM".

### Q: Có thể import từ Google Calendar không?
A: Có, export file .ics từ Google Calendar rồi dùng `*import-ics`.

### Q: Lịch lặp lại hoạt động như thế nào?
A: Khi hoàn thành lịch lặp, bot tự tạo instance tiếp theo theo chu kỳ đã đặt.

### Q: Có giới hạn số lượng lịch không?
A: Không có giới hạn cứng, nhưng khuyến nghị < 1000 lịch active/user.

### Q: Làm sao để xóa tất cả lịch?
A: Hiện chưa có lệnh bulk delete. Liên hệ admin nếu cần thiết.

---

**Cần hỗ trợ thêm? Gõ `*help` hoặc liên hệ admin của clan.**