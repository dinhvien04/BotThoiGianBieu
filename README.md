# 🤖 Bot Thời Gian Biểu Mezon

Mezon bot quản lý lịch trình, sự kiện và nhắc nhở tự động. Xây dựng với **NestJS + TypeORM + PostgreSQL + mezon-sdk**.

> Xem [`KIRO.md`](./KIRO.md) để biết chi tiết kiến trúc, luồng hoạt động, và quy ước.

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

- `APPLICATION_TOKEN` — token bot từ Mezon Developer Portal
- `DATABASE_URL` — connection string Neon PostgreSQL
- `BOT_PREFIX` — mặc định `*`

### 3. Tạo bảng database

Chạy file SQL migration đầu tiên trên Neon console hoặc bằng `psql`:

```bash
psql "$DATABASE_URL" -f migrations/001-init-users.sql
```

### 4. Chạy bot

```bash
npm run start:dev      # dev với watch mode
npm run build && npm run start:prod   # production
```

Nếu mọi thứ OK, bạn sẽ thấy:

```
🤖 Bot Thời Gian Biểu đã khởi động
✅ MezonClient đã đăng nhập thành công
🎧 Bot đang lắng nghe lệnh (prefix: "*")
```

---

## 📋 Lệnh hiện có

| Lệnh | Mô tả |
|------|-------|
| `*help` | Xem hướng dẫn sử dụng |
| `*bat-dau` | Khởi tạo tài khoản và cài đặt mặc định |

Các alias được hỗ trợ:

- `*help` = `*huong-dan` = `*trogiup`
- `*bat-dau` = `*batdau` = `*start`

---

## 🗂️ Cấu trúc source

```
src/
├── main.ts                 # Bootstrap
├── app.module.ts           # Root module
├── config/
│   └── database.config.ts
├── bot/                    # Mezon bot core
│   ├── bot.module.ts
│   ├── bot.service.ts      # MezonClient wrapper
│   ├── bot.gateway.ts      # Event listener
│   └── commands/
│       ├── command.types.ts
│       ├── command-router.ts
│       ├── help.command.ts
│       └── bat-dau.command.ts
├── users/                  # User & UserSettings
│   ├── users.module.ts
│   ├── users.service.ts
│   └── entities/
│       ├── user.entity.ts
│       └── user-settings.entity.ts
└── shared/                 # Utilities dùng chung
    ├── shared.module.ts
    └── utils/
        └── message-formatter.ts

migrations/
└── 001-init-users.sql
```

---

## 📦 Roadmap

- [x] `*help`, `*bat-dau`
- [ ] `*them-lich`, `*sua-lich`, `*xoa-lich`, `*hoan-thanh`
- [ ] `*lich-hom-nay`, `*lich-ngay`, `*lich-tuan`, `*lich-tuan-truoc`, `*lich-tuan-sau`
- [ ] `*chi-tiet`, `*nhac`, `*tat-nhac`
- [ ] Reminder cron job (tự động nhắc trước 60/30/5 phút)
