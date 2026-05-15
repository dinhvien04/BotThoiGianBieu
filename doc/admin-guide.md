# Hướng dẫn quản trị (Admin)

Tài liệu này mô tả toàn bộ hệ thống quản trị (admin) đã được bổ sung vào BotThoiGianBieu — bao gồm phân quyền, các trang `/admin/*`, lệnh bot dành cho admin, audit log và cấu hình hệ thống.

## 1. Tổng quan

- **Bảng `users`** có thêm 2 cột:
  - `role` (`user` | `admin`, mặc định `user`)
  - `is_locked` (boolean, mặc định `false`) — user bị khoá sẽ không qua được `SessionGuard`/`AdminGuard`.
- **Bảng mới `system_settings`** (key/value JSONB) — lưu các flag/cấu hình runtime.
- **Bảng mới `broadcasts`** — lịch sử các lần broadcast DM Mezon.
- **`schedule_audit_logs`** — đã tồn tại; admin có quyền đọc audit của toàn hệ thống.

Migration: <code>app/bot/migrations/016-add-admin-and-system-settings.sql</code>.

## 2. Phân quyền và khởi tạo admin

Admin được tự động promote khi bot khởi động từ biến môi trường `ADMIN_USER_IDS` (cách nhau bằng dấu phẩy):

```bash
ADMIN_USER_IDS="123456789,987654321"
```

`AdminBootstrapService` chạy `onApplicationBootstrap`:

1. Với mỗi `user_id`: nếu chưa có row → tạo mới với `role='admin'`, `is_locked=false`.
2. Nếu đã có row → đảm bảo `role='admin'` và `is_locked=false`.

> Không có cơ chế seed nào khác — đó là **single source of truth** cho admin khởi tạo.

`AdminGuard` (NestJS) gắn lên toàn bộ `/api/admin/*` và kiểm tra:

1. Cookie session hợp lệ (`btgb_auth`).
2. User tồn tại trong DB.
3. `is_locked === false`.
4. `role === 'admin'`.

`SessionGuard` cũng kiểm `is_locked` để chặn user bị khoá ở mọi endpoint thường.

Frontend middleware (`app/web/src/middleware.ts`) bảo vệ `/admin/*` — chưa đăng nhập sẽ redirect về `/dang-nhap`. Bản thân page admin gọi `/api/admin/me` để kiểm role; user không phải admin sẽ thấy lỗi 403 do guard backend.

## 3. Trang web `/admin/*`

| Đường dẫn | Mô tả |
|-----------|------|
| `/admin` | Dashboard KPI + biểu đồ 30 ngày |
| `/admin/nguoi-dung` | Danh sách user, đổi role, khoá/mở khoá, xoá |
| `/admin/lich` | Lịch toàn hệ thống, lọc + xoá |
| `/admin/lich-su` | Audit log toàn hệ thống |
| `/admin/thong-bao` | Soạn và gửi broadcast, xem lịch sử |
| `/admin/thong-ke` | Biểu đồ thống kê dài hơn |
| `/admin/cai-dat` | Cấu hình `system_settings` (bot_enabled, signup_enabled, site_banner) |

Sidebar (`Sidebar.tsx`) chỉ hiển thị mục **Quản trị** khi `getUserProfile()` trả về `role === 'admin'`.

## 4. REST API

Tất cả endpoint dưới đây yêu cầu cookie `btgb_auth` của một admin (kiểm bằng `AdminGuard`).

```
GET    /api/admin/me                          # tự kiểm tra
GET    /api/admin/stats                       # KPI dashboard
GET    /api/admin/users?page&limit&search&role&locked
GET    /api/admin/users/:userId               # chi tiết user + thống kê lịch
PATCH  /api/admin/users/:userId/role          # body: { role: 'user'|'admin' }
PATCH  /api/admin/users/:userId/lock          # body: { locked: boolean }
DELETE /api/admin/users/:userId               # xoá user (cascade)
GET    /api/admin/schedules?page&limit&search&status&user_id
DELETE /api/admin/schedules/:id               # admin xoá lịch của bất kỳ user
GET    /api/admin/audit?page&limit&user_id&action&schedule_id
POST   /api/admin/broadcasts                  # body: { message, filter? }
GET    /api/admin/broadcasts?page&limit       # lịch sử broadcast
GET    /api/admin/settings                    # lấy toàn bộ system_settings
PUT    /api/admin/settings/:key               # body: { value }
```

