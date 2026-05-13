# Tiến độ Bot Thời Gian Biểu — Design vs. Implementation

> Đối chiếu giữa bộ design Stitch (54 màn hình + `DESIGN.md`) và mã nguồn backend hiện tại trong repo `BotThoiGianBieu`. Tick vào ô khi một mục được hoàn thành.
>
> Quy ước: `[x]` đã xong · `[ ]` chưa làm · `🟡` ghi chú nghĩa là làm một phần (xem chi tiết trong từng dòng).

## 1. Tóm tắt tổng

- [x] Backend NestJS + TypeORM + PostgreSQL + mezon-sdk (đầy đủ bot commands)
- [x] Database schema (events, users, reminders, settings) + migrations idempotent
- [x] CI / quality gates (`.github/workflows/ci.yml`: lint + build + test, >550 tests)
- [x] Docker support (Dockerfile multi-stage + docker-compose)
- [x] Design system Stitch (`DESIGN.md`: palette tím/trắng, Inter font, spacing 4px, sidebar 260px)
- [ ] Frontend web app (chưa có — hiện tại chỉ có bot commands qua Mezon)
- [ ] API REST cho frontend (chưa có — bot giao tiếp trực tiếp qua mezon-sdk WebSocket)

## 2. Bộ design Stitch — Tổng quan (54 screens)

> **Lưu ý:** Stitch generate mỗi screen độc lập nên branding không nhất quán (Productivity Flow, FocusFlow Pro, SharpProductivity, Workspace, Năng suất cao). Khi implement, cần thống nhất thành **1 tên + 1 style** duy nhất.

### 2.1 Screens KHÔNG trùng — mỗi screen có mục đích riêng biệt

Sau khi xem xét tất cả 54 screens, **không có screen nào trùng lặp hoàn toàn**. Các cặp screen tưởng giống nhau thực ra là **2 design variant khác nhau** cho cùng chức năng:

| Cặp screen | Khác biệt | Đề xuất |
|---|---|---|
| `c_i_t_c_nh_n_productivity_flow` vs `c_i_t_c_nh_n_qu_n_l_th_i_gian_bi_u` | Variant 1: focus Cài đặt chung + Giờ làm việc + Giao diện sáng/tối + Tích hợp Mezon. Variant 2: focus Hồ sơ + Thông báo toggle + Template + Tab navigation | **Chọn 1 làm chính**, dùng variant kia để bổ sung ý tưởng. Khuyến nghị giữ Variant 1 (đầy đủ hơn) |
| `th_ng_k_n_ng_su_t_productivity_flow` vs `th_ng_k_n_ng_su_t_qu_n_l_th_i_gian_bi_u` | Variant 1 (FocusFlow): stat cards + bar chart + pie charts + AI insights CTA. Variant 2 (Năng suất cao): so sánh tuần + Tag chart + Activity log + stat boxes | **Chọn 1 làm trang chính**, variant kia có thể làm sub-page hoặc dashboard tab |
| `t_ng_quan_qu_n_l_th_i_gian_bi_u` vs `t_ng_quan_n_ng_su_t_qu_n_l_th_i_gian_bi_u` | Variant 1 (Năng suất cao): greeting + task list + completion circle + reminders. Variant 2 (FocusFlow): stat boxes + mini calendar + timeline + priority list + sắp đến hạn | **Variant 2 đầy đủ hơn**, nên dùng làm Dashboard chính |
| `l_ch_c_a_t_i_qu_n_l_th_i_gian_bi_u_1` vs `l_ch_c_a_t_i_qu_n_l_th_i_gian_bi_u_2` | Variant 1: list view sự kiện theo ngày. Variant 2: card view + side panel chi tiết | Cả 2 đều hữu ích, có thể implement cả 2 dạng toggle (List/Card) |

### 2.2 Screens KHÔNG cần xóa

Kết luận: **Không cần xóa screen nào**. Tất cả 54 screens đều có giá trị riêng.

---

