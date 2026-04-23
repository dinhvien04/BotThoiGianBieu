# 🤖 Bot Thời Gian Biểu Mezon - Project Context

> **File này dành cho AI Assistant và Developer** - Chứa toàn bộ context về project để hiểu nhanh kiến trúc, luồng hoạt động, và cách làm việc với codebase.

---

## 📋 Mục Lục
- [Tổng Quan Project](#tổng-quan-project)
- [Kiến Trúc Hệ Thống](#kiến-trúc-hệ-thống)
- [Tech Stack](#tech-stack)
- [Luồng Hoạt Động](#luồng-hoạt-động)
- [Cấu Trúc Thư Mục](#cấu-trúc-thư-mục)
- [Database Schema](#database-schema)
- [Bot Commands](#bot-commands)
- [Automation & Cron Jobs](#automation--cron-jobs)
- [Development Workflow](#development-workflow)
- [Deployment](#deployment)

---

## Tổng Quan Project

### Mục Đích
Bot Thời Gian Biểu là một Mezon Bot giúp quản lý lịch trình, sự kiện và nhắc nhở tự động cho các thành viên trong clan.

### Tính Năng Chính
- ✅ **Quản lý sự kiện**: Thêm, xóa, sửa, xem lịch
- ⏰ **Nhắc nhở tự động**: Gửi thông báo trước 60, 30, 5 phút
- 🔄 **Recurring events**: Lặp lại hàng ngày/tuần/tháng
- 📅 **Xem lịch linh hoạt**: Theo ngày, tuần, tháng
- 🔍 **Tìm kiếm**: Tìm sự kiện theo keyword
- 📊 **Thống kê**: Xem số liệu về sự kiện

### Đối Tượng Sử Dụng
- **End Users**: Thành viên clan sử dụng bot qua lệnh chat
- **Developers**: Dev maintain và mở rộng tính năng
- **AI Assistants**: Kiro, Cursor, Copilot hỗ trợ development

---

## Kiến Trúc Hệ Thống

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                   Mezon Platform                        │
│  (Clans, Channels, Users, Messages, WebSocket)         │
└────────────────────┬────────────────────────────────────┘
                     │
                     │ WebSocket + REST API
                     │
┌────────────────────▼────────────────────────────────────┐
│              Mezon SDK (mezon-sdk)                      │
│  - Authentication & Session Management                  │
│  - Real-time Event Handling (WebSocket)                │
│  - Message Send/Receive                                 │
│  - Channel & User Management                            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│            NestJS Application Layer                     │
│  ┌──────────────────────────────────────────────────┐  │
│  │  App Module (Root)                               │  │
│  │  - Import all feature modules                    │  │
│  │  - Configure TypeORM, Schedule, Config          │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Bot Module                                      │  │
│  │  - BotService (MezonClient wrapper)             │  │
│  │  - Event Listeners (@OnEvent decorators)        │  │
│  │  - Command Router & Parser                       │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Schedule Module                                 │  │
│  │  - ScheduleService (Event CRUD)                 │  │
│  │  - Entities: Event, User, Reminder              │  │
│  │  - Repositories (TypeORM)                        │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Reminder Module                                 │  │
│  │  - ReminderService (@Cron jobs)                 │  │
│  │  - Check & send notifications                    │  │
│  └──────────────────────────────────────────────────┘  │
│                                                          │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Shared Module                                   │  │
│  │  - DateParser, MessageFormatter                 │  │
│  │  - Validators, Guards, Interceptors             │  │
│  └──────────────────────────────────────────────────┘  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              TypeORM Layer                              │
│  - Entity Managers                                      │
│  - Query Builders                                       │
│  - Migration Runner                                     │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│         PostgreSQL Database (Neon)                      │
│  Tables: events, users, reminders, settings             │
│  Connection: postgresql://neondb_owner:***@...          │
└─────────────────────────────────────────────────────────┘
```

### Component Breakdown

#### 1. **Mezon SDK Layer**
- **Vai trò**: Interface với Mezon platform
- **Chức năng**:
  - Authenticate bot với Mezon
  - Maintain WebSocket connection
  - Handle real-time events
  - Send/receive messages
- **Key Classes**: `MezonClient`, `TextChannel`, `Message`, `User`

#### 2. **NestJS Application Layer**
- **Vai trò**: Core business logic của bot
- **Modules**:
  - **AppModule**: Root module, orchestrate tất cả
  - **BotModule**: Wrapper cho MezonClient, handle events
  - **ScheduleModule**: Quản lý events (CRUD operations)
  - **ReminderModule**: Cron jobs và notifications
  - **SharedModule**: Utilities, helpers, guards

#### 3. **TypeORM Layer**
- **Vai trò**: Data access và persistence
- **Components**:
  - **Entities**: TypeScript classes với decorators
  - **Repositories**: Data access patterns
  - **Migrations**: Database schema versioning
  - **Query Builders**: Type-safe SQL queries

#### 4. **PostgreSQL Database**
- **Vai trò**: Data storage
- **Provider**: Neon (cloud-hosted PostgreSQL)
- **Features**:
  - ACID transactions
  - JSON support
  - Full-text search
  - Scalable connections

---

## Tech Stack

### Core Technologies

| Technology | Version | Purpose | Why? |
|------------|---------|---------|------|
| **Node.js** | 18+ | Runtime environment | Async I/O, large ecosystem |
| **NestJS** | 10.x | Backend framework | Modular, scalable, enterprise-ready |
| **TypeScript** | 5.x | Programming language | Type safety, better DX |
| **Mezon SDK** | Latest | Mezon platform integration | Official SDK, full features |
| **PostgreSQL** | 15+ | Database | Robust, ACID, scalable |
| **TypeORM** | 0.3.x | ORM | Type-safe queries, migrations |
| **@nestjs/schedule** | Latest | Task scheduling | Native NestJS cron support |
| **@nestjs/config** | Latest | Configuration | Type-safe env management |

### Development Tools

| Tool | Purpose |
|------|---------|
| **@nestjs/cli** | NestJS project scaffolding |
| **ESLint** | Code linting |
| **Prettier** | Code formatting |
| **Jest** | Unit & integration testing |

### Why These Choices?

#### NestJS over Express/Fastify
- ✅ Built-in dependency injection
- ✅ Modular architecture (modules, services, controllers)
- ✅ TypeScript first-class support
- ✅ Built-in decorators (@Injectable, @Cron, etc.)
- ✅ Easy to scale and maintain
- ✅ Enterprise-ready patterns

#### PostgreSQL over SQLite/MySQL
- ✅ Production-grade reliability
- ✅ Advanced features (JSON, arrays, full-text search)
- ✅ Better concurrency handling
- ✅ Scalable for growth
- ✅ Cloud-hosted (Neon) - zero maintenance
- ✅ ACID compliant with strong consistency

#### TypeORM over Prisma/Sequelize
- ✅ Native NestJS integration
- ✅ Decorator-based entities
- ✅ Type-safe queries
- ✅ Migration system
- ✅ Repository pattern support

#### @nestjs/schedule over node-cron
- ✅ Native NestJS integration
- ✅ Decorator-based (@Cron, @Interval)
- ✅ Better error handling
- ✅ Dependency injection support

---

## Luồng Hoạt Động

### 1. Bot Startup Flow

```
┌─────────────────┐
│  npm start      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Load .env      │
│  - BOT_ID       │
│  - BOT_TOKEN    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Initialize DB   │
│ - Create tables │
│ - Run migrations│
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Create Client   │
│ MezonClient()   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Setup Handlers  │
│ - onReady       │
│ - onMessage     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Setup Cron Jobs │
│ - Reminders     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ client.login()  │
│ - Authenticate  │
│ - Connect WS    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Bot Ready! 🚀   │
└─────────────────┘
```

### 2. Command Processing Flow

```
User sends: "*them-lich"
         │
         ▼
┌─────────────────────────────────────┐
│  onChannelMessage Event             │
│  - Receive message from Mezon       │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Check Prefix                       │
│  - Starts with "*" ?                │
│  - Ignore if not                    │
└────────┬────────────────────────────┘
         │ Yes
         ▼
┌─────────────────────────────────────┐
│  Parse Command                      │
│  - Extract: "them-lich"             │
│  - Extract args if any              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Route to Handler                   │
│  - Switch case on command           │
│  - Call handleThemLichCommand()     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Check User Exists                  │
│  - Query user from database         │
│  - If not exists, prompt *batdau    │
└────────┬────────────────────────────┘
         │ User exists
         ▼
┌─────────────────────────────────────┐
│  Interactive Input (if needed)      │
│  - Ask for title, time, etc.        │
│  - Or parse from inline args        │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Validate Input                     │
│  - Check required fields            │
│  - Parse datetime                   │
│  - Validate future date             │
└────────┬────────────────────────────┘
         │ Valid
         ▼
┌─────────────────────────────────────┐
│  Business Logic                     │
│  - Create schedule object           │
│  - Calculate remind_at              │
│  - Set status = 'pending'           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Database Operation                 │
│  - scheduleRepository.save()        │
│  - Insert into PostgreSQL           │
└────────┬────────────────────────────┘
         │ Success
         ▼
┌─────────────────────────────────────┐
│  Format Response                    │
│  - MessageFormatter.formatAdded()   │
│  - Include schedule ID              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send Reply                         │
│  - channel.send(message)            │
│  - Via Mezon SDK                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  User sees confirmation ✅          │
└─────────────────────────────────────┘
```

### 3. Reminder Flow

```
Cron Job runs every minute
         │
         ▼
┌─────────────────────────────────────┐
│  Query Schedules Need Reminder      │
│  - remind_at <= NOW                 │
│  - is_reminded = false              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  For each schedule                  │
│  - Get user settings                │
│  - Get channel_id or DM             │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Format Reminder Message            │
│  - Include schedule details         │
│  - Add time remaining               │
│  - Mention user                     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send to Channel or DM              │
│  - Check notify_via_dm setting      │
│  - Send via BotService              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Mark as Reminded                   │
│  - is_reminded = true               │
│  - Prevent duplicate reminders      │
└─────────────────────────────────────┘
```

---

## Luồng Hoạt Động Chi Tiết Từng Chức Năng

### 1. 🆕 Khởi tạo người dùng (*batdau)

```
User: "*batdau"
         │
         ▼
┌─────────────────────────────────────┐
│  BatDauCommand.execute()            │
│  - Parse user info from message     │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Check if user exists               │
│  - Query users table by user_id     │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Exists   Not Exists
    │         │
    ▼         ▼
  Return   Create User
  "Đã      ┌─────────────────────┐
  khởi     │ userRepository.save()│
  tạo"     │ - user_id           │
           │ - username          │
           │ - display_name      │
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │ Create UserSettings │
           │ - timezone: VN      │
           │ - default_remind: 30│
           │ - notify_via_dm: no │
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │ Send Welcome Message│
           │ "✅ Đã khởi tạo!"  │
           │ + Hướng dẫn cơ bản  │
           └─────────────────────┘
```

**Kết quả:**
- User record trong database
- UserSettings với giá trị mặc định
- Welcome message với hướng dẫn

---

### 2. ➕ Thêm lịch mới (*them-lich)

```
User: "*them-lich"
         │
         ▼
┌─────────────────────────────────────┐
│  ThemLichCommand.execute()          │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Check User Exists                  │
│  - Query user + settings            │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Exists   Not Exists
    │         │
    ▼         ▼
  Continue  Return "Chưa khởi tạo"
    │
    ▼
┌─────────────────────────────────────┐
│  Interactive Input Flow             │
│  1. Bot: "Nhập tiêu đề:"           │
│  2. User: "Họp team"                │
│  3. Bot: "Nhập thời gian:"          │
│  4. User: "21-4-2026 14:00"         │
│  5. Bot: "Nhập mô tả (optional):"   │
│  6. User: "Review sprint"           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Validate Input                     │
│  - Title not empty                  │
│  - Parse datetime (DateParser)      │
│  - Check future date                │
└────────┬────────────────────────────┘
         │ Valid
         ▼
┌─────────────────────────────────────┐
│  Calculate remind_at                │
│  remind_at = start_time -           │
│    default_remind_minutes * 60000   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Create Schedule                    │
│  scheduleRepository.save({          │
│    user_id, title, description,     │
│    start_time, remind_at,           │
│    status: 'pending'                │
│  })                                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send Confirmation                  │
│  "✅ Đã thêm lịch: [title]"        │
│  "🆔 ID: [id]"                     │
│  "⏰ [start_time]"                 │
│  "🔔 Nhắc lúc: [remind_at]"        │
└─────────────────────────────────────┘
```

**Kết quả:**
- Schedule record trong database
- Confirmation message với ID
- Reminder tự động được set

---

### 3. 📅 Xem lịch hôm nay (*lich-hom-nay)

```
User: "*lich-hom-nay"
         │
         ▼
┌─────────────────────────────────────┐
│  LichHomNayCommand.execute()        │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Get Date Range                     │
│  start = startOfDay(today)          │
│  end = endOfDay(today)              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Query Schedules                    │
│  scheduleRepository.find({          │
│    user_id: userId,                 │
│    start_time: Between(start, end)  │
│  })                                 │
│  ORDER BY start_time ASC            │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Empty    Has Data
    │         │
    ▼         ▼
  Return   Format List
  "Không   ┌─────────────────────┐
  có lịch" │ MessageFormatter    │
           │ .formatScheduleList()│
           │ - Group by status   │
           │ - Add icons         │
           │ - Show time         │
           └──────────┬──────────┘
                      │
                      ▼
           ┌─────────────────────┐
           │ Send Message        │
           │ "📅 Lịch hôm nay"  │
           │ ⏳ [pending items] │
           │ ✅ [completed]     │
           └─────────────────────┘
```

**Kết quả:**
- Danh sách lịch hôm nay
- Grouped by status
- Sorted by time

---

### 4. 📆 Xem lịch theo tuần (*lich-tuan, *lich-tuan-truoc, *lich-tuan-sau)

```
User: "*lich-tuan" hoặc "*lich-tuan 21-4-2026"
         │
         ▼
┌─────────────────────────────────────┐
│  LichTuanCommand.execute()          │
│  - Parse date argument (optional)   │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Determine Week Range               │
│  - If no date: current week         │
│  - If date: week containing date    │
│  - *lich-tuan-truoc: -7 days        │
│  - *lich-tuan-sau: +7 days          │
│                                     │
│  start = startOfWeek(date)          │
│  end = endOfWeek(date)              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Query Schedules                    │
│  scheduleRepository.find({          │
│    user_id: userId,                 │
│    start_time: Between(start, end)  │
│  })                                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Group by Day                       │
│  - Monday: [schedules]              │
│  - Tuesday: [schedules]             │
│  - ...                              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Format Message                     │
│  "📅 Lịch tuần [date range]"       │
│  "📌 Thứ 2 (21/4):"                │
│  "  ⏳ 09:00 - Họp team"           │
│  "  ⏳ 14:00 - Review code"        │
│  "📌 Thứ 3 (22/4):"                │
│  "  ✅ 10:00 - Training"           │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send Message                       │
└─────────────────────────────────────┘
```

**Kết quả:**
- Lịch cả tuần grouped by day
- Hiển thị status icons
- Week range trong title

---

### 5. 🔍 Xem chi tiết lịch (*chi-tiet <ID>)

```
User: "*chi-tiet 123"
         │
         ▼
┌─────────────────────────────────────┐
│  ChiTietCommand.execute()           │
│  - Parse schedule ID                │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Query Schedule                     │
│  scheduleRepository.findOne({       │
│    id: scheduleId,                  │
│    user_id: userId  // Security     │
│  })                                 │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Found    Not Found
    │         │
    ▼         ▼
  Continue  Return "Không tìm thấy"
    │
    ▼
┌─────────────────────────────────────┐
│  Format Detail Message              │
│  MessageFormatter                   │
│    .formatScheduleDetail()          │
│  - All fields                       │
│  - Formatted dates                  │
│  - Status with icon                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send Message                       │
│  "📋 Chi tiết lịch"                │
│  "🆔 ID: 123"                      │
│  "📌 Tiêu đề: Họp team"            │
│  "⏰ Bắt đầu: 21/4/2026 14:00"     │
│  "📊 Trạng thái: ⏳ Đang chờ"     │
│  "🔔 Nhắc lúc: 21/4/2026 13:30"   │
└─────────────────────────────────────┘
```

**Kết quả:**
- Thông tin đầy đủ của 1 lịch
- Formatted dates
- Status và reminder info

---

### 6. ✏️ Sửa lịch (*sua-lich <ID>)

```
User: "*sua-lich 123"
         │
         ▼
┌─────────────────────────────────────┐
│  SuaLichCommand.execute()           │
│  - Parse schedule ID                │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Query Schedule                     │
│  - Check ownership (user_id)        │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Found    Not Found
    │         │
    ▼         ▼
  Continue  Return Error
    │
    ▼
┌─────────────────────────────────────┐
│  Show Current Info                  │
│  "📋 Thông tin hiện tại:"          │
│  [display current schedule]         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Interactive Edit Flow              │
│  Bot: "Chọn trường cần sửa:"        │
│  "1. Tiêu đề"                       │
│  "2. Thời gian"                     │
│  "3. Mô tả"                         │
│  "4. Trạng thái"                    │
│  User: "1"                          │
│  Bot: "Nhập tiêu đề mới:"           │
│  User: "Họp team - Updated"         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Validate New Value                 │
│  - Check format                     │
│  - Parse if datetime                │
└────────┬────────────────────────────┘
         │ Valid
         ▼
┌─────────────────────────────────────┐
│  Update Schedule                    │
│  scheduleRepository.update(id, {    │
│    [field]: newValue,               │
│    updated_at: now                  │
│  })                                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Recalculate remind_at (if needed)  │
│  - If start_time changed            │
│  - remind_at = new_start - minutes  │
│  - is_reminded = false              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send Confirmation                  │
│  "✅ Đã cập nhật lịch"             │
│  [show updated info]                │
└─────────────────────────────────────┘
```

**Kết quả:**
- Schedule được update
- Reminder được recalculate nếu cần
- Confirmation message

---

### 7. 🗑️ Xóa lịch (*xoa-lich <ID>)

```
User: "*xoa-lich 123"
         │
         ▼
┌─────────────────────────────────────┐
│  XoaLichCommand.execute()           │
│  - Parse schedule ID                │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Query Schedule                     │
│  - Check ownership (user_id)        │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Found    Not Found
    │         │
    ▼         ▼
  Continue  Return Error
    │
    ▼
┌─────────────────────────────────────┐
│  Show Schedule Info                 │
│  "⚠️ Bạn có chắc muốn xóa?"        │
│  [display schedule details]         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Wait for Confirmation              │
│  Bot: "Reply 'yes' để xác nhận"     │
│  User: "yes"                        │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  "yes"    Other
    │         │
    ▼         ▼
  Delete   Cancel
    │         │
    │         └──> "❌ Đã hủy"
    ▼
┌─────────────────────────────────────┐
│  Delete Schedule                    │
│  scheduleRepository.delete(id)      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send Confirmation                  │
│  "✅ Đã xóa lịch #123"             │
└─────────────────────────────────────┘
```

**Kết quả:**
- Schedule bị xóa khỏi database
- Confirmation message
- Reminder cũng bị xóa (CASCADE)

---

### 8. ✅ Hoàn thành công việc (*hoan-thanh <ID>)

```
User: "*hoan-thanh 123"
         │
         ▼
┌─────────────────────────────────────┐
│  HoanThanhCommand.execute()         │
│  - Parse schedule ID                │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Query Schedule                     │
│  - Check ownership                  │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Found    Not Found
    │         │
    ▼         ▼
  Continue  Return Error
    │
    ▼
┌─────────────────────────────────────┐
│  Check Current Status               │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
 Pending   Already Completed
    │         │
    ▼         ▼
  Continue  Return "Đã hoàn thành rồi"
    │
    ▼
┌─────────────────────────────────────┐
│  Update Status                      │
│  scheduleRepository.update(id, {    │
│    status: 'completed',             │
│    updated_at: now                  │
│  })                                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send Celebration Message           │
│  "🎉 Chúc mừng! Đã hoàn thành"     │
│  "✅ [schedule title]"              │
│  "⏰ [completion time]"             │
└─────────────────────────────────────┘
```

**Kết quả:**
- Status changed to 'completed'
- Celebration message
- Schedule vẫn trong database (có thể xem lại)

---

### 9. 🔔 Đặt nhắc lịch (*nhac <ID> <số_phút>)

```
User: "*nhac 123 30"
         │
         ▼
┌─────────────────────────────────────┐
│  NhacCommand.execute()              │
│  - Parse schedule ID                │
│  - Parse minutes                    │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Validate Minutes                   │
│  - Must be positive number          │
│  - Reasonable range (1-1440)        │
└────────┬────────────────────────────┘
         │ Valid
         ▼
┌─────────────────────────────────────┐
│  Query Schedule                     │
│  - Check ownership                  │
│  - Get start_time                   │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Found    Not Found
    │         │
    ▼         ▼
  Continue  Return Error
    │
    ▼
┌─────────────────────────────────────┐
│  Calculate remind_at                │
│  remind_at = start_time -           │
│    (minutes * 60000)                │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Check remind_at is future          │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Future    Past
    │         │
    ▼         ▼
  Continue  Return "Thời gian đã qua"
    │
    ▼
┌─────────────────────────────────────┐
│  Update Schedule                    │
│  scheduleRepository.update(id, {    │
│    remind_at: remind_at,            │
│    is_reminded: false               │
│  })                                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send Confirmation                  │
│  "🔔 Đã đặt nhắc nhở"              │
│  "⏰ Sẽ nhắc lúc: [remind_at]"     │
│  "📌 Trước [minutes] phút"         │
└─────────────────────────────────────┘
```

**Kết quả:**
- remind_at được update
- is_reminded reset về false
- Confirmation với thời gian nhắc

---

### 10. 🔕 Tắt nhắc lịch (*tat-nhac <ID>)

```
User: "*tat-nhac 123"
         │
         ▼
┌─────────────────────────────────────┐
│  TatNhacCommand.execute()           │
│  - Parse schedule ID                │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Query Schedule                     │
│  - Check ownership                  │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Found    Not Found
    │         │
    ▼         ▼
  Continue  Return Error
    │
    ▼
┌─────────────────────────────────────┐
│  Check if reminder exists           │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Has      No Reminder
 Reminder      │
    │         ▼
    │    Return "Không có nhắc nhở"
    ▼
┌─────────────────────────────────────┐
│  Disable Reminder                   │
│  scheduleRepository.update(id, {    │
│    remind_at: null,                 │
│    is_reminded: false               │
│  })                                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send Confirmation                  │
│  "🔕 Đã tắt nhắc nhở"              │
│  "📌 [schedule title]"              │
└─────────────────────────────────────┘
```

**Kết quả:**
- remind_at set to null
- is_reminded reset
- Confirmation message

---

### 11. 🔄 Reminder Automation (Background Cron Job)

```
Every Minute (Cron: * * * * *)
         │
         ▼
┌─────────────────────────────────────┐
│  ReminderService                    │
│    .checkAndSendReminders()         │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Query Schedules                    │
│  WHERE remind_at <= NOW             │
│    AND is_reminded = false          │
│    AND status = 'pending'           │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Empty    Has Data
    │         │
    ▼         ▼
   End     Continue
           │
           ▼
┌─────────────────────────────────────┐
│  For Each Schedule                  │
│  - Load user + settings             │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Calculate Time Until Event         │
│  minutes = (start_time - now) / 60s │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Format Reminder Message            │
│  MessageFormatter.formatReminder()  │
│  - Title, description               │
│  - Time remaining                   │
│  - Schedule ID                      │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Check Notification Preference      │
└────────┬────────────────────────────┘
         │
    ┌────┴────┐
    │         │
  Via DM   Via Channel
    │         │
    ▼         ▼
┌─────────┐ ┌─────────────────┐
│ Send DM │ │ Send to Channel │
│ to user │ │ (default_channel│
└────┬────┘ │ _id)            │
     │      └────┬────────────┘
     │           │
     └─────┬─────┘
           │
           ▼
┌─────────────────────────────────────┐
│  Mark as Reminded                   │
│  scheduleRepository.update({        │
│    is_reminded: true                │
│  })                                 │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Log Success                        │
│  "✅ Sent reminder for #[id]"      │
└─────────────────────────────────────┘
```

**Kết quả:**
- Reminder được gửi tự động
- is_reminded = true (không gửi lại)
- Gửi qua DM hoặc Channel tùy settings

---

### 12. ❓ Xem hướng dẫn (*help)

```
User: "*help"
         │
         ▼
┌─────────────────────────────────────┐
│  HelpCommand.execute()              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Generate Help Message              │
│  - List all commands                │
│  - Syntax for each                  │
│  - Examples                         │
│  - Grouped by category              │
└────────┬────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────┐
│  Send Help Message                  │
│  "📖 HƯỚNG DẪN SỬ DỤNG BOT"        │
│                                     │
│  "🆕 Khởi tạo:"                    │
│  "*batdau - Khởi tạo người dùng"    │
│                                     │
│  "📅 Quản lý lịch:"                │
│  "*them-lich - Thêm lịch mới"      │
│  "*lich-hom-nay - Xem lịch hôm nay" │
│  "*lich-tuan - Xem lịch tuần"       │
│  ...                                │
│                                     │
│  "🔔 Nhắc nhở:"                    │
│  "*nhac <ID> <phút> - Đặt nhắc"    │
│  "*tat-nhac <ID> - Tắt nhắc"       │
└─────────────────────────────────────┘
```

**Kết quả:**
- Comprehensive help message
- Grouped by category
- With examples

---

## Kiến Trúc Source Code

### NestJS Module Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    AppModule (Root)                     │
│  - Import ConfigModule, TypeOrmModule, ScheduleModule   │
│  - Global configuration & database connection           │
└────────────┬────────────────────────────────────────────┘
             │
             ├─────────────────────────────────────────────┐
             │                                             │
┌────────────▼──────────┐  ┌────────────▼──────────┐     │
│     BotModule         │  │   ScheduleModule      │     │
│  - BotService         │  │  - ScheduleService    │     │
│  - BotGateway         │  │  - Event Entity       │     │
│  - Command Handlers   │  │  - Event Repository   │     │
└───────────────────────┘  └───────────────────────┘     │
                                                          │
             ┌────────────────────────────────────────────┘
             │
┌────────────▼──────────┐  ┌────────────▼──────────┐
│   ReminderModule      │  │    SharedModule       │
│  - ReminderService    │  │  - DateParser         │
│  - Reminder Entity    │  │  - MessageFormatter   │
│  - Cron Jobs          │  │  - Guards & Pipes     │
└───────────────────────┘  └───────────────────────┘
```

### Dependency Flow

```
Controllers/Gateways
        ↓
    Services (Business Logic)
        ↓
    Repositories (Data Access)
        ↓
    TypeORM Entities
        ↓
    PostgreSQL Database
```

### Module Responsibilities

#### 1. **AppModule** (Root Module)
```typescript
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        type: 'postgres',
        url: process.env.DATABASE_URL,
        entities: [__dirname + '/**/*.entity{.ts,.js}'],
        synchronize: false,
        ssl: { rejectUnauthorized: false },
      }),
    }),
    ScheduleModule.forRoot(),
    BotModule,
    ScheduleModule,
    ReminderModule,
    SharedModule,
  ],
})
export class AppModule {}
```

**Chức năng:**
- ✅ Bootstrap toàn bộ application
- ✅ Configure global modules (Config, TypeORM, Schedule)
- ✅ Import tất cả feature modules
- ✅ Setup database connection

---

#### 2. **BotModule** (Mezon Bot Integration)
```typescript
@Module({
  imports: [SharedModule, ScheduleModule],
  providers: [BotService, BotGateway, ...CommandHandlers],
  exports: [BotService],
})
export class BotModule implements OnModuleInit {
  async onModuleInit() {
    await this.botService.initialize();
  }
}
```

**Components:**

##### **BotService** (Core Bot Logic)
**File**: `src/bot/bot.service.ts`

```typescript
@Injectable()
export class BotService {
  private client: MezonClient;

  async initialize() {
    this.client = new MezonClient({
      botId: process.env.BOT_ID,
      token: process.env.BOT_TOKEN,
    });

    await this.client.login();
  }

  async sendMessage(channelId: string, content: string) {
    const channel = await this.client.channels.fetch(channelId);
    await channel.send({ t: content });
  }
}
```

**Chức năng:**
- ✅ Wrap MezonClient
- ✅ Handle authentication
- ✅ Provide message sending methods
- ✅ Manage WebSocket connection

##### **BotGateway** (Event Listener)
**File**: `src/bot/bot.gateway.ts`

```typescript
@Injectable()
export class BotGateway implements OnModuleInit {
  constructor(
    private botService: BotService,
    private commandRouter: CommandRouter,
  ) {}

  onModuleInit() {
    this.botService.client.onChannelMessage(async (message) => {
      if (message.content?.t?.startsWith('!')) {
        await this.commandRouter.handle(message);
      }
    });
  }
}
```

**Chức năng:**
- ✅ Listen to Mezon events
- ✅ Route commands to handlers
- ✅ Handle errors gracefully

##### **Command Handlers**
**File**: `src/bot/commands/them-lich.command.ts`

```typescript
@Injectable()
export class ThemLichCommand {
  constructor(
    private scheduleService: ScheduleService,
    private userService: UserService,
    private botService: BotService,
  ) {}

  async execute(message: ChannelMessage, args: string[]) {
    // Check if user exists
    const user = await this.userService.findByUserId(message.sender_id);
    if (!user) {
      throw new BadRequestException(
        'Bạn chưa khởi tạo. Vui lòng dùng lệnh *batdau'
      );
    }

    // Parse input (interactive or inline)
    const scheduleData = await this.parseInput(message, args);
    
    // Validate
    if (!scheduleData.title || !scheduleData.start_time) {
      throw new BadRequestException('Thiếu thông tin bắt buộc');
    }

    // Calculate remind_at
    const remindMinutes = user.settings?.default_remind_minutes || 30;
    const remindAt = new Date(
      scheduleData.start_time.getTime() - remindMinutes * 60000
    );

    // Create schedule
    const schedule = await this.scheduleService.createSchedule({
      user_id: message.sender_id,
      item_type: scheduleData.item_type || 'task',
      title: scheduleData.title,
      description: scheduleData.description,
      start_time: scheduleData.start_time,
      end_time: scheduleData.end_time,
      remind_at: remindAt,
      status: 'pending',
    });

    // Send confirmation
    await this.botService.sendMessage(
      message.channel_id,
      `✅ Đã thêm lịch: ${schedule.title} (ID: ${schedule.id})`,
    );
  }
}
```

**Chức năng:**
- ✅ Parse command arguments
- ✅ Validate input
- ✅ Call service methods
- ✅ Send response to user

---

#### 3. **ScheduleModule** (Event Management)
```typescript
@Module({
  imports: [TypeOrmModule.forFeature([Event, User])],
  providers: [ScheduleService],
  exports: [ScheduleService, TypeOrmModule],
})
export class ScheduleModule {}
```

**Components:**

##### **Event Entity**
**File**: `src/schedule/entities/event.entity.ts`

```typescript
@Entity('events')
export class Event {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp with time zone' })
  datetime: Date;

  @Column()
  creator_id: string;

  @Column()
  clan_id: string;

  @Column()
  channel_id: string;

  @Column({ type: 'jsonb', default: [] })
  participants: string[];

  @Column({ default: 'none' })
  repeat: 'none' | 'daily' | 'weekly' | 'monthly';

  @Column({ default: false })
  reminder_sent: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
```

##### **ScheduleService** (Business Logic)
**File**: `src/schedules/schedule.service.ts`

```typescript
@Injectable()
export class ScheduleService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
  ) {}

  async createSchedule(dto: CreateScheduleDto): Promise<Schedule> {
    const schedule = this.scheduleRepository.create(dto);
    return await this.scheduleRepository.save(schedule);
  }

  async findSchedulesByDateRange(
    userId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<Schedule[]> {
    return await this.scheduleRepository.find({
      where: {
        user_id: userId,
        start_time: Between(startDate, endDate),
      },
      order: { start_time: 'ASC' },
    });
  }

  async findScheduleById(id: number): Promise<Schedule> {
    return await this.scheduleRepository.findOne({ where: { id } });
  }

  async updateSchedule(id: number, dto: UpdateScheduleDto): Promise<Schedule> {
    await this.scheduleRepository.update(id, dto);
    return await this.scheduleRepository.findOne({ where: { id } });
  }

  async deleteSchedule(id: number): Promise<void> {
    await this.scheduleRepository.delete(id);
  }

  async markAsCompleted(id: number): Promise<Schedule> {
    await this.scheduleRepository.update(id, { 
      status: 'completed',
      updated_at: new Date(),
    });
    return await this.scheduleRepository.findOne({ where: { id } });
  }

  async setReminder(id: number, remindAt: Date): Promise<Schedule> {
    await this.scheduleRepository.update(id, { 
      remind_at: remindAt,
      is_reminded: false,
    });
    return await this.scheduleRepository.findOne({ where: { id } });
  }

  async disableReminder(id: number): Promise<Schedule> {
    await this.scheduleRepository.update(id, { 
      remind_at: null,
      is_reminded: false,
    });
    return await this.scheduleRepository.findOne({ where: { id } });
  }
}
```

**Chức năng:**
- ✅ CRUD operations cho schedules
- ✅ Query theo user và date range
- ✅ Quản lý status (pending, completed, cancelled)
- ✅ Quản lý reminders (set, disable)
- ✅ Transaction handling

---

#### 4. **ReminderModule** (Automated Notifications)
```typescript
@Module({
  imports: [
    TypeOrmModule.forFeature([Event, Reminder]),
    BotModule,
  ],
  providers: [ReminderService],
})
export class ReminderModule {}
```

**Components:**

##### **ReminderService** (Cron Jobs)
**File**: `src/reminder/reminder.service.ts`

```typescript
@Injectable()
export class ReminderService {
  constructor(
    @InjectRepository(Schedule)
    private scheduleRepository: Repository<Schedule>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private botService: BotService,
    private messageFormatter: MessageFormatter,
  ) {}

  @Cron('* * * * *') // Every minute
  async checkAndSendReminders() {
    const now = new Date();

    // Find schedules that need reminders
    const schedulesToRemind = await this.scheduleRepository.find({
      where: {
        remind_at: LessThanOrEqual(now),
        is_reminded: false,
        status: 'pending', // Only remind pending schedules
      },
      relations: ['user', 'user.settings'],
    });

    for (const schedule of schedulesToRemind) {
      await this.sendReminder(schedule);
      
      // Mark as reminded
      schedule.is_reminded = true;
      await this.scheduleRepository.save(schedule);
    }
  }

  private async sendReminder(schedule: Schedule) {
    const user = schedule.user;
    const settings = user.settings;

    // Calculate time until event
    const minutesUntil = Math.floor(
      (schedule.start_time.getTime() - Date.now()) / 60000
    );

    // Format message
    const message = this.messageFormatter.formatReminder(schedule, minutesUntil);

    // Send to channel or DM based on user settings
    if (settings?.notify_via_dm) {
      await this.botService.sendDirectMessage(user.user_id, message);
    } else {
      const channelId = settings?.default_channel_id;
      if (channelId) {
        await this.botService.sendMessage(channelId, message);
      }
    }
  }

  // Manual reminder setting
  async setReminder(scheduleId: number, minutesBefore: number): Promise<void> {
    const schedule = await this.scheduleRepository.findOne({ 
      where: { id: scheduleId } 
    });
    
    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const remindAt = new Date(
      schedule.start_time.getTime() - minutesBefore * 60000
    );

    schedule.remind_at = remindAt;
    schedule.is_reminded = false;
    await this.scheduleRepository.save(schedule);
  }

  async disableReminder(scheduleId: number): Promise<void> {
    await this.scheduleRepository.update(scheduleId, {
      remind_at: null,
      is_reminded: false,
    });
  }
}
```

**Chức năng:**
- ✅ Run cron jobs every minute
- ✅ Query schedules cần nhắc nhở
- ✅ Send reminders qua channel hoặc DM
- ✅ Mark reminders as sent
- ✅ Support manual reminder setting (*nhac command)
- ✅ Support disable reminder (*tat-nhac command)

---

#### 5. **SharedModule** (Common Utilities)
```typescript
@Module({
  providers: [DateParser, MessageFormatter, ValidationPipe],
  exports: [DateParser, MessageFormatter, ValidationPipe],
})
export class SharedModule {}
```

**Components:**

##### **DateParser** (Date Utilities)
**File**: `src/shared/utils/date-parser.ts`

```typescript
@Injectable()
export class DateParser {
  parse(dateStr: string): Date | null {
    // Support multiple formats
    const formats = [
      /^(\d{2})\/(\d{2})\/(\d{4})\s+(\d{2}):(\d{2})$/, // DD/MM/YYYY HH:mm
      /^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})$/,   // YYYY-MM-DD HH:mm
    ];

    for (const format of formats) {
      const match = dateStr.match(format);
      if (match) {
        return this.parseMatch(match);
      }
    }

    return null;
  }

  formatDate(date: Date): string {
    return format(date, 'dd/MM/yyyy HH:mm', { 
      timeZone: 'Asia/Ho_Chi_Minh' 
    });
  }

  getDateRange(filter: string): { start: Date; end: Date } {
    const now = new Date();
    
    switch (filter) {
      case 'today':
        return {
          start: startOfDay(now),
          end: endOfDay(now),
        };
      case 'week':
        return {
          start: startOfWeek(now),
          end: endOfWeek(now),
        };
      case 'month':
        return {
          start: startOfMonth(now),
          end: endOfMonth(now),
        };
      default:
        return { start: now, end: now };
    }
  }
}
```

##### **MessageFormatter** (Message Templates)
**File**: `src/shared/utils/message-formatter.ts`

```typescript
@Injectable()
export class MessageFormatter {
  formatScheduleAdded(schedule: Schedule): string {
    return `✅ **Đã thêm lịch mới!**\n\n` +
           `📌 **${schedule.title}**\n` +
           `⏰ ${this.formatDate(schedule.start_time)}\n` +
           `📝 ${schedule.description || 'Không có mô tả'}\n` +
           `🆔 ID: \`${schedule.id}\`\n` +
           `📊 Trạng thái: ${this.formatStatus(schedule.status)}`;
  }

  formatScheduleList(schedules: Schedule[], title: string): string {
    if (schedules.length === 0) {
      return `📅 **${title}**\n\nKhông có lịch nào.`;
    }

    let message = `📅 **${title}**\n\n`;
    
    schedules.forEach((schedule, index) => {
      const statusIcon = this.getStatusIcon(schedule.status);
      message += `${statusIcon} **${index + 1}. ${schedule.title}**\n`;
      message += `   ⏰ ${this.formatDate(schedule.start_time)}`;
      if (schedule.end_time) {
        message += ` - ${this.formatTime(schedule.end_time)}`;
      }
      message += `\n`;
      if (schedule.description) {
        message += `   📝 ${schedule.description}\n`;
      }
      message += `   🆔 ID: \`${schedule.id}\`\n\n`;
    });

    return message;
  }

  formatScheduleDetail(schedule: Schedule): string {
    return `📋 **Chi tiết lịch**\n\n` +
           `🆔 ID: \`${schedule.id}\`\n` +
           `📌 Tiêu đề: **${schedule.title}**\n` +
           `📝 Mô tả: ${schedule.description || 'Không có'}\n` +
           `🏷️ Loại: ${schedule.item_type}\n` +
           `⏰ Bắt đầu: ${this.formatDate(schedule.start_time)}\n` +
           `⏱️ Kết thúc: ${schedule.end_time ? this.formatDate(schedule.end_time) : 'Không có'}\n` +
           `📊 Trạng thái: ${this.formatStatus(schedule.status)}\n` +
           `🔔 Nhắc lúc: ${schedule.remind_at ? this.formatDate(schedule.remind_at) : 'Không có'}\n` +
           `📅 Tạo lúc: ${this.formatDate(schedule.created_at)}`;
  }

  formatReminder(schedule: Schedule, minutesUntil: number): string {
    const timeText = this.formatTimeUntil(minutesUntil);
    
    return `⏰ **NHẮC NHỞ LỊCH**\n\n` +
           `📌 **${schedule.title}**\n` +
           `⏰ Sẽ diễn ra sau ${timeText}\n` +
           `📝 ${schedule.description || 'Không có mô tả'}\n` +
           `🕐 Thời gian: ${this.formatDate(schedule.start_time)}\n` +
           `🆔 ID: \`${schedule.id}\``;
  }

  private formatDate(date: Date): string {
    return format(date, 'dd/MM/yyyy HH:mm', { 
      timeZone: 'Asia/Ho_Chi_Minh' 
    });
  }

  private formatTime(date: Date): string {
    return format(date, 'HH:mm', { 
      timeZone: 'Asia/Ho_Chi_Minh' 
    });
  }

  private formatStatus(status: string): string {
    const statusMap = {
      'pending': '⏳ Đang chờ',
      'completed': '✅ Hoàn thành',
      'cancelled': '❌ Đã hủy',
    };
    return statusMap[status] || status;
  }

  private getStatusIcon(status: string): string {
    const iconMap = {
      'pending': '⏳',
      'completed': '✅',
      'cancelled': '❌',
    };
    return iconMap[status] || '📌';
  }

  private formatTimeUntil(minutes: number): string {
    if (minutes < 60) {
      return `${minutes} phút`;
    } else if (minutes < 1440) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return mins > 0 ? `${hours} giờ ${mins} phút` : `${hours} giờ`;
    } else {
      const days = Math.floor(minutes / 1440);
      return `${days} ngày`;
    }
  }
}
```

**Chức năng:**
- ✅ Format messages cho các commands
- ✅ Format schedule list với status icons
- ✅ Format chi tiết schedule
- ✅ Format reminder messages
- ✅ Support Vietnamese language
- ✅ Timezone-aware date formatting

---

### Data Flow Example: Add Schedule Command

```
1. User sends: "*them-lich"
                    ↓
2. BotGateway receives message via onChannelMessage
                    ↓
3. CommandRouter identifies "them-lich" command
                    ↓
4. ThemLichCommand.execute() is called
                    ↓
5. Check if user exists in database
                    ↓
6. Interactive prompt or parse inline args
                    ↓
7. DateParser.parse() validates datetime
                    ↓
8. Calculate remind_at = start_time - default_remind_minutes
                    ↓
9. ScheduleService.createSchedule() creates entity
                    ↓
10. ScheduleRepository.save() persists to PostgreSQL
                    ↓
11. MessageFormatter.formatScheduleAdded() creates response
                    ↓
12. BotService.sendMessage() sends to Mezon
                    ↓
13. User sees confirmation with schedule ID ✅
```

### Error Handling Flow

```
Exception thrown in Command Handler
            ↓
    NestJS Exception Filter
            ↓
    Log error (Winston/Pino)
            ↓
    Format user-friendly message
            ↓
    Send error message to channel
            ↓
    User sees error explanation
```

### Testing Strategy

```
Unit Tests
├── Services (mock repositories)
├── Utilities (pure functions)
└── Formatters (string output)

Integration Tests
├── Database operations (test DB)
├── Command handlers (mock bot)
└── Cron jobs (mock time)

E2E Tests
├── Full command flow
├── Database persistence
└── Bot responses
```

---

## Cấu Trúc Thư Mục

```
timetable-bot/
├── src/                          # Source code
│   ├── main.ts                   # NestJS bootstrap
│   ├── app.module.ts             # Root module
│   │
│   ├── bot/                      # Bot module
│   │   ├── bot.module.ts
│   │   ├── bot.service.ts        # MezonClient wrapper
│   │   ├── bot.gateway.ts        # Event listeners
│   │   └── commands/             # Command handlers
│   │       ├── add.command.ts
│   │       ├── list.command.ts
│   │       ├── delete.command.ts
│   │       └── help.command.ts
│   │
│   ├── schedule/                 # Schedule module
│   │   ├── schedule.module.ts
│   │   ├── schedule.service.ts   # Business logic
│   │   ├── entities/
│   │   │   ├── event.entity.ts
│   │   │   └── user.entity.ts
│   │   └── dto/
│   │       ├── create-event.dto.ts
│   │       └── update-event.dto.ts
│   │
│   ├── reminder/                 # Reminder module
│   │   ├── reminder.module.ts
│   │   ├── reminder.service.ts   # Cron jobs
│   │   └── entities/
│   │       └── reminder.entity.ts
│   │
│   ├── shared/                   # Shared module
│   │   ├── shared.module.ts
│   │   ├── utils/
│   │   │   ├── date-parser.ts
│   │   │   └── message-formatter.ts
│   │   └── guards/
│   │       └── bot-auth.guard.ts
│   │
│   └── config/                   # Configuration
│       ├── database.config.ts
│       └── bot.config.ts
│
├── migrations/                   # TypeORM migrations
│   └── 1234567890-CreateEvents.ts
│
├── test/                         # Tests
│   ├── unit/
│   └── e2e/
│
├── dist/                         # Compiled JavaScript (gitignored)
│
├── node_modules/                 # Dependencies (gitignored)
│
├── .env                          # Environment variables (gitignored)
├── .env.example                  # Template for .env
├── .gitignore                    # Git ignore rules
├── nest-cli.json                 # NestJS CLI config
├── package.json                  # NPM dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
├── tsconfig.build.json           # Build configuration
├── README.md                     # User documentation
└── KIRO.md                       # This file - AI context
```

### File Naming Conventions

**CRITICAL**: All files MUST use **kebab-case** format (lowercase with hyphens).

- **Modules**: `<name>.module.ts` (e.g., `bot.module.ts`, `schedule.module.ts`)
- **Services**: `<name>.service.ts` (e.g., `bot.service.ts`, `reminder.service.ts`)
- **Controllers**: `<name>.controller.ts` (e.g., `user.controller.ts`)
- **Gateways**: `<name>.gateway.ts` (e.g., `bot.gateway.ts`)
- **Commands**: `<name>.command.ts` (e.g., `add.command.ts`, `list.command.ts`)
- **Entities**: `<name>.entity.ts` (e.g., `event.entity.ts`, `user.entity.ts`)
- **DTOs**: `<name>.dto.ts` (e.g., `create-event.dto.ts`, `update-event.dto.ts`)
- **Guards**: `<name>.guard.ts` (e.g., `bot-auth.guard.ts`)
- **Interceptors**: `<name>.interceptor.ts` (e.g., `logging.interceptor.ts`)
- **Utilities**: `<name>.ts` (e.g., `date-parser.ts`, `message-formatter.ts`)
- **Migrations**: `<timestamp>-<Description>.ts` (e.g., `1234567890-CreateEvents.ts`)

**Examples**:
- ✅ `reminder.service.ts` (correct)
- ❌ `reminderService.ts` (wrong - camelCase)
- ❌ `ReminderService.ts` (wrong - PascalCase)
- ✅ `create-event.dto.ts` (correct - multi-word with hyphens)
- ❌ `createEvent.dto.ts` (wrong - camelCase)

---

## Database Schema

### Tables Overview

Dựa trên database schema thực tế, hệ thống có 3 bảng chính:

#### 1. **users** - Quản lý người dùng
#### 2. **user_settings** - Cài đặt cá nhân
#### 3. **schedules** - Lịch trình/sự kiện

---

### Table: `users`

```sql
CREATE TABLE users (
  user_id VARCHAR(50) PRIMARY KEY,
  username VARCHAR(100),
  display_name VARCHAR(150),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mô tả:**
- `user_id`: ID người dùng từ Mezon (Primary Key)
- `username`: Tên đăng nhập
- `display_name`: Tên hiển thị
- `created_at`: Thời gian tạo
- `updated_at`: Thời gian cập nhật

---

### Table: `user_settings`

```sql
CREATE TABLE user_settings (
  user_id VARCHAR(50) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
  default_channel_id VARCHAR(50),
  default_remind_minutes INTEGER DEFAULT 30,
  notify_via_dm BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Mô tả:**
- `user_id`: Foreign key tới bảng users
- `timezone`: Múi giờ của user (mặc định: Asia/Ho_Chi_Minh)
- `default_channel_id`: Channel mặc định để nhận thông báo
- `default_remind_minutes`: Số phút nhắc trước mặc định (30 phút)
- `notify_via_dm`: Có gửi thông báo qua DM không
- `created_at`, `updated_at`: Timestamps

---

### Table: `schedules`

```sql
CREATE TABLE schedules (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
  item_type VARCHAR(20) NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  status VARCHAR(20) DEFAULT 'pending',
  remind_at TIMESTAMP WITH TIME ZONE,
  is_reminded BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_schedules_user_id ON schedules(user_id);
CREATE INDEX idx_schedules_start_time ON schedules(start_time);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_remind_at ON schedules(remind_at, is_reminded);
```

**Mô tả:**
- `id`: Primary key (auto-increment)
- `user_id`: Foreign key tới users
- `item_type`: Loại lịch (VARCHAR 20) - có thể là "meeting", "task", "event", etc.
- `title`: Tiêu đề lịch (bắt buộc)
- `description`: Mô tả chi tiết
- `start_time`: Thời gian bắt đầu (bắt buộc)
- `end_time`: Thời gian kết thúc (optional)
- `status`: Trạng thái (VARCHAR 20) - "pending", "completed", "cancelled"
- `remind_at`: Thời gian sẽ nhắc nhở
- `is_reminded`: Đã gửi nhắc nhở chưa
- `created_at`, `updated_at`: Timestamps

---

### TypeORM Entities

#### **User Entity**
**File**: `src/users/entities/user.entity.ts`

```typescript
@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  user_id: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  username: string;

  @Column({ type: 'varchar', length: 150, nullable: true })
  display_name: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @OneToOne(() => UserSettings, settings => settings.user)
  settings: UserSettings;

  @OneToMany(() => Schedule, schedule => schedule.user)
  schedules: Schedule[];
}
```

#### **UserSettings Entity**
**File**: `src/users/entities/user-settings.entity.ts`

```typescript
@Entity('user_settings')
export class UserSettings {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  user_id: string;

  @Column({ type: 'varchar', length: 50, default: 'Asia/Ho_Chi_Minh' })
  timezone: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  default_channel_id: string;

  @Column({ type: 'integer', default: 30 })
  default_remind_minutes: number;

  @Column({ type: 'boolean', default: false })
  notify_via_dm: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @OneToOne(() => User, user => user.settings)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

#### **Schedule Entity**
**File**: `src/schedules/entities/schedule.entity.ts`

```typescript
@Entity('schedules')
export class Schedule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50 })
  user_id: string;

  @Column({ type: 'varchar', length: 20 })
  item_type: string;

  @Column({ type: 'varchar', length: 255 })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'timestamp with time zone' })
  start_time: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  end_time: Date;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  remind_at: Date;

  @Column({ type: 'boolean', default: false })
  is_reminded: boolean;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  @ManyToOne(() => User, user => user.schedules)
  @JoinColumn({ name: 'user_id' })
  user: User;
}
```

---

### Key Design Decisions

1. **User-centric design**: Mỗi user có settings riêng và quản lý schedules của mình
2. **Flexible item_type**: Cho phép phân loại lịch (meeting, task, event, etc.)
3. **Status tracking**: Theo dõi trạng thái lịch (pending, completed, cancelled)
4. **Reminder system**: 
   - `remind_at`: Thời điểm sẽ gửi nhắc nhở (được tính từ start_time - remind_minutes)
   - `is_reminded`: Flag để tránh gửi duplicate
5. **Timezone support**: Mỗi user có timezone riêng
6. **Flexible time range**: start_time bắt buộc, end_time optional (cho tasks không có thời gian kết thúc)
7. **Indexes**: Optimize queries theo user_id, start_time, status, và remind_at

---

### Common Queries

#### Lấy lịch hôm nay của user
```typescript
const today = startOfDay(new Date());
const tomorrow = endOfDay(new Date());

const schedules = await scheduleRepository.find({
  where: {
    user_id: userId,
    start_time: Between(today, tomorrow),
  },
  order: { start_time: 'ASC' },
});
```

#### Lấy lịch cần nhắc nhở
```typescript
const now = new Date();
const schedules = await scheduleRepository.find({
  where: {
    remind_at: LessThanOrEqual(now),
    is_reminded: false,
  },
});
```

#### Đánh dấu hoàn thành
```typescript
await scheduleRepository.update(
  { id: scheduleId },
  { status: 'completed', updated_at: new Date() }
);
```

---

## Bot Commands

### Command Reference

| Command | Syntax | Description | Example |
|---------|--------|-------------|---------|
| `*help` | `*help` | Xem hướng dẫn sử dụng bot | `*help` |
| `*batdau` | `*batdau` | Khởi tạo người dùng mới | `*batdau` |
| `*them-lich` | `*them-lich` | Thêm lịch mới (interactive) | `*them-lich` |
| `*lich-hom-nay` | `*lich-hom-nay` | Xem lịch hôm nay | `*lich-hom-nay` |
| `*lich-ngay` | `*lich-ngay [DD-MM-YYYY]` | Xem lịch theo ngày | `*lich-ngay 21-4-2026` |
| `*lich-tuan` | `*lich-tuan [DD-MM-YYYY]` | Xem lịch tuần này hoặc tuần chứa ngày | `*lich-tuan 21-4-2026` |
| `*lich-tuan-truoc` | `*lich-tuan-truoc` | Xem lịch tuần trước | `*lich-tuan-truoc` |
| `*lich-tuan-sau` | `*lich-tuan-sau` | Xem lịch tuần sau | `*lich-tuan-sau` |
| `*chi-tiet` | `*chi-tiet <ID>` | Xem chi tiết lịch | `*chi-tiet 123` |
| `*sua-lich` | `*sua-lich <ID>` | Chỉnh sửa lịch | `*sua-lich 123` |
| `*xoa-lich` | `*xoa-lich <ID>` | Xóa lịch | `*xoa-lich 123` |
| `*hoan-thanh` | `*hoan-thanh <ID>` | Đánh dấu hoàn thành | `*hoan-thanh 123` |
| `*nhac` | `*nhac <ID> <số_phút>` | Đặt nhắc lịch | `*nhac 123 30` |
| `*tat-nhac` | `*tat-nhac <ID>` | Tắt nhắc lịch | `*tat-nhac 123` |

### Command Prefix

**IMPORTANT**: Bot sử dụng prefix `*` (dấu sao) thay vì `!` (dấu chấm than).

### Command Categories

#### 1. **User Management**
- `*batdau` - Khởi tạo user settings (timezone, default channel, reminder preferences)

#### 2. **Schedule Management**
- `*them-lich` - Tạo lịch mới (có thể interactive hoặc inline)
- `*sua-lich <ID>` - Chỉnh sửa thông tin lịch
- `*xoa-lich <ID>` - Xóa lịch
- `*hoan-thanh <ID>` - Đánh dấu lịch đã hoàn thành

#### 3. **View Schedules**
- `*lich-hom-nay` - Lịch hôm nay
- `*lich-ngay [date]` - Lịch theo ngày cụ thể
- `*lich-tuan [date]` - Lịch tuần này hoặc tuần chứa ngày
- `*lich-tuan-truoc` - Lịch tuần trước
- `*lich-tuan-sau` - Lịch tuần sau
- `*chi-tiet <ID>` - Chi tiết một lịch

#### 4. **Reminder Management**
- `*nhac <ID> <minutes>` - Đặt nhắc nhở trước X phút
- `*tat-nhac <ID>` - Tắt nhắc nhở

#### 5. **Help**
- `*help` - Hiển thị hướng dẫn đầy đủ

### Command Flow Diagram

```
User Input → Parse → Validate → Execute → Respond
     ↓          ↓         ↓          ↓         ↓
"*them-lich" Extract   Check     DB Op    Format
             command   syntax    Insert   message
```

---

## Automation & Cron Jobs

### Cron Schedule

**File**: `src/reminder/reminder.service.ts`

```typescript
// reminder.service.ts
@Injectable()
export class ReminderService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
    private botService: BotService,
  ) {}

  // Check reminders every minute
  @Cron('* * * * *')
  async checkAndSendReminders() {
    const now = new Date();
    const future = new Date(now.getTime() + 60 * 60000);

    const upcomingEvents = await this.eventRepository.find({
      where: {
        datetime: Between(now, future),
        reminder_sent: false,
      },
    });

    for (const event of upcomingEvents) {
      const minutesUntil = Math.floor(
        (event.datetime.getTime() - now.getTime()) / 60000
      );

      if ([60, 30, 5].includes(minutesUntil)) {
        await this.sendReminder(event, minutesUntil);
        event.reminder_sent = true;
        await this.eventRepository.save(event);
      }
    }
  }
}
```

### Reminder Logic

```
Every minute:
  1. Query events where:
     - datetime between NOW and NOW+60min
     - reminder_sent = 0
  
  2. For each event:
     - Calculate minutes until event
     - If minutes in [60, 30, 5]:
       - Send reminder
       - Mark as sent
```

---

## Development Workflow

### Setup

```bash
# 1. Clone & install
git clone <repo>
cd timetable-bot
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env:
# - BOT_ID=your_bot_id
# - BOT_TOKEN=your_bot_token
# - DATABASE_URL=postgresql://...

# 3. Run migrations
npm run migration:run

# 4. Start development
npm run start:dev
```

### Development Commands

```bash
npm run start:dev    # Start with watch mode
npm run build        # Compile TypeScript
npm run start:prod   # Run production build
npm run lint         # Check code style
npm run test         # Run unit tests
npm run test:e2e     # Run e2e tests

# Database commands
npm run migration:generate -- -n CreateEvents
npm run migration:run
npm run migration:revert
```

### Code Style

- **Indentation**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: Required
- **Naming**:
  - Variables/Functions: camelCase
  - Classes: PascalCase
  - Constants: UPPER_SNAKE_CASE
  - Files: kebab-case (NestJS convention)
  - Modules: `<name>.module.ts`
  - Services: `<name>.service.ts`
  - Entities: `<name>.entity.ts`

### NestJS Best Practices

- ✅ Use dependency injection
- ✅ Keep services thin, delegate to repositories
- ✅ Use DTOs for validation
- ✅ Use Guards for authorization
- ✅ Use Interceptors for logging/transformation
- ✅ Use Pipes for validation
- ✅ Keep modules focused and cohesive

---

## Deployment

### Production Checklist

- [ ] Set production environment variables
- [ ] Run database migrations
- [ ] Build application: `npm run build`
- [ ] Test production build: `npm run start:prod`
- [ ] Setup process manager (PM2)
- [ ] Configure auto-restart
- [ ] Setup logging (Winston/Pino)
- [ ] Configure database connection pooling
- [ ] Setup monitoring (health checks)
- [ ] Backup database regularly

### PM2 Deployment

```bash
# Install PM2
npm install -g pm2

# Build application
npm run build

# Start with PM2
pm2 start dist/main.js --name timetable-bot

# Auto-restart on reboot
pm2 startup
pm2 save

# View logs
pm2 logs timetable-bot

# Monitor
pm2 monit
```

### Environment Variables

```env
# Bot Configuration
BOT_ID=your_bot_id_here
BOT_TOKEN=your_bot_token_here
BOT_PREFIX=!

# Database (Neon PostgreSQL)
DATABASE_URL=postgresql://neondb_owner:***@ep-purple-voice-a0n0a8ls-pooler.c-2.ap-southeast-1.aws.neon.tech/neondb?sslmode=require

# Application
NODE_ENV=production
PORT=3000
TZ=Asia/Ho_Chi_Minh

# Logging
LOG_LEVEL=info
```

---

## Troubleshooting

### Common Issues

1. **Bot không kết nối**
   - Check BOT_ID và BOT_TOKEN
   - Verify bot đã được add vào clan

2. **Database errors**
   - Check quyền ghi vào thư mục `data/`
   - Xóa database và để bot tạo lại

3. **Reminders không gửi**
   - Check cron job đang chạy
   - Verify timezone settings

---

## Next Steps

### Planned Features

- [ ] Interactive buttons (edit/delete inline)
- [ ] Export calendar (ICS format)
- [ ] Multi-timezone support
- [ ] Event categories/tags
- [ ] Permissions system
- [ ] Analytics dashboard

### Contributing

1. Fork repo
2. Create feature branch
3. Make changes
4. Test thoroughly
5. Submit PR

---

**📝 Note**: File này được tạo để AI assistants (Kiro, Cursor, Copilot) có thể hiểu nhanh project context và hỗ trợ development hiệu quả hơn.

**🔄 Last Updated**: April 2026
