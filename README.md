# 🤖 Bot Thời Gian Biểu Mezon

Hệ thống quản lý lịch trình, sự kiện và nhắc nhở tự động — gồm **Mezon Bot** (NestJS) và **Web Dashboard** (Next.js 14).

[![CI](https://github.com/dinhvien04/BotThoiGianBieu/actions/workflows/ci.yml/badge.svg)](https://github.com/dinhvien04/BotThoiGianBieu/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red)](https://nestjs.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

> 📖 **Tài liệu đầy đủ**: Xem [`doc/README.md`](./doc/README.md) để có **15+ tài liệu chi tiết** về setup, development, deployment và troubleshooting.

> 🤖 **AI Context**: Xem [`KIRO.md`](./KIRO.md) để biết chi tiết kiến trúc, luồng hoạt động và quy ước.

---

## 📦 Kiến trúc dự án

Monorepo sử dụng **npm workspaces**:

```
BotThoiGianBieu/
├── app/
│   ├── bot/                          # NestJS backend + Mezon bot
│   │   ├── src/
│   │   │   ├── main.ts               # Bootstrap NestJS
│   │   │   ├── app.module.ts         # Root module
│   │   │   ├── bot/                  # Mezon bot core (commands, registry)
│   │   │   ├── schedules/            # Schedule entity + service
│   │   │   ├── users/                # User & UserSettings entities
│   │   │   ├── auth/                 # Mezon OAuth authentication
│   │   │   ├── reminder/             # Cron jobs nhắc nhở tự động
│   │   │   └── shared/utils/         # Parsers, formatters, helpers
│   │   ├── test/                     # Jest test suite (964+ tests)
│   │   ├── migrations/               # SQL migrations (idempotent)
│   │   └── assets/                   # Excel template, bot assets
│   │
│   └── web/                          # Next.js 14 frontend
│       └── src/
│           ├── app/
│           │   ├── (auth)/           # Auth pages (đăng nhập, đăng ký)
│           │   ├── (dashboard)/      # Dashboard pages (protected)
│           │   │   ├── dashboard/    # Tổng quan năng suất
│           │   │   ├── lich/         # Quản lý lịch (CRUD, views, export)
│           │   │   ├── mau-lich/     # Mẫu lịch (Templates)
│           │   │   ├── the/          # Quản lý thẻ (Tags)
│           │   │   ├── thong-ke/     # Thống kê năng suất
│           │   │   ├── cai-dat/      # Cài đặt cá nhân
│           │   │   ├── nhac-viec/    # Nhắc việc
│           │   │   ├── chia-se/      # Chia sẻ lịch
│           │   │   ├── ho-so/        # Hồ sơ người dùng
│           │   │   ├── thong-bao/    # Trung tâm thông báo
│           │   │   ├── tro-giup/     # Trung tâm trợ giúp
│           │   │   └── ...           # Và nhiều trang khác
│           │   └── page.tsx          # Landing page
│           ├── components/
│           │   ├── dashboard/        # Reusable dashboard components
│           │   └── landing/          # Landing page components
│           └── middleware.ts          # Auth middleware
│
├── doc/                              # 15+ tài liệu chi tiết
├── docker-compose.yml                # Docker orchestration
└── package.json                      # Monorepo root
```

---

## 🚀 Khởi động nhanh

> 📚 **Tài liệu chi tiết**: Xem [`doc/setup-installation.md`](./doc/setup-installation.md) để có hướng dẫn setup đầy đủ.

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

```bash
cp .env.example .env
```

Chỉnh `.env`:

| Biến | Mô tả | Bắt buộc |
|------|--------|----------|
| `APPLICATION_ID` | Bot ID từ Mezon Developer Portal | ✅ |
| `APPLICATION_TOKEN` | Token bot từ Mezon Developer Portal | ✅ |
| `DATABASE_URL` | Connection string PostgreSQL (VD: Neon) | ✅ |
| `MEZON_CLIENT_ID` | Client ID cho OAuth web login | ✅ (web) |
| `MEZON_CLIENT_SECRET` | Client Secret cho OAuth web login | ✅ (web) |
| `AUTH_TOKEN_SECRET` | Secret key để ký JWT token | ✅ (web) |
| `BOT_PREFIX` | Prefix lệnh bot (mặc định: `*`) | ❌ |

### 3. Chạy migrations

```bash
psql "$DATABASE_URL" -f app/bot/migrations/007-add-recurrence.sql
psql "$DATABASE_URL" -f app/bot/migrations/008-add-priority.sql
```

> Tất cả migration đều **idempotent** — chạy lại nhiều lần vẫn an toàn.

### 4. Chạy dự án

```bash
# Frontend web (localhost:3000)
npm run web:dev

# Backend bot (localhost:3001)
npm run start:dev

# Build production
npm run web:build
npm run build
```

Nếu mọi thứ OK, bạn sẽ thấy:

```
🤖 Bot Thời Gian Biểu đã khởi động
✅ MezonClient đã đăng nhập thành công
🎧 Bot đang lắng nghe lệnh (prefix: "*")
```

> 🚀 **Production Deployment**: Xem [`doc/deployment-guide.md`](./doc/deployment-guide.md) để deploy với Docker/VPS.

---

## 🌐 Frontend Web App

Web dashboard xây dựng với **Next.js 14 + Tailwind CSS + TypeScript**, thiết kế theo Material Design 3 color system.

### Đã implement (~27 trang + 12 reusable components)

#### Trang chính
| Trang | Route | Mô tả |
|-------|-------|-------|
| Landing Page | `/` | Trang giới thiệu sản phẩm |
| Đăng nhập | `/dang-nhap` | Đăng nhập bằng Mezon OAuth |
| Đăng ký | `/dang-ky` | Đăng ký tài khoản |
| Kết nối Mezon | `/ket-noi-mezon` | 3-step connection flow |
| Dashboard | `/dashboard` | Tổng quan năng suất (stat cards, timeline, calendar, charts) |
| Lịch của tôi | `/lich` | Month view + list view với filters |
| Tất cả lịch trình | `/lich/tat-ca` | Table view với checkboxes, batch actions, pagination |
| Thêm lịch mới | `/lich/tao-moi` | Form tạo lịch đầy đủ |
| Chi tiết lịch | `/lich/[id]` | Xem chi tiết sự kiện |
| Chỉnh sửa lịch | `/lich/[id]/sua` | Form chỉnh sửa lịch |
| Tìm kiếm | `/lich/tim-kiem` | Tìm kiếm lịch với filter chips |
| Xuất lịch trình | `/lich/xuat` | Export (Excel, ICS, PDF) với filters |
| Mẫu lịch | `/mau-lich` | Quản lý template lịch |
| Quản lý Thẻ | `/the` | Tag management với màu sắc |
| Thống kê | `/thong-ke` | Charts & stats năng suất |
| Cài đặt | `/cai-dat` | Settings (Chung, Thông báo, Tích hợp, Mẫu) |
| Nhắc việc | `/nhac-viec` | Quản lý nhắc nhở |
| Chia sẻ | `/chia-se` | Chia sẻ lịch với người khác |
| Lịch sử | `/lich-su` | Lịch sử thay đổi |
| Hồ sơ | `/ho-so` | Thông tin cá nhân |
| Thông báo | `/thong-bao` | Trung tâm thông báo |
| Trợ giúp | `/tro-giup` | FAQ, bot commands, quick links |
| Nhập/Xuất | `/nhap-xuat` | Import/Export data |
| Onboarding | `/onboarding` | Thiết lập ban đầu (4 bước) |

#### Reusable Components
| Component | Mô tả |
|-----------|-------|
| `Sidebar` | Navigation sidebar responsive |
| `Topbar` | Header với search, notifications, user menu |
| `DeleteConfirmDialog` | Dialog xác nhận xóa generic |
| `ConfirmDialogs` | 3 dialogs chuyên biệt (xóa mẫu, xóa thẻ, dừng chia sẻ) |
| `EmptyStates` | Empty states cho Dashboard, Tags, Templates |
| `ErrorStates` | 5 error states (connection, sync, validation, data, network) |
| `QuickAddModal` | Modal thêm nhanh sự kiện |
| `RecurrenceModal` | Cài đặt lịch lặp (daily/weekly/monthly) |
| `UpcomingDrawer` | Drawer lịch sắp tới (24h/7d) |
| `CompletionOverlay` | Overlay hoàn thành lịch (streak, progress) |
| `SkeletonLoader` | Loading skeleton cho 3 trang chính |
| `Toast` | 5 variant toast notifications |

#### Authentication
- **Mezon OAuth 2.0** — Đăng nhập qua Mezon Developer Portal
- Backend auth routes: `/auth/mezon`, `/auth/mezon/callback`, `/auth/mezon/me`, `/auth/logout`
- JWT session management
- Middleware bảo vệ routes dashboard

---

## 🐳 Docker

### Build & chạy bằng docker-compose

```bash
cp .env.example .env       # chỉnh APPLICATION_TOKEN, DATABASE_URL
docker compose up -d --build
docker compose logs -f bot
```

### Build manual

```bash
docker build -f app/bot/Dockerfile -t bot-thoi-gian-bieu .
docker run --rm --env-file .env bot-thoi-gian-bieu
```

> Image dùng multi-stage build: stage `builder` cài full deps + compile TS, stage final chỉ giữ production deps + `dist/`.

---

## 📋 Lệnh bot

> 📖 **Tài liệu đầy đủ**: Xem [`doc/command-reference.md`](./doc/command-reference.md) và [`doc/user-guide.md`](./doc/user-guide.md) để có hướng dẫn chi tiết với examples.

> Gõ `*help` trong Mezon để xem danh sách đầy đủ. Bảng dưới là tóm tắt theo nhóm.

### 🆕 Khởi tạo
| Lệnh | Mô tả |
|------|-------|
| `*bat-dau` | Khởi tạo người dùng và cài đặt mặc định |
| `*help` | Xem hướng dẫn sử dụng |

### 📅 Xem lịch
| Lệnh | Mô tả |
|------|-------|
| `*lich-hom-nay` | Xem lịch hôm nay |
| `*lich-ngay [DD-MM-YYYY]` | Xem lịch theo ngày |
| `*lich-tuan [DD-MM-YYYY]` | Xem lịch của tuần chứa ngày được nhập (mặc định: tuần này) |
| `*lich-tuan-truoc` / `*lich-tuan-sau` | Tuần trước / sau |
| `*chi-tiet <ID>` | Xem chi tiết một lịch |
| `*sap-toi [N] [--uutien cao\|vua\|thap]` | N lịch sắp tới gần nhất (default 5, max 20) |
| `*danh-sach [trang] [--uutien cao\|vua\|thap]` | Tất cả lịch đang chờ, 10 lịch/trang |
| `*tim-kiem <từ khoá> [trang]` | Tìm lịch theo title/description |
| `*thong-ke [tuan\|thang\|nam\|all]` | Thống kê (completion rate, hot hours, theo loại, theo ưu tiên) |

### ✏️ Quản lý lịch
| Lệnh | Mô tả |
|------|-------|
| `*them-lich` | Thêm lịch mới (form interactive) |
| `*them-lich-excel` | Import nhiều lịch từ Excel (hỗ trợ cột `uu_tien`) |
| `*mau-lich-excel` | Tải file Excel mẫu |
| `*sua-lich <ID>` | Sửa lịch |
| `*xoa-lich <ID>` | Xoá lịch (có confirm) |
| `*hoan-thanh <ID>` | Đánh dấu hoàn thành |
| `*lich-lap <ID> <daily\|weekly\|monthly> [interval] [--den DD/MM/YYYY]` | Bật lặp |
| `*bo-lap <ID>` | Tắt lặp |

### 🔔 Nhắc nhở
| Lệnh | Mô tả |
|------|-------|
| `*nhac <ID> <số phút>` | Đặt nhắc trước giờ bắt đầu |
| `*nhac-sau <ID> <thời gian>` | Nhắc tương đối: `30p`, `2h`, `1d`, `2h30p`, `1 ngày 12 giờ` |
| `*tat-nhac <ID>` | Tắt nhắc |

Reminder button có multi-preset snooze: ✅ Đã nhận / ⏰ default / ⏰ 10p / ⏰ 1h / ⏰ 4h.

### ⚙️ Cài đặt
| Lệnh | Mô tả |
|------|-------|
| `*cai-dat` | Xem và chỉnh cài đặt cá nhân (form interactive) |

---

## ✅ Tính năng chính

### Backend (Bot) — ~70% hoàn thành
- User Management (`*bat-dau`, `*cai-dat`)
- Schedule CRUD: `*them-lich`, `*sua-lich`, `*xoa-lich`, `*hoan-thanh`, `*chi-tiet`
- Excel import: `*them-lich-excel`, `*mau-lich-excel` (hỗ trợ ưu tiên + lặp)
- View: `*lich-hom-nay`, `*lich-ngay`, `*lich-tuan(-truoc/-sau)`, `*sap-toi`, `*danh-sach`, `*tim-kiem`
- Recurring events: `*lich-lap` / `*bo-lap` (daily/weekly/monthly + interval + until)
- Priority: 🟢 Thấp / 🟡 Vừa / 🔴 Cao + filter `--uutien` + breakdown trong `*thong-ke`
- Reminders: cron tự động + button snooze multi-preset + `*nhac-sau` (relative)
- Statistics: `*thong-ke` (completion rate, hot hours, breakdown theo loại / ưu tiên)
- Interactive forms (InteractiveBuilder + buttons)
- Mezon OAuth authentication (web login flow)
- GitHub Actions CI (lint + build + test)

### Frontend (Web) — ~85% giao diện hoàn thành
- 24+ trang dashboard đầy đủ theo design Stitch
- 12 reusable components (Sidebar, Topbar, Modals, Drawers, Error/Empty states...)
- Material Design 3 color system (primary `#4F378A`)
- Responsive layout (mobile + desktop)
- Mezon OAuth login flow
- Skeleton loading, toast notifications, error states
- Mock data (chưa kết nối API REST)

### Design — 100% hoàn thành
- 54 screens Stitch phủ đầy đủ mọi chức năng
- Design system: palette tím/trắng, Inter font, spacing 4px, sidebar 260px

## 🚀 Roadmap

- [ ] API REST cho frontend (hiện bot giao tiếp qua mezon-sdk WebSocket)
- [ ] Kết nối frontend với backend API
- [ ] Tag/nhãn (many-to-many) + filter (backend)
- [ ] `*copy-lich` — duplicate lịch
- [ ] `*lich-thang` — view cả tháng
- [ ] `*hoan-tac` — undo thao tác gần nhất
- [ ] Export `.ics` (backend logic)
- [ ] Mention `@user` trong reminder

---

## 🧪 Testing

Toàn bộ test chạy với Jest:

```bash
npm test                   # Chạy tất cả test (964+ tests)
npm test -- --coverage     # Kèm coverage report
npm test -- --watch        # Watch mode
npm test -- priority       # Filter theo path
```

CI tự chạy lint, build bot + web, và test bot trên mỗi PR và push vào `main`.

---

## 🛠️ Development

> 📖 **Development Guide**: Xem [`doc/development-guide.md`](./doc/development-guide.md) để có hướng dẫn đầy đủ về workflow, coding standards và best practices.

```bash
npm run start:dev          # Bot watch mode (port 3001)
npm run web:dev            # Next.js dev server (port 3000)
npm run build              # Compile TypeScript (bot)
npm run web:build          # Build Next.js production
npm run build:all          # Build bot + web
npm run start:prod         # Run production build (cần build trước)

npm run lint               # ESLint --fix
npm run web:lint           # ESLint cho web
npm run format             # Prettier
npm test                   # Jest (964+ tests)
```

### Quy ước thêm command mới

1. Tạo file `app/bot/src/bot/commands/<ten>.command.ts` (kebab-case).
2. Đăng ký trong `bot.module.ts` (provider + `CommandRegistry`).
3. Bổ sung entry trong `command-catalog.ts` để `*help` tự hiển thị.
4. Viết spec ở `app/bot/test/bot/<ten>.command.spec.ts`.
5. Chạy `npm test && npm run lint && npm run build` trước khi mở PR.

> 🔧 **Troubleshooting**: Gặp vấn đề? Xem [`doc/troubleshooting.md`](./doc/troubleshooting.md) để có solutions cho các lỗi thường gặp.

---

## 📚 Tài liệu

### 📖 Tài Liệu Chính
- [`doc/README.md`](./doc/README.md) — **Mục lục tài liệu đầy đủ** - Điểm bắt đầu cho tất cả tài liệu
- [`KIRO.md`](./KIRO.md) — Bối cảnh dự án đầy đủ cho AI assistant / new dev

### 🚀 Quick Start Guides
- [`doc/user-guide.md`](./doc/user-guide.md) — **Hướng dẫn sử dụng** cho người dùng cuối
- [`doc/setup-installation.md`](./doc/setup-installation.md) — **Cài đặt và cấu hình** từ đầu
- [`doc/deployment-guide.md`](./doc/deployment-guide.md) — **Deploy production** với Docker/VPS

### 🔧 Technical Documentation
- [`doc/system-overview.md`](./doc/system-overview.md) — Kiến trúc tổng thể và tech stack
- [`doc/database-schema.md`](./doc/database-schema.md) — Cấu trúc database chi tiết
- [`doc/api-reference.md`](./doc/api-reference.md) — API documentation và services
- [`doc/development-guide.md`](./doc/development-guide.md) — Development workflow và best practices

### 🎯 Feature Documentation
- [`doc/command-reference.md`](./doc/command-reference.md) — **Tài liệu tất cả lệnh bot** với examples
- [`doc/interactive-features.md`](./doc/interactive-features.md) — Forms, buttons và tương tác
- [`doc/recurring-events.md`](./doc/recurring-events.md) — Hệ thống lịch lặp lại
- [`doc/reminder-system.md`](./doc/reminder-system.md) — Hệ thống nhắc nhở tự động
- [`doc/priority-tags.md`](./doc/priority-tags.md) — Quản lý ưu tiên và nhãn

### 🛠️ Maintenance & Support
- [`doc/troubleshooting.md`](./doc/troubleshooting.md) — **Xử lý sự cố** thường gặp
- [`doc/CHANGELOG.md`](./doc/CHANGELOG.md) — Lịch sử thay đổi và versions
- [`doc/PROGRESS.md`](./doc/PROGRESS.md) — **Tiến độ implementation** (design vs code)
- [`app/bot/migrations/`](./app/bot/migrations/) — SQL migrations

> 💡 **Tip**: Bắt đầu với [`doc/README.md`](./doc/README.md) để có overview đầy đủ về tài liệu!

---

## 📝 License

Private / proprietary.
