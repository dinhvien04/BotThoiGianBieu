# 🤖 Bot Thời Gian Biểu Mezon

Mezon bot quản lý lịch trình, sự kiện và nhắc nhở tự động. Xây dựng với **NestJS + TypeORM + PostgreSQL + mezon-sdk**.

[![CI](https://github.com/dinhvien04/BotThoiGianBieu/actions/workflows/ci.yml/badge.svg)](https://github.com/dinhvien04/BotThoiGianBieu/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red)](https://nestjs.com/)

> 📖 Xem [`KIRO.md`](./KIRO.md) để biết chi tiết kiến trúc, luồng hoạt động và quy ước.

---

## 🚀 Khởi động nhanh

### 1. Cài đặt dependencies

```bash
npm install
```

### 2. Cấu hình môi trường

```bash
cp .env.example .env
```

Chỉnh `.env`:

- `APPLICATION_ID` — bot ID từ Mezon Developer Portal
- `APPLICATION_TOKEN` — token bot từ Mezon Developer Portal
- `DATABASE_URL` — connection string PostgreSQL (vd: Neon)
- `BOT_PREFIX` — mặc định `*`

### 3. Chạy migrations

Chạy lần lượt từng file trong `migrations/` theo thứ tự số:

```bash
psql "$DATABASE_URL" -f migrations/007-add-recurrence.sql
psql "$DATABASE_URL" -f migrations/008-add-priority.sql
```

> Tất cả migration đều **idempotent** — chạy lại nhiều lần vẫn an toàn.

### 4. Chạy bot

```bash
npm run start:dev                       # dev với watch mode
npm run build && npm run start:prod     # production
```

Nếu mọi thứ OK, bạn sẽ thấy:

```
🤖 Bot Thời Gian Biểu đã khởi động
✅ MezonClient đã đăng nhập thành công
🎧 Bot đang lắng nghe lệnh (prefix: "*")
```

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
docker build -t bot-thoi-gian-bieu .
docker run --rm --env-file .env bot-thoi-gian-bieu
```

> Image dùng multi-stage build: stage `builder` cài full deps + compile TS, stage final chỉ giữ production deps + `dist/`.

---

## 📋 Lệnh bot

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

## 🗂️ Cấu trúc source

```
src/
├── main.ts                          # Bootstrap NestJS
├── app.module.ts                    # Root module
├── config/                          # database.config.ts
├── bot/                             # Mezon bot core
│   ├── bot.service.ts               # MezonClient wrapper
│   ├── bot.gateway.ts               # Event listener / message router
│   ├── commands/                    # Command handlers (catalog ở command-catalog.ts)
│   └── interactions/                # Button/form interactions
├── users/                           # User & UserSettings
├── schedules/                       # Schedule entity + service
├── reminder/                        # Cron jobs gửi nhắc tự động
└── shared/utils/                    # date-parser, duration-parser, message-formatter,
                                     # priority, priority-flag, recurrence

test/                                # Jest test suite (>550 tests)

migrations/                          # SQL migrations (idempotent)
├── 007-add-recurrence.sql           # cột recurrence_*
└── 008-add-priority.sql             # cột priority + index
```

---

## ✅ Tính năng chính

- User Management (`*bat-dau`, `*cai-dat`)
- Schedule CRUD: `*them-lich`, `*sua-lich`, `*xoa-lich`, `*hoan-thanh`, `*chi-tiet`
- Excel import: `*them-lich-excel`, `*mau-lich-excel` (hỗ trợ ưu tiên + lặp)
- View: `*lich-hom-nay`, `*lich-ngay`, `*lich-tuan(-truoc/-sau)`, `*sap-toi`, `*danh-sach`, `*tim-kiem`
- Recurring events: `*lich-lap` / `*bo-lap` (daily/weekly/monthly + interval + until)
- Priority: 🟢 Thấp / 🟡 Vừa / 🔴 Cao + filter `--uutien` + breakdown trong `*thong-ke`
- Reminders: cron tự động + button snooze multi-preset + `*nhac-sau` (relative)
- Statistics: `*thong-ke` (completion rate, hot hours, breakdown theo loại / ưu tiên)
- Interactive forms (InteractiveBuilder + buttons)
- GitHub Actions CI (lint + build + test)

## 🚀 Roadmap

- [ ] Tag/nhãn (many-to-many) + filter
- [ ] `*copy-lich` — duplicate lịch
- [ ] `*lich-thang` — view cả tháng
- [ ] `*hoan-tac` — undo thao tác gần nhất
- [ ] Export `.ics`
- [ ] Mention `@user` trong reminder

---

## 🧪 Testing

Toàn bộ test chạy với Jest:

```bash
npm test                   # Chạy tất cả test
npm test -- --coverage     # Kèm coverage report
npm test -- --watch        # Watch mode
npm test -- priority       # Filter theo path
```

CI tự chạy `npm run lint && npm run build && npm test` trên mỗi PR và push vào `main`.

---

## 🛠️ Development

```bash
npm run start:dev          # Watch mode
npm run build              # Compile TypeScript
npm run start:prod         # Run production build (cần build trước)

npm run lint               # ESLint --fix
npm run format             # Prettier
npm test                   # Jest
```

### Quy ước thêm command mới

1. Tạo file `src/bot/commands/<ten>.command.ts` (kebab-case).
2. Đăng ký trong `bot.module.ts` (provider + `CommandRegistry`).
3. Bổ sung entry trong `command-catalog.ts` để `*help` tự hiển thị.
4. Viết spec ở `test/bot/<ten>.command.spec.ts`.
5. Chạy `npm test && npm run lint && npm run build` trước khi mở PR.

---

## 📚 Tài liệu

- [`KIRO.md`](./KIRO.md) — Bối cảnh dự án đầy đủ cho AI assistant / new dev.
- [`migrations/`](./migrations/) — SQL migrations.

---

## 📝 License

Private / proprietary.