## 3. Trang Authentication & Onboarding

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `landing_page_productivity_flow` | `/` | — | [ ] Chưa implement |
| `ng_nh_p_productivity_flow` (Đăng nhập) | `/dang-nhap` | — | [ ] Chưa implement |
| `ng_k_t_i_kho_n_productivity_flow` (Đăng ký) | `/dang-ky` | — | [ ] Chưa implement |
| `ng_nh_p_k_t_n_i_mezon_productivity_flow` (Kết nối Mezon) | `/ket-noi-mezon` | `*bat-dau` | [ ] Chưa implement (bot có `*bat-dau` khởi tạo user) |
| `onboarding_thi_t_l_p_c_b_n_productivity_flow` (Thiết lập cơ bản) | `/onboarding/1` | `*bat-dau` | [ ] Chưa implement |
| `onboarding_th_i_quen_l_m_vi_c_productivity_flow` (Thói quen) | `/onboarding/2` | — | [ ] Chưa implement |
| `onboarding_k_t_n_i_mezon_productivity_flow` (Kết nối Mezon) | `/onboarding/3` | — | [ ] Chưa implement |
| `onboarding_s_n_s_ng_productivity_flow` (Sẵn sàng) | `/onboarding/4` | — | [ ] Chưa implement |

## 4. Trang Dashboard & Tổng quan

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `t_ng_quan_n_ng_su_t_qu_n_l_th_i_gian_bi_u` (Dashboard chính) | `/dashboard` | `*lich-hom-nay` | 🟡 Backend có `*lich-hom-nay`; [ ] Frontend chưa implement |
| `t_ng_quan_qu_n_l_th_i_gian_bi_u` (Dashboard variant) | `/dashboard` (variant) | `*lich-hom-nay` | 🟡 Backend có; [ ] Frontend chưa implement |
| `dashboard_tr_ng_th_i_tr_ng` (Dashboard empty state) | `/dashboard` (trạng thái trống) | — | [ ] Chưa implement |
| `l_ch_s_p_t_i_drawer` (Lịch sắp tới - drawer) | — (drawer overlay) | `*sap-toi` | 🟡 Backend có `*sap-toi [N]`; [ ] Frontend chưa implement |
| `t_ng_quan_mobile` (Tổng quan mobile) | `/dashboard` (responsive) | — | [ ] Chưa implement |

## 5. Trang Quản lý Lịch trình

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `l_ch_c_a_t_i_qu_n_l_th_i_gian_bi_u_1` (Lịch - list view) | `/lich` | `*lich-hom-nay`, `*lich-ngay` | 🟡 Backend có; [ ] Frontend chưa implement |
| `l_ch_c_a_t_i_qu_n_l_th_i_gian_bi_u_2` (Lịch - card view) | `/lich` (card view) | `*lich-hom-nay`, `*lich-ngay` | 🟡 Backend có; [ ] Frontend chưa implement |
| `l_ch_tu_n_productivity_flow` (Lịch tuần - grid) | `/lich?view=tuan` | `*lich-tuan`, `*lich-tuan-truoc`, `*lich-tuan-sau` | 🟡 Backend có; [ ] Frontend chưa implement |
| `l_ch_th_ng_productivity_flow` (Lịch tháng - grid) | `/lich?view=thang` | `*lich-thang` (Roadmap) | [ ] Cả backend lẫn frontend chưa implement |
| `danh_s_ch_t_t_c_l_ch_tr_nh` (Danh sách phân trang) | `/lich/tat-ca` | `*danh-sach [trang]` | 🟡 Backend có `*danh-sach` phân trang; [ ] Frontend chưa implement |
| `th_m_l_ch_m_i_qu_n_l_th_i_gian_bi_u` (Thêm lịch mới) | `/lich/tao-moi` | `*them-lich` (form interactive) | 🟡 Backend có form interactive; [ ] Frontend chưa implement |
| `popup_th_m_nhanh_l_ch` (Popup thêm nhanh) | — (modal overlay) | `*them-lich` | [ ] Chưa implement |
| `chi_ti_t_l_ch_qu_n_l_th_i_gian_bi_u` (Chi tiết lịch) | `/lich/:id` | `*chi-tiet <ID>` | 🟡 Backend có; [ ] Frontend chưa implement |
| `ch_nh_s_a_l_ch_qu_n_l_th_i_gian_bi_u` (Chỉnh sửa lịch) | `/lich/:id/sua` | `*sua-lich <ID>` | 🟡 Backend có; [ ] Frontend chưa implement |
| `t_m_ki_m_l_ch_qu_n_l_th_i_gian_bi_u` (Tìm kiếm) | `/lich/tim-kiem` | `*tim-kiem <từ khóa>` | 🟡 Backend có; [ ] Frontend chưa implement |
| `l_ch_c_a_t_i_mobile` (Lịch mobile) | `/lich` (responsive) | — | [ ] Chưa implement |

