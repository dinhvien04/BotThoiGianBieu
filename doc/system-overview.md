# 🏗️ Tổng Quan Hệ Thống

## Giới Thiệu

Bot Thời Gian Biểu là một ứng dụng NestJS tích hợp với Mezon platform để quản lý lịch trình, sự kiện và nhắc nhở tự động cho các thành viên trong clan.

## Kiến Trúc Tổng Thể

```
┌─────────────────────────────────────────────────────────┐
│                   Mezon Platform                        │
│  (Clans, Channels, Users, Messages, WebSocket)         │
└────────────────────┬────────────────────────────────────┘
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
│  │  - Entities: Schedule, User, Tag                 │  │
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
│  Tables: schedules, users, tags, user_settings          │
│  Connection: postgresql://neondb_owner:***@...          │
└─────────────────────────────────────────────────────────┘
```

## Tech Stack

### Core Technologies

| Technology | Version | Purpose | Lý do chọn |
|------------|---------|---------|------------|
| **Node.js** | 18+ | Runtime environment | Async I/O, ecosystem lớn |
| **NestJS** | 10.x | Backend framework | Modular, scalable, enterprise-ready |
| **TypeScript** | 5.x | Programming language | Type safety, developer experience tốt |
| **Mezon SDK** | 2.8.44+ | Mezon platform integration | SDK chính thức, đầy đủ tính năng |
| **PostgreSQL** | 15+ | Database | Robust, ACID, scalable |
| **TypeORM** | 0.3.x | ORM | Type-safe queries, migrations |

### Supporting Libraries

| Library | Purpose |
|---------|---------|
| `@nestjs/schedule` | Cron jobs cho reminders |
| `@nestjs/config` | Configuration management |
| `xlsx` | Excel import/export |
| `pg` | PostgreSQL driver |

## Luồng Hoạt Động Chính

### 1. Bot Startup

```mermaid
graph TD
    A[npm start] --> B[Load Environment Variables]
    B --> C[Initialize Database Connection]
    C --> D[Run Migrations]
    D --> E[Create MezonClient]
    E --> F[Setup Event Handlers]
    F --> G[Setup Cron Jobs]
    G --> H[Login to Mezon]
    H --> I[Bot Ready 🚀]
```

### 2. Command Processing

```mermaid
graph TD
    A[User sends message] --> B{Starts with prefix?}
    B -->|No| C[Ignore]
    B -->|Yes| D[Parse command & args]
    D --> E[Route to handler]
    E --> F{User exists?}
    F -->|No| G[Prompt *bat-dau]
    F -->|Yes| H[Execute command logic]
    H --> I[Validate input]
    I --> J[Database operations]
    J --> K[Format response]
    K --> L[Send reply to user]
```

### 3. Reminder System

```mermaid
graph TD
    A[Cron job runs every minute] --> B[Query schedules needing reminder]
    B --> C{Any schedules found?}
    C -->|No| D[Wait for next run]
    C -->|Yes| E[For each schedule]
    E --> F[Get user settings]
    F --> G[Format reminder message]
    G --> H[Send to channel or DM]
    H --> I[Update reminder status]
    I --> J[Schedule next reminder if recurring]
```

## Modules Chi Tiết

### App Module
- **Vai trò**: Root module, orchestrate toàn bộ ứng dụng
- **Imports**: Tất cả feature modules
- **Providers**: Global services, configuration

### Bot Module
- **BotService**: Wrapper cho MezonClient, quản lý connection
- **BotGateway**: Event listeners cho Mezon events
- **Commands**: Handlers cho từng lệnh bot
- **Interactions**: Xử lý buttons, forms

### Schedules Module
- **SchedulesService**: CRUD operations cho schedules
- **TagsService**: Quản lý tags/nhãn
- **SharesService**: Chia sẻ lịch giữa users
- **AuditService**: Logging các thay đổi
- **UndoService**: Hoàn tác thao tác

### Users Module
- **UsersService**: Quản lý user profiles
- **UserSettings**: Cài đặt cá nhân (timezone, preferences)

### Reminder Module
- **ReminderService**: Cron jobs gửi notifications
- **InteractionHandler**: Xử lý reminder buttons (snooze, acknowledge)

### Shared Module
- **Utilities**: Date parsing, message formatting
- **Constants**: Enums, default values
- **Guards**: Authentication, authorization

## Data Flow

### 1. Thêm Lịch Mới
```
User Input → Command Parser → Validation → Database Insert → Confirmation Message
```

### 2. Xem Lịch
```
User Request → Date Range Calculation → Database Query → Format Response → Display
```

### 3. Reminder Flow
```
Cron Trigger → Query Due Schedules → Format Messages → Send Notifications → Update Status
```

## Scalability Considerations

### Database
- **Indexing**: Composite indexes trên (user_id, start_time) và (remind_at, is_reminded)
- **Partitioning**: Có thể partition theo user_id hoặc date range
- **Connection Pooling**: TypeORM connection pool

### Performance
- **Caching**: Có thể thêm Redis cho user settings
- **Batch Processing**: Reminders được xử lý theo batch
- **Async Operations**: Tất cả I/O operations đều async

### Monitoring
- **Health Checks**: Database connection, Mezon connection
- **Metrics**: Command usage, response times, error rates
- **Logging**: Structured logging với correlation IDs

## Security

### Authentication
- Bot authentication qua Mezon token
- User identification qua Mezon user IDs

### Authorization
- Users chỉ có thể truy cập schedules của mình
- Shared schedules có read-only access

### Data Protection
- Sensitive data không log ra console
- Database credentials qua environment variables
- Input validation và sanitization

## Error Handling

### Graceful Degradation
- Bot tiếp tục hoạt động khi database tạm thời unavailable
- Retry logic cho network operations
- Fallback responses khi services down

### Error Recovery
- Automatic reconnection cho Mezon WebSocket
- Database transaction rollback
- Comprehensive error logging

---

**Tài liệu này cung cấp overview tổng thể về kiến trúc hệ thống. Để biết chi tiết implementation, xem các tài liệu khác trong thư mục `doc/`.**