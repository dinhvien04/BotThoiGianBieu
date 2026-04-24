# 🤖 Bot Thời Gian Biểu Mezon

Mezon bot quản lý lịch trình, sự kiện và nhắc nhở tự động. Xây dựng với **NestJS + TypeORM + PostgreSQL + mezon-sdk**.

[![Tests](https://img.shields.io/badge/tests-496%20passing-brightgreen)](./FINAL_TEST_SUMMARY.md)
[![Coverage](https://img.shields.io/badge/coverage-~95%25-brightgreen)](./TEST_COMPLETION_REPORT.md)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://www.typescriptlang.org/)
[![NestJS](https://img.shields.io/badge/NestJS-10.x-red)](https://nestjs.com/)

> 📖 Xem [`KIRO.md`](./KIRO.md) để biết chi tiết kiến trúc, luồng hoạt động, và quy ước.  
> 🧪 Xem [`FINAL_TEST_SUMMARY.md`](./FINAL_TEST_SUMMARY.md) để biết chi tiết test suite.

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



### 3. Chạy bot

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

## 📋 Lệnh bot

### 🆕 Khởi tạo
| Lệnh | Mô tả | Aliases |
|------|-------|---------|
| `*bat-dau` | Khởi tạo tài khoản và cài đặt mặc định | `*batdau`, `*start` |
| `*help` | Xem hướng dẫn sử dụng | `*huong-dan`, `*trogiup` |

### 📅 Quản lý lịch
| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `*them-lich` | Thêm lịch mới (interactive) | `*them-lich` |
| `*sua-lich <ID>` | Chỉnh sửa lịch | `*sua-lich 123` |
| `*xoa-lich <ID>` | Xóa lịch | `*xoa-lich 123` |
| `*hoan-thanh <ID>` | Đánh dấu hoàn thành | `*hoan-thanh 123` |

### 📆 Xem lịch
| Lệnh | Mô tả | Ví dụ |
|------|-------|-------|
| `*lich-hom-nay` | Xem lịch hôm nay | `*lich-hom-nay` |
| `*lich-ngay [ngày]` | Xem lịch theo ngày | `*lich-ngay 21-4-2026` |
| `*lich-tuan [ngày]` | Xem lịch tuần | `*lich-tuan` |
| `*lich-tuan-truoc` | Xem lịch tuần trước | `*lich-tuan-truoc` |
| `*lich-tuan-sau` | Xem lịch tuần sau | `*lich-tuan-sau` |

### ⚙️ Cài đặt
| Lệnh | Mô tả | Aliases |
|------|-------|---------|
| `*cai-dat` | Xem và chỉnh cài đặt cá nhân | `*caidat`, `*settings` |

### 🔔 Nhắc nhở
- Nhắc nhở tự động được gửi dựa trên cài đặt `default_remind_minutes`
- Có thể chọn nhận qua DM hoặc Channel trong cài đặt

---

## 🗂️ Cấu trúc source

```
src/
├── main.ts                          # Bootstrap
├── app.module.ts                    # Root module
├── config/
│   └── database.config.ts
├── bot/                             # Mezon bot core
│   ├── bot.module.ts
│   ├── bot.service.ts               # MezonClient wrapper
│   ├── bot.gateway.ts               # Event listener
│   ├── commands/                    # Command handlers (10 commands)
│   │   ├── command.types.ts
│   │   ├── command-catalog.ts
│   │   ├── command-registry.ts
│   │   ├── command-router.ts
│   │   ├── bat-dau.command.ts
│   │   ├── help.command.ts
│   │   ├── them-lich.command.ts
│   │   ├── xoa-lich.command.ts
│   │   ├── sua-lich.command.ts
│   │   ├── hoan-thanh.command.ts
│   │   ├── lich-hom-nay.command.ts
│   │   ├── lich-ngay.command.ts
│   │   ├── lich-tuan.command.ts
│   │   └── cai-dat.command.ts
│   └── interactions/                # Button interactions
│       ├── interaction.types.ts
│       ├── interaction-registry.ts
│       └── interaction-router.ts
├── users/                           # User & UserSettings
│   ├── users.module.ts
│   ├── users.service.ts
│   └── entities/
│       ├── user.entity.ts
│       └── user-settings.entity.ts
├── schedules/                       # Schedule management
│   ├── schedules.module.ts
│   ├── schedules.service.ts
│   ├── schedule.service.ts
│   ├── schedule.module.ts
│   ├── schedules.constants.ts
│   └── entities/
│       └── schedule.entity.ts
├── reminder/                        # Automated reminders
│   ├── reminder.module.ts
│   ├── reminder.service.ts          # Cron jobs
│   └── reminder-interaction.handler.ts
└── shared/                          # Utilities
    ├── shared.module.ts
    └── utils/
        ├── message-formatter.ts
        ├── date-parser.ts
        └── date-utils.ts

test/                                # Test suite (496 tests)
├── bot/                             # Command & infrastructure tests
├── schedules/                       # Schedule service tests
├── reminder/                        # Reminder tests
├── users/                           # User service tests
└── shared/                          # Utility tests

migrations/                          # Database migrations
├── 001-init-users.sql
├── 002-init-schedules.sql
├── 003-add-acknowledged-at.sql
├── 004-add-end-notified-at.sql
├── 005-fix-status-to-varchar.sql
└── 006-add-notify-via-channel.sql
```

---

## ✅ Tính năng đã hoàn thành

- [x] **User Management**: `*bat-dau`, `*cai-dat`
- [x] **Schedule CRUD**: `*them-lich`, `*sua-lich`, `*xoa-lich`, `*hoan-thanh`
- [x] **View Schedules**: `*lich-hom-nay`, `*lich-ngay`, `*lich-tuan`, `*lich-tuan-truoc`, `*lich-tuan-sau`
- [x] **Interactive Forms**: Settings form, Edit form với buttons
- [x] **Automated Reminders**: Cron job gửi nhắc tự động
- [x] **Comprehensive Testing**: 496 tests, 100% passing
- [x] **Help System**: `*help` với command catalog

## 🚀 Roadmap

- [ ] Recurring events (daily/weekly/monthly)
- [ ] Search functionality (`*tim-kiem`)
- [ ] Export calendar (ICS format)
- [ ] Event categories/tags
- [ ] Analytics dashboard
- [ ] Multi-language support

---

## 🧪 Testing

Project có **test suite hoàn chỉnh** với **496 test cases** covering 100% source files.

### Chạy tests

```bash
# Run all tests
npm test

# Run with coverage
npm test -- --coverage

# Run specific test
npm test -- cai-dat.command.spec.ts

# Watch mode
npm test -- --watch
```

### Test Statistics

- ✅ **496 tests** passing (100%)
- ✅ **~95% code coverage**
- ✅ **200+ edge cases** tested
- ✅ **24 test files** covering all modules
- ✅ **~60s** execution time

Xem chi tiết: [`FINAL_TEST_SUMMARY.md`](./FINAL_TEST_SUMMARY.md)

---

## 🛠️ Development

### Available Scripts

```bash
# Development
npm run start:dev          # Start with watch mode
npm run build              # Compile TypeScript
npm run start:prod         # Run production build

# Testing
npm test                   # Run all tests
npm test -- --coverage     # With coverage report
npm test -- --watch        # Watch mode

# Code Quality
npm run lint               # Check code style
npm run format             # Format with Prettier
```

### Adding New Features

1. Create feature files (use kebab-case naming)
2. Write comprehensive tests (maintain 100% pass rate)
3. Update command catalog if adding commands
4. Run `npm test` to verify
5. Update documentation

---

## 📚 Documentation

- [`KIRO.md`](./KIRO.md) - Complete project context for AI assistants
- [`FINAL_TEST_SUMMARY.md`](./FINAL_TEST_SUMMARY.md) - Test suite overview
- [`TEST_COMPLETION_REPORT.md`](./TEST_COMPLETION_REPORT.md) - Detailed test report
- [`NESTJS_FLOW.md`](./NESTJS_FLOW.md) - NestJS architecture flow

---

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Write code and tests (maintain 100% pass rate)
4. Run `npm test` to verify
5. Commit changes (`git commit -m 'Add amazing feature'`)
6. Push to branch (`git push origin feature/amazing-feature`)
7. Open Pull Request

---

## 📝 License

This project is private and proprietary.

---

## 👥 Authors

- **Development Team** - Initial work and maintenance

---

**🔄 Last Updated**: April 24, 2026  
**✅ Status**: Production Ready  
**🧪 Tests**: 496/496 passing