## 6. Trang Nhắc nhở & Lịch lặp

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `nh_c_vi_c_qu_n_l_th_i_gian_bi_u` (Nhắc việc) | `/nhac-viec` | `*nhac`, `*nhac-sau`, `*tat-nhac` | 🟡 Backend có đầy đủ (cron + snooze multi-preset); [ ] Frontend chưa implement |
| `c_i_t_l_ch_l_p_l_i` (Cài đặt lịch lặp - modal) | — (modal overlay) | `*lich-lap <ID> <daily\|weekly\|monthly> [interval] [--den]` | 🟡 Backend có; [ ] Frontend chưa implement |

## 7. Trang Mẫu lịch (Templates)

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `m_u_l_ch_qu_n_l_th_i_gian_bi_u` (Mẫu lịch) | `/mau-lich` | `*mau-lich-excel` | 🟡 Backend có export mẫu Excel; [ ] Frontend chưa implement |
| `m_u_l_ch_tr_ng_th_i_tr_ng` (Mẫu lịch - trống) | `/mau-lich` (empty state) | — | [ ] Chưa implement |

## 8. Trang Thẻ (Tags)

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `qu_n_l_th_productivity_flow` (Quản lý thẻ) | `/the` | Tag/nhãn (Roadmap) | [ ] Cả backend lẫn frontend chưa implement |
| `qu_n_l_th_tr_ng_th_i_tr_ng` (Thẻ - trống) | `/the` (empty state) | — | [ ] Chưa implement |

## 9. Trang Thống kê

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `th_ng_k_n_ng_su_t_productivity_flow` (Thống kê năng suất - variant 1) | `/thong-ke` | `*thong-ke [tuan\|thang\|nam\|all]` | 🟡 Backend có (completion rate, hot hours, breakdown); [ ] Frontend chưa implement |
| `th_ng_k_n_ng_su_t_qu_n_l_th_i_gian_bi_u` (Thống kê - variant 2) | `/thong-ke` (variant) | `*thong-ke` | 🟡 Backend có; [ ] Frontend chưa implement |
| `t_ng_quan_n_ng_su_t_qu_n_l_th_i_gian_bi_u` (Tổng quan năng suất) | `/thong-ke/tong-quan` | `*thong-ke` | 🟡 Backend có; [ ] Frontend chưa implement |

## 10. Trang Cài đặt & Hồ sơ

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `c_i_t_c_nh_n_productivity_flow` (Cài đặt - variant 1) | `/cai-dat` | `*cai-dat` (form interactive) | 🟡 Backend có; [ ] Frontend chưa implement |
| `c_i_t_c_nh_n_qu_n_l_th_i_gian_bi_u` (Cài đặt - variant 2) | `/cai-dat` (variant) | `*cai-dat` | 🟡 Backend có; [ ] Frontend chưa implement |
| `h_s_ng_i_d_ng` (Hồ sơ người dùng) | `/ho-so` | — | [ ] Chưa implement |

## 11. Trang Import/Export & Chia sẻ

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `import_export_l_ch_productivity_flow` (Import/Export) | `/lich/import` | `*them-lich-excel` | 🟡 Backend có import Excel; [ ] Frontend chưa implement |
| `trang_xu_t_l_ch_tr_nh` (Xuất lịch trình) | `/lich/xuat` | Export `.ics` (Roadmap) | [ ] Cả backend lẫn frontend chưa implement |
| `chia_s_l_ch_productivity_flow` (Chia sẻ lịch) | `/chia-se` | — | [ ] Chưa implement |
| `l_ch_s_thay_i_productivity_flow` (Lịch sử thay đổi) | `/lich-su` | — | [ ] Chưa implement |

## 12. Trang Thông báo & Trợ giúp

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `trung_t_m_th_ng_b_o_productivity_flow` (Trung tâm thông báo) | `/thong-bao` | Reminder system (cron + DM) | 🟡 Backend có gửi nhắc nhở tự động; [ ] Frontend notification center chưa implement |
| `trung_t_m_tr_gi_p_productivity_flow` (Trung tâm trợ giúp) | `/tro-giup` | `*help` | 🟡 Backend có `*help`; [ ] Frontend chưa implement |

## 13. Trạng thái hệ thống & UX

