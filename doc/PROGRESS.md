# Tiến độ Hệ Thống Chatbot Quản Lý Sự Kiện & Nhắc Việc Trên Mezon — Design vs. Implementation

> Đối chiếu giữa bộ design Stitch (54 màn hình + `DESIGN.md`) và mã nguồn backend hiện tại trong repo `BotThoiGianBieu`. Tick vào ô khi một mục được hoàn thành.
>
> Quy ước: `[x]` đã xong · `[ ]` chưa làm · `🟡` ghi chú nghĩa là làm một phần (xem chi tiết trong từng dòng).

## 1. Tóm tắt tổng

- [x] Backend NestJS + TypeORM + PostgreSQL + mezon-sdk (đầy đủ bot commands)
- [x] Database schema (events, users, reminders, settings) + migrations idempotent
- [x] CI / quality gates (`.github/workflows/ci.yml`: lint + build + test, 1136+ tests)
- [x] Docker support (Dockerfile multi-stage + docker-compose)
- [x] Design system Stitch (palette tím/trắng, Inter font, spacing 4px, sidebar 260px)
- [x] Frontend web app (Next.js 14 + Tailwind CSS — 30+ trang, 12 components, responsive)
- [x] API REST cho frontend (25+ endpoints: schedules, tags, templates, users, shares, audit)
- [x] Kết nối frontend ↔ backend API (SWR hooks với fallback mock data)
- [x] Mezon OAuth 2.0 authentication (web login flow)
- [x] Admin system (AdminGuard, AdminService, 7 trang web, 6 bot commands)
- [x] Light/Dark theme support + micro-interactions
- [x] SEO chuẩn (metadata, sitemap, robots, JSON-LD)
- [x] Đa ngôn ngữ (LanguageContext)

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
| `landing_page_productivity_flow` | `/` | — | [x] Đã implement (PR #44) |
| `ng_nh_p_productivity_flow` (Đăng nhập) | `/dang-nhap` | — | [x] Đã implement (PR #47) — Mezon OAuth |
| `ng_k_t_i_kho_n_productivity_flow` (Đăng ký) | `/dang-ky` | — | [x] Đã implement (PR #47) |
| `ng_nh_p_k_t_n_i_mezon_productivity_flow` (Kết nối Mezon) | `/ket-noi-mezon` | `*bat-dau` | [x] Đã implement (PR #49) |
| `onboarding_thi_t_l_p_c_b_n_productivity_flow` (Thiết lập cơ bản) | `/onboarding/1` | `*bat-dau` | [x] Đã implement (PR #47) |
| `onboarding_th_i_quen_l_m_vi_c_productivity_flow` (Thói quen) | `/onboarding/2` | — | [x] Đã implement (PR #47) |
| `onboarding_k_t_n_i_mezon_productivity_flow` (Kết nối Mezon) | `/onboarding/3` | — | [x] Đã implement (PR #47) |
| `onboarding_s_n_s_ng_productivity_flow` (Sẵn sàng) | `/onboarding/4` | — | [x] Đã implement (PR #47) |

## 4. Trang Dashboard & Tổng quan

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `t_ng_quan_n_ng_su_t_qu_n_l_th_i_gian_bi_u` (Dashboard chính) | `/dashboard` | `*lich-hom-nay` | [x] Đã implement (PR #46) + API (PR #52) |
| `t_ng_quan_qu_n_l_th_i_gian_bi_u` (Dashboard variant) | `/dashboard` (variant) | `*lich-hom-nay` | [x] Kết hợp vào Dashboard chính |
| `dashboard_tr_ng_th_i_tr_ng` (Dashboard empty state) | `/dashboard` (trạng thái trống) | — | [x] Đã implement (PR #50 — EmptyStates) |
| `l_ch_s_p_t_i_drawer` (Lịch sắp tới - drawer) | — (drawer overlay) | `*sap-toi` | [x] Đã implement (PR #50 — UpcomingDrawer) |
| `t_ng_quan_mobile` (Tổng quan mobile) | `/dashboard` (responsive) | — | [x] Đã implement (PR #48 — responsive) |

## 5. Trang Quản lý Lịch trình

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `l_ch_c_a_t_i_qu_n_l_th_i_gian_bi_u_1` (Lịch - list view) | `/lich` | `*lich-hom-nay`, `*lich-ngay` | [x] Đã implement (PR #46) + API (PR #52) |
| `l_ch_c_a_t_i_qu_n_l_th_i_gian_bi_u_2` (Lịch - card view) | `/lich` (card view) | `*lich-hom-nay`, `*lich-ngay` | [x] Đã implement (PR #46 — toggle list/card) |
| `l_ch_tu_n_productivity_flow` (Lịch tuần - grid) | `/lich?view=tuan` | `*lich-tuan`, `*lich-tuan-truoc`, `*lich-tuan-sau` | [x] Đã implement (PR #47 — week view) |
| `l_ch_th_ng_productivity_flow` (Lịch tháng - grid) | `/lich?view=thang` | `*lich-thang` (Roadmap) | [x] Đã implement (PR #46 — month view) |
| `danh_s_ch_t_t_c_l_ch_tr_nh` (Danh sách phân trang) | `/lich/tat-ca` | `*danh-sach [trang]` | [x] Đã implement (PR #50) |
| `th_m_l_ch_m_i_qu_n_l_th_i_gian_bi_u` (Thêm lịch mới) | `/lich/tao-moi` | `*them-lich` (form interactive) | [x] Đã implement (PR #46) |
| `popup_th_m_nhanh_l_ch` (Popup thêm nhanh) | — (modal overlay) | `*them-lich` | [x] Đã implement (PR #49 — QuickAddModal) |
| `chi_ti_t_l_ch_qu_n_l_th_i_gian_bi_u` (Chi tiết lịch) | `/lich/:id` | `*chi-tiet <ID>` | [x] Đã implement (PR #46) |
| `ch_nh_s_a_l_ch_qu_n_l_th_i_gian_bi_u` (Chỉnh sửa lịch) | `/lich/:id/sua` | `*sua-lich <ID>` | [x] Đã implement (PR #46) |
| `t_m_ki_m_l_ch_qu_n_l_th_i_gian_bi_u` (Tìm kiếm) | `/lich/tim-kiem` | `*tim-kiem <từ khóa>` | [x] Đã implement (PR #49) |
| `l_ch_c_a_t_i_mobile` (Lịch mobile) | `/lich` (responsive) | — | [x] Đã implement (PR #48 — responsive) |

## 6. Trang Nhắc nhở & Lịch lặp

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `nh_c_vi_c_qu_n_l_th_i_gian_bi_u` (Nhắc việc) | `/nhac-viec` | `*nhac`, `*nhac-sau`, `*tat-nhac` | [x] Đã implement (PR #47) |
| `c_i_t_l_ch_l_p_l_i` (Cài đặt lịch lặp - modal) | — (modal overlay) | `*lich-lap <ID> <daily\|weekly\|monthly> [interval] [--den]` | [x] Đã implement (PR #49 — RecurrenceModal) |

## 7. Trang Mẫu lịch (Templates)

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `m_u_l_ch_qu_n_l_th_i_gian_bi_u` (Mẫu lịch) | `/mau-lich` | `*mau-lich-excel` | [x] Đã implement (PR #46) |
| `m_u_l_ch_tr_ng_th_i_tr_ng` (Mẫu lịch - trống) | `/mau-lich` (empty state) | — | [x] Đã implement (PR #50 — EmptyStates) |

## 8. Trang Thẻ (Tags)

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `qu_n_l_th_productivity_flow` (Quản lý thẻ) | `/the` | Tag/nhãn | [x] Frontend (PR #46) + API (PR #52) |
| `qu_n_l_th_tr_ng_th_i_tr_ng` (Thẻ - trống) | `/the` (empty state) | — | [x] Đã implement (PR #50 — EmptyStates) |

## 9. Trang Thống kê

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `th_ng_k_n_ng_su_t_productivity_flow` (Thống kê năng suất - variant 1) | `/thong-ke` | `*thong-ke [tuan\|thang\|nam\|all]` | [x] Đã implement (PR #46) + API (PR #52) |
| `th_ng_k_n_ng_su_t_qu_n_l_th_i_gian_bi_u` (Thống kê - variant 2) | `/thong-ke` (variant) | `*thong-ke` | [x] Kết hợp vào trang Thống kê chính |
| `t_ng_quan_n_ng_su_t_qu_n_l_th_i_gian_bi_u` (Tổng quan năng suất) | `/thong-ke/tong-quan` | `*thong-ke` | [x] Kết hợp vào Dashboard |

## 10. Trang Cài đặt & Hồ sơ

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `c_i_t_c_nh_n_productivity_flow` (Cài đặt - variant 1) | `/cai-dat` | `*cai-dat` (form interactive) | [x] Đã implement (PR #46) + API (PR #52) |
| `c_i_t_c_nh_n_qu_n_l_th_i_gian_bi_u` (Cài đặt - variant 2) | `/cai-dat` (variant) | `*cai-dat` | [x] Kết hợp cả 2 variant (tabs: Chung, Thông báo, Tích hợp, Mẫu) |
| `h_s_ng_i_d_ng` (Hồ sơ người dùng) | `/ho-so` | — | [x] Đã implement (PR #48) |

## 11. Trang Import/Export & Chia sẻ

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `import_export_l_ch_productivity_flow` (Import/Export) | `/nhap-xuat` | `*them-lich-excel` | [x] Đã implement (PR #48) |
| `trang_xu_t_l_ch_tr_nh` (Xuất lịch trình) | `/lich/xuat` | Export `.ics` (Roadmap) | [x] Frontend đã implement (PR #50) |
| `chia_s_l_ch_productivity_flow` (Chia sẻ lịch) | `/chia-se` | — | [x] Đã implement (PR #47) |
| `l_ch_s_thay_i_productivity_flow` (Lịch sử thay đổi) | `/lich-su` | — | [x] Đã implement (PR #47) |

## 12. Trang Thông báo & Trợ giúp

| Màn hình thiết kế | Đường dẫn dự kiến | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `trung_t_m_th_ng_b_o_productivity_flow` (Trung tâm thông báo) | `/thong-bao` | Reminder system (cron + DM) | [x] Đã implement (PR #48) |
| `trung_t_m_tr_gi_p_productivity_flow` (Trung tâm trợ giúp) | `/tro-giup` | `*help` | [x] Đã implement (PR #49) |

## 13. Trạng thái hệ thống & UX

| Màn hình thiết kế | Mô tả | Trạng thái |
|---|---|---|
| `ho_n_th_nh_l_ch_tr_nh_th_nh_c_ng` | Overlay hoàn thành (checkmark + streak + progress) | [x] Đã implement (PR #50 — CompletionOverlay) |
| `tr_ng_th_i_loading_skeleton_ui` | Skeleton loading cho 3 trang chính | [x] Đã implement (PR #48 — SkeletonLoader) |
| `b_toast_notifications_c_c_bi_n_th` | 5 variant toast (success, completion, warning, error, info) | [x] Đã implement (PR #48 — Toast) |
| `l_i_k_t_n_i_h_th_ng` | Error: Lỗi kết nối hệ thống | [x] Đã implement (PR #49 — ErrorStates) |
| `l_i_ng_b_mezon` | Error: Lỗi đồng bộ Mezon | [x] Đã implement (PR #49 — ErrorStates) |
| `l_i_nh_p_d_li_u` | Error: Lỗi nhập dữ liệu (validation) | [x] Đã implement (PR #49 — ErrorStates) |
| `l_i_t_i_d_li_u` | Error: Lỗi tải dữ liệu | [x] Đã implement (PR #49 — ErrorStates) |
| `m_ng_kh_ng_n_nh` | Error: Mạng không ổn định | [x] Đã implement (PR #49 — ErrorStates) |

## 14. Confirmation Dialogs

| Màn hình thiết kế | Mô tả | Tương ứng bot command | Trạng thái |
|---|---|---|---|
| `x_c_nh_n_x_a_l_ch_tr_nh` | Xác nhận xóa lịch | `*xoa-lich <ID>` (có confirm) | [x] Đã implement (PR #47 — DeleteConfirmDialog) |
| `x_c_nh_n_x_a_m_u_l_ch` | Xác nhận xóa mẫu lịch | — | [x] Đã implement (PR #50 — ConfirmDialogs) |
| `x_c_nh_n_x_a_th` | Xác nhận xóa thẻ | — | [x] Đã implement (PR #50 — ConfirmDialogs) |
| `x_c_nh_n_d_ng_chia_s` | Xác nhận dừng chia sẻ | — | [x] Đã implement (PR #50 — ConfirmDialogs) |

## 15. Design System

| Thành phần | File tham chiếu | Trạng thái |
|---|---|---|
| Color palette (primary tím `#4F378A`, surface trắng `#FDF7FF`) | `DESIGN.md` | [x] Đã implement (Tailwind config + globals.css) |
| Typography (Inter, display 40px → label 12px) | `DESIGN.md` | [x] Đã implement |
| Spacing (unit 4px, sidebar 260px, topbar 56px, card padding 20px) | `DESIGN.md` | [x] Đã implement |
| Border radius (sm 2px → full 9999px) | `DESIGN.md` | [x] Đã implement |

---

## 16. Backend Commands — Đối chiếu với API REST + Frontend

| Bot Command | Chức năng | Backend | API REST | Frontend |
|---|---|---|---|---|
| `*bat-dau` | Khởi tạo user + cài đặt | [x] | [x] | [x] |
| `*help` | Hướng dẫn sử dụng | [x] | — | [x] `/tro-giup` |
| `*lich-hom-nay` | Xem lịch hôm nay | [x] | [x] | [x] |
| `*lich-ngay [DD-MM-YYYY]` | Xem lịch theo ngày | [x] | [x] | [x] |
| `*lich-tuan [DD-MM-YYYY]` | Xem lịch tuần | [x] | [x] | [x] |
| `*lich-tuan-truoc` / `*lich-tuan-sau` | Tuần trước/sau | [x] | [x] | [x] |
| `*chi-tiet <ID>` | Chi tiết lịch | [x] | [x] | [x] |
| `*sap-toi [N]` | N lịch sắp tới | [x] | [x] | [x] |
| `*danh-sach [trang]` | Tất cả lịch, phân trang | [x] | [x] | [x] |
| `*tim-kiem <từ khóa>` | Tìm kiếm | [x] | [x] | [x] |
| `*thong-ke [tuan\|thang\|nam\|all]` | Thống kê năng suất | [x] | [x] | [x] |
| `*them-lich` | Thêm lịch mới (form) | [x] | [x] | [x] |
| `*them-lich-excel` | Import từ Excel | [x] | — | [x] `/nhap-xuat` |
| `*mau-lich-excel` | Tải mẫu Excel | [x] | — | [x] `/nhap-xuat` |
| `*sua-lich <ID>` | Sửa lịch | [x] | [x] | [x] |
| `*xoa-lich <ID>` | Xóa lịch (confirm) | [x] | [x] | [x] |
| `*hoan-thanh <ID>` | Đánh dấu hoàn thành | [x] | [x] | [x] |
| `*lich-lap <ID> ...` | Bật lịch lặp | [x] | [x] | [x] |
| `*bo-lap <ID>` | Tắt lịch lặp | [x] | [x] | [x] |
| `*nhac <ID> <phút>` | Đặt nhắc nhở | [x] | — | [x] `/nhac-viec` |
| `*nhac-sau <ID> <thời gian>` | Nhắc tương đối | [x] | — | [x] |
| `*tat-nhac <ID>` | Tắt nhắc | [x] | — | [x] |
| `*cai-dat` | Cài đặt cá nhân | [x] | [x] | [x] |
| `*admin-stats` | KPI toàn hệ thống | [x] | [x] | [x] `/admin` |
| `*admin-broadcast` | Gửi DM tất cả users | [x] | [x] | [x] `/admin/thong-bao` |
| `*set-admin` / `*remove-admin` | Promote/demote admin | [x] | [x] | [x] `/admin/nguoi-dung` |
| `*lock-user` / `*unlock-user` | Khoá/mở khoá user | [x] | [x] | [x] `/admin/nguoi-dung` |

### Chưa có backend (Roadmap)

| Tính năng | Có design? | Backend | API REST | Frontend |
|---|---|---|---|---|
| Tag/nhãn + filter (many-to-many) | [x] | [ ] | [x] API có | [x] UI có |
| `*copy-lich` (duplicate) | [ ] | [ ] | [ ] | [ ] |
| `*hoan-tac` (undo) | [ ] | [ ] | [ ] | [ ] |
| Export `.ics` (backend logic) | [x] | [ ] | [ ] | [x] UI có |
| Mention `@user` trong reminder | [ ] | [ ] | [ ] | [ ] |

---

## 17. Sprint History

### Sprint 1: Hạ tầng Frontend — DONE

- [x] Tech stack: Next.js 14 + Tailwind CSS + TypeScript
- [x] Setup monorepo (npm workspaces: `app/bot` + `app/web`)
- [x] Implement design system (Tailwind config: colors `#4F378A`, Inter font, spacing 4px)
- [x] Thống nhất branding thành "Bot Thời Gian Biểu"

### Sprint 2: Core Pages (MVP) — DONE

- [x] Landing page + Auth (Mezon OAuth login) — PR #44, #47
- [x] Dashboard / Tổng quan — PR #46
- [x] Lịch của tôi (list view + card view + month/week/day) — PR #46, #47
- [x] Thêm lịch / Sửa lịch / Chi tiết lịch — PR #46
- [x] Xóa lịch (confirmation dialog) — PR #47
- [x] API REST endpoints (25+ endpoints) — PR #52

### Sprint 3: Extended Features — DONE

- [x] Lịch tuần (grid) + Lịch tháng (grid) — PR #46, #47
- [x] Tìm kiếm + Danh sách phân trang — PR #49, #50
- [x] Nhắc việc + Cài đặt lịch lặp — PR #47, #49
- [x] Thống kê năng suất — PR #46
- [x] Cài đặt cá nhân — PR #46
- [x] Onboarding flow (4 bước) — PR #47

### Sprint 4: Polish & Extra — DONE

- [x] Mẫu lịch (Templates) — PR #46
- [x] Import/Export — PR #48, #50
- [x] Tags / Thẻ — PR #46
- [x] Chia sẻ lịch — PR #47
- [x] Lịch sử thay đổi — PR #47
- [x] Trung tâm thông báo + Trợ giúp — PR #48, #49
- [x] Hồ sơ người dùng — PR #48
- [x] Mobile responsive — PR #48
- [x] Loading/Skeleton states + Toast notifications + Error states — PR #48, #49

### Sprint 5: Admin & Nâng cao — DONE

- [x] Admin system (7 trang, AdminGuard, 6 bot commands) — PR #53
- [x] Light/Dark theme + micro-interactions
- [x] SEO chuẩn (metadata, sitemap, robots, JSON-LD)
- [x] Đa ngôn ngữ (LanguageContext)
- [x] SWR data fetching — API-first với mock data fallback

---

## 18. Kết luận

- **Backend: ~85% hoàn thành** — Core bot commands + REST API + Admin system. Thiếu: tag many-to-many backend, undo, export .ics backend.
- **Design: 100% hoàn thành** — 54 screens Stitch phủ đầy đủ. Tất cả đã implement.
- **Frontend: ~95% hoàn thành** — 30+ trang, 12 reusable components, responsive, light/dark theme, SWR + API, SEO, đa ngôn ngữ.
- **Admin: 100% hoàn thành** — 7 trang web + 6 bot commands + API endpoints + AdminGuard + broadcast.
- **Testing: 1136+ tests pass** (77 bot suites). Web tests cần fix mock setup.