Đáp ứng đều có dạng `{ success: true, ... }`. Lỗi auth/role trả `401`/`403`.

### Quy tắc bảo vệ

- Không thể tự gỡ quyền admin của chính mình (`PATCH /role` với role=user và userId trùng session).
- Không thể tự khoá tài khoản của chính mình (`PATCH /lock` với locked=true và userId trùng session).
- Không thể tự xoá tài khoản của chính mình.
- Broadcast với `message` rỗng bị từ chối với `400`.

## 5. Lệnh bot dành cho admin

| Lệnh | Mô tả |
|------|------|
| `*admin-stats` (alias `*admin-thong-ke`) | In KPI tổng quan của hệ thống |
| `*admin-broadcast <nội dung>` | Gửi DM cho mọi user (mặc định bỏ qua user bị khoá) |
| `*set-admin <user_id>` | Promote user khác lên admin |
| `*remove-admin <user_id>` | Hạ admin về user (không cho phép tự hạ chính mình) |
| `*lock-user <user_id>` | Khoá tài khoản user (không cho phép tự khoá chính mình) |
| `*unlock-user <user_id>` | Mở khoá tài khoản user |

Tất cả các lệnh đi qua helper `requireAdmin()` (xem <code>app/bot/src/bot/commands/admin/admin-base.ts</code>) — chặn nếu user chưa khởi tạo, đang bị khoá, hoặc không phải admin.

Các lệnh xuất hiện trong help dưới category mới **🛡️ ADMIN**.

## 6. Audit log

`ScheduleAuditLog` đã ghi `create/update/complete/delete` cho mỗi lịch. Admin có thể tra cứu toàn hệ thống tại `/admin/lich-su`. Filter hỗ trợ:

- `user_id` — chỉ các action của một user.
- `action` — `create | update | complete | delete`.
- `schedule_id` — chỉ một lịch cụ thể.

## 7. `system_settings`

Các key đã biết và hiển thị sẵn ở trang `/admin/cai-dat`:

| Key | Kiểu | Mô tả |
|-----|------|------|
| `bot_enabled` | boolean | Bật/tắt xử lý lệnh của bot |
| `signup_enabled` | boolean | Cho phép user mới khởi tạo tài khoản |
| `site_banner` | string | Banner hiển thị toàn site (để trống = ẩn) |

Mở rộng: thêm key mới vào `KNOWN_KEYS` ở <code>app/web/src/app/(dashboard)/admin/cai-dat/page.tsx</code> để có UI điều khiển; backend đã hỗ trợ mọi key bất kỳ qua `PUT /api/admin/settings/:key`.

## 8. Testing

Đơn vị/Integration đã có:

- `test/bot/admin/admin.guard.spec.ts`
- `test/bot/admin/admin.service.spec.ts`
- `test/bot/admin/broadcast.service.spec.ts`
- `test/bot/admin/admin-bootstrap.service.spec.ts`
- `test/bot/admin/admin.controller.spec.ts`
- `test/bot/admin/admin-commands.spec.ts`
- `test/web/components/AdminPages.test.tsx`
- `test/web/components/Sidebar.test.tsx` (đã mở rộng để cover admin link)

Chạy:

```bash
npm run lint
npm run build:all
npm test
```

## 9. Triển khai

Khi deploy:

1. Chạy migration `016-add-admin-and-system-settings.sql` (TypeORM `synchronize` bị tắt — luôn áp migration thủ công).
2. Set `ADMIN_USER_IDS` trên môi trường bot (chỉ những user_id đáng tin).
3. Khởi động lại bot — `AdminBootstrapService` sẽ promote.
4. Đăng nhập từ Mezon → web sẽ thấy mục **Quản trị** trên sidebar nếu user của bạn ở trong `ADMIN_USER_IDS`.