| Màn hình thiết kế | Mô tả | Trạng thái |
|---|---|---|
| `ho_n_th_nh_l_ch_tr_nh_th_nh_c_ng` | Overlay hoàn thành (checkmark + streak + progress) | [ ] Chưa implement |
| `tr_ng_th_i_loading_skeleton_ui` | Skeleton loading cho 3 trang chính | [ ] Chưa implement |
| `b_toast_notifications_c_c_bi_n_th` | 5 variant toast (success, completion, warning, error, info) | [ ] Chưa implement |
| `l_i_k_t_n_i_h_th_ng` | Error: Lỗi kết nối hệ thống | [ ] Chưa implement |
| `l_i_ng_b_mezon` | Error: Lỗi đồng bộ Mezon | [ ] Chưa implement |
| `l_i_nh_p_d_li_u` | Error: Lỗi nhập dữ liệu (validation) | [ ] Chưa implement |
| `l_i_t_i_d_li_u` | Error: Lỗi tải dữ liệu | [ ] Chưa implement |
| `m_ng_kh_ng_n_nh` | Error: Mạng không ổn định | [ ] Chưa implement |

## 14. Confirmation Dialogs

| Màn hình thiết kế | Mô tả | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `x_c_nh_n_x_a_l_ch_tr_nh` | Xác nhận xóa lịch | `*xoa-lich <ID>` (có confirm) | 🟡 Backend có; [ ] Frontend chưa implement |
| `x_c_nh_n_x_a_m_u_l_ch` | Xác nhận xóa mẫu lịch | — | [ ] Chưa implement |
| `x_c_nh_n_x_a_th` | Xác nhận xóa thẻ | — | [ ] Chưa implement |
| `x_c_nh_n_d_ng_chia_s` | Xác nhận dừng chia sẻ | — | [ ] Chưa implement |

## 15. Design System

| Thành phần | File tham chiếu | Trạng thái |
|---|---|---|
| Color palette (primary tím `#4F378A`, surface trắng `#FDF7FF`) | `DESIGN.md` | [ ] Chưa implement |
| Typography (Inter, display 40px → label 12px) | `DESIGN.md` | [ ] Chưa implement |
| Spacing (unit 4px, sidebar 260px, topbar 56px, card padding 20px) | `DESIGN.md` | [ ] Chưa implement |
| Border radius (sm 2px → full 9999px) | `DESIGN.md` | [ ] Chưa implement |

---

## 16. Backend Commands — Đã implement (đối chiếu design)

> Tất cả bot commands hiện tại chạy qua Mezon chat. Frontend web sẽ cần API REST riêng.

### Đã có backend, cần thêm API + Frontend

| Bot Command | Chức năng | Backend | API REST | Frontend |
|---|---|---|---|---|
| `*bat-dau` | Khởi tạo user + cài đặt | [x] | [ ] | [ ] |
| `*help` | Hướng dẫn sử dụng | [x] | [ ] | [ ] |
| `*lich-hom-nay` | Xem lịch hôm nay | [x] | [ ] | [ ] |
| `*lich-ngay [DD-MM-YYYY]` | Xem lịch theo ngày | [x] | [ ] | [ ] |
| `*lich-tuan [DD-MM-YYYY]` | Xem lịch tuần | [x] | [ ] | [ ] |
| `*lich-tuan-truoc` / `*lich-tuan-sau` | Tuần trước/sau | [x] | [ ] | [ ] |
| `*chi-tiet <ID>` | Chi tiết lịch | [x] | [ ] | [ ] |
| `*sap-toi [N]` | N lịch sắp tới | [x] | [ ] | [ ] |
| `*danh-sach [trang]` | Tất cả lịch, phân trang | [x] | [ ] | [ ] |
| `*tim-kiem <từ khóa>` | Tìm kiếm | [x] | [ ] | [ ] |
| `*thong-ke [tuan\|thang\|nam\|all]` | Thống kê năng suất | [x] | [ ] | [ ] |
| `*them-lich` | Thêm lịch mới (form) | [x] | [ ] | [ ] |
| `*them-lich-excel` | Import từ Excel | [x] | [ ] | [ ] |
| `*mau-lich-excel` | Tải mẫu Excel | [x] | [ ] | [ ] |
| `*sua-lich <ID>` | Sửa lịch | [x] | [ ] | [ ] |
| `*xoa-lich <ID>` | Xóa lịch (confirm) | [x] | [ ] | [ ] |
| `*hoan-thanh <ID>` | Đánh dấu hoàn thành | [x] | [ ] | [ ] |
| `*lich-lap <ID> ...` | Bật lịch lặp | [x] | [ ] | [ ] |
| `*bo-lap <ID>` | Tắt lịch lặp | [x] | [ ] | [ ] |
| `*nhac <ID> <phút>` | Đặt nhắc nhở | [x] | [ ] | [ ] |
| `*nhac-sau <ID> <thời gian>` | Nhắc tương đối | [x] | [ ] | [ ] |
| `*tat-nhac <ID>` | Tắt nhắc | [x] | [ ] | [ ] |
| `*cai-dat` | Cài đặt cá nhân | [x] | [ ] | [ ] |

### Chưa có backend (Roadmap)

| Tính năng | Có design? | Backend | API REST | Frontend |
|---|---|---|---|---|
| Tag/nhãn + filter | [x] (`qu_n_l_th_*`) | [ ] | [ ] | [ ] |
| `*copy-lich` (duplicate) | [ ] | [ ] | [ ] | [ ] |
| `*lich-thang` (view tháng) | [x] (`l_ch_th_ng_*`) | [ ] | [ ] | [ ] |
| `*hoan-tac` (undo) | [ ] | [ ] | [ ] | [ ] |
| Export `.ics` | [x] (`trang_xu_t_l_ch_tr_nh`) | [ ] | [ ] | [ ] |
| Chia sẻ lịch | [x] (`chia_s_l_ch_*`) | [ ] | [ ] | [ ] |
| Lịch sử thay đổi | [x] (`l_ch_s_thay_i_*`) | [ ] | [ ] | [ ] |
| Hồ sơ người dùng | [x] (`h_s_ng_i_d_ng`) | [ ] | [ ] | [ ] |

---

## 17. Đề xuất ưu tiên (MVP → v1)

### Sprint 1: Hạ tầng Frontend

- [ ] Chọn tech stack frontend (Next.js 14 / Vite + React / Nuxt)
- [ ] Setup monorepo hoặc folder riêng cho web app
- [ ] Implement design system từ `DESIGN.md` (Tailwind config: colors, fonts, spacing)
- [ ] Thống nhất branding: chọn 1 tên app + 1 style từ các variant

### Sprint 2: Core Pages (MVP)

- [ ] Landing page + Auth (Đăng nhập / Đăng ký / Kết nối Mezon)
- [ ] Dashboard / Tổng quan
- [ ] Lịch của tôi (list view + card view)
- [ ] Thêm lịch / Sửa lịch / Chi tiết lịch
- [ ] Xóa lịch (confirmation dialog)
- [ ] API REST endpoints cho tất cả CRUD operations

### Sprint 3: Extended Features

- [ ] Lịch tuần (grid) + Lịch tháng (grid)
- [ ] Tìm kiếm + Danh sách phân trang
- [ ] Nhắc việc + Cài đặt lịch lặp
- [ ] Thống kê năng suất
- [ ] Cài đặt cá nhân
- [ ] Onboarding flow (4 bước)

### Sprint 4: Polish & Extra

- [ ] Mẫu lịch (Templates)
- [ ] Import/Export (Excel + .ics + PDF)
- [ ] Tags / Thẻ
- [ ] Chia sẻ lịch
- [ ] Lịch sử thay đổi
- [ ] Trung tâm thông báo + Trợ giúp
- [ ] Hồ sơ người dùng
- [ ] Mobile responsive
- [ ] Loading/Skeleton states + Toast notifications + Error states

---

## 18. Kết luận nhanh

- **Backend: ~70% hoàn thành** — Tất cả core bot commands đã hoạt động (CRUD lịch, nhắc nhở, thống kê, lịch lặp, import Excel, cài đặt). Thiếu: Tag/nhãn, lịch tháng, undo, export .ics, chia sẻ.
- **Design: ~100% hoàn thành** — 54 screens Stitch phủ đầy đủ tất cả chức năng hiện có + roadmap + UX states. Không cần thêm screen mới.
- **Frontend: 0% hoàn thành** — Chưa có web app. Cần: chọn tech stack → setup design system → implement API REST → build UI.
- **Không có screen nào cần xóa** — Tất cả 54 screens đều có giá trị riêng. Các cặp variant nên chọn 1 khi implement.
