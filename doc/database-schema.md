# 🗄️ Database Schema

## Tổng Quan

Bot sử dụng PostgreSQL làm database chính với TypeORM làm ORM. Schema được thiết kế để hỗ trợ:

- Multi-user schedule management
- Recurring events
- Priority levels
- Tag system
- Schedule sharing
- Audit logging

## Entity Relationship Diagram

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│      Users      │    │   UserSettings  │    │   Schedules     │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ user_id (PK)    │◄──►│ user_id (PK,FK) │    │ id (PK)         │
│ username        │    │ timezone        │    │ user_id (FK)    │◄──┐
│ display_name    │    │ default_remind  │    │ title           │   │
│ created_at      │    │ notify_via_dm   │    │ description     │   │
│ updated_at      │    │ working_hours   │    │ start_time      │   │
└─────────────────┘    │ created_at      │    │ end_time        │   │
                       │ updated_at      │    │ status          │   │
                       └─────────────────┘    │ priority        │   │
                                              │ remind_at       │   │
┌─────────────────┐                          │ is_reminded     │   │
│      Tags       │                          │ acknowledged_at │   │
├─────────────────┤    ┌─────────────────┐   │ recurrence_*    │   │
│ id (PK)         │    │ Schedule_Tags   │   │ created_at      │   │
│ user_id (FK)    │◄──►│ schedule_id(FK) │◄──│ updated_at      │   │
│ name            │    │ tag_id (FK)     │   └─────────────────┘   │
│ color           │    └─────────────────┘                       │
│ created_at      │                                              │
└─────────────────┘    ┌─────────────────┐                      │
                       │ Schedule_Shares │                      │
                       ├─────────────────┤                      │
                       │ schedule_id(FK) │◄─────────────────────┘
                       │ shared_with_user_id(FK)
                       └─────────────────┘

┌─────────────────┐    ┌─────────────────┐
│ Schedule_Audit  │    │Schedule_Template│
├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │
│ schedule_id(FK) │    │ user_id (FK)    │
│ user_id (FK)    │    │ name            │
│ action          │    │ template_data   │
│ old_data        │    │ created_at      │
│ new_data        │    │ updated_at      │
│ created_at      │    └─────────────────┘
└─────────────────┘
```

## Tables Chi Tiết

### 1. Users Table

Lưu thông tin cơ bản của users từ Mezon.

```sql
CREATE TABLE users (
    user_id VARCHAR(50) PRIMARY KEY,
    username VARCHAR(100),
    display_name VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Columns:**
- `user_id`: Mezon user ID (unique identifier)
- `username`: Mezon username (@username)
- `display_name`: Display name trong Mezon
- `created_at`: Thời điểm tạo record
- `updated_at`: Thời điểm cập nhật cuối

**Indexes:**
- Primary key trên `user_id`

### 2. User_Settings Table

Cài đặt cá nhân của từng user.

```sql
CREATE TABLE user_settings (
    user_id VARCHAR(50) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
    timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
    default_remind_minutes INTEGER DEFAULT 30,
    notify_via_dm BOOLEAN DEFAULT FALSE,
    working_hours_start TIME DEFAULT '09:00:00',
    working_hours_end TIME DEFAULT '17:00:00',
    working_days INTEGER[] DEFAULT '{1,2,3,4,5}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Columns:**
- `user_id`: Foreign key tới users table
- `timezone`: Múi giờ (IANA timezone)
- `default_remind_minutes`: Thời gian nhắc mặc định (phút)
- `notify_via_dm`: Gửi reminder qua DM hay channel
- `working_hours_start/end`: Giờ làm việc
- `working_days`: Ngày làm việc (1=Monday, 7=Sunday)

### 3. Schedules Table

Bảng chính lưu tất cả lịch trình.

```sql
CREATE TABLE schedules (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    item_type VARCHAR(20) DEFAULT 'task',
    title VARCHAR(255) NOT NULL,
    description TEXT,
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    end_time TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) DEFAULT 'pending',
    priority VARCHAR(20) DEFAULT 'normal',
    remind_at TIMESTAMP WITH TIME ZONE,
    is_reminded BOOLEAN DEFAULT FALSE,
    acknowledged_at TIMESTAMP WITH TIME ZONE,
    end_notified_at TIMESTAMP WITH TIME ZONE,
    recurrence_type VARCHAR(20) DEFAULT 'none',
    recurrence_interval INTEGER DEFAULT 1,
    recurrence_until TIMESTAMP WITH TIME ZONE,
    recurrence_parent_id INTEGER REFERENCES schedules(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Columns:**
- `id`: Primary key, auto-increment
- `user_id`: Owner của schedule
- `item_type`: Loại item (task, meeting, event, reminder)
- `title`: Tiêu đề (required)
- `description`: Mô tả chi tiết
- `start_time`: Thời gian bắt đầu
- `end_time`: Thời gian kết thúc (optional)
- `status`: Trạng thái (pending, completed, cancelled)
- `priority`: Mức ưu tiên (low, normal, high)
- `remind_at`: Thời điểm gửi reminder
- `is_reminded`: Đã gửi reminder chưa
- `acknowledged_at`: User đã acknowledge reminder
- `end_notified_at`: Đã gửi end notification
- `recurrence_*`: Thông tin lặp lại
- `recurrence_parent_id`: ID của schedule gốc trong series

**Indexes:**
```sql
CREATE INDEX idx_schedules_user_start ON schedules(user_id, start_time);
CREATE INDEX idx_schedules_remind ON schedules(remind_at, is_reminded);
CREATE INDEX idx_schedules_status ON schedules(status);
CREATE INDEX idx_schedules_priority ON schedules(priority);
CREATE INDEX idx_schedules_recurrence ON schedules(recurrence_parent_id);
```

### 4. Tags Table

Hệ thống tag/nhãn cho schedules.

```sql
CREATE TABLE tags (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(50) NOT NULL,
    color VARCHAR(20),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, name)
);
```

**Columns:**
- `id`: Primary key
- `user_id`: Owner của tag
- `name`: Tên tag (unique per user, case-insensitive)
- `color`: Màu sắc (hex code)

**Indexes:**
```sql
CREATE INDEX idx_tags_user ON tags(user_id);
CREATE UNIQUE INDEX idx_tags_user_name ON tags(user_id, LOWER(name));
```

### 5. Schedule_Tags Table (Junction)

Many-to-many relationship giữa schedules và tags.

```sql
CREATE TABLE schedule_tags (
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (schedule_id, tag_id)
);
```

### 6. Schedule_Shares Table (Junction)

Chia sẻ schedules giữa users (read-only access).

```sql
CREATE TABLE schedule_shares (
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    shared_with_user_id VARCHAR(50) REFERENCES users(user_id) ON DELETE CASCADE,
    shared_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (schedule_id, shared_with_user_id)
);
```

### 7. Schedule_Audit_Log Table

Audit trail cho tất cả thay đổi schedules.

```sql
CREATE TABLE schedule_audit_log (
    id SERIAL PRIMARY KEY,
    schedule_id INTEGER REFERENCES schedules(id) ON DELETE CASCADE,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id),
    action VARCHAR(50) NOT NULL,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Columns:**
- `schedule_id`: Schedule bị thay đổi
- `user_id`: User thực hiện thay đổi
- `action`: Loại thay đổi (CREATE, UPDATE, DELETE, COMPLETE)
- `old_data`: Dữ liệu trước khi thay đổi (JSON)
- `new_data`: Dữ liệu sau khi thay đổi (JSON)

### 8. Schedule_Templates Table

Templates để tạo schedules nhanh.

```sql
CREATE TABLE schedule_templates (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    template_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

## Enums và Constants

### Schedule Status
```typescript
type ScheduleStatus = "pending" | "completed" | "cancelled";
```

### Schedule Priority
```typescript
type SchedulePriority = "low" | "normal" | "high";
```

### Item Type
```typescript
type ScheduleItemType = "task" | "meeting" | "event" | "reminder";
```

### Recurrence Type
```typescript
type RecurrenceType = "none" | "daily" | "weekly" | "monthly";
```

## Migration Files

Tất cả migrations nằm trong thư mục `migrations/` và được đánh số tuần tự:

- `007-add-recurrence.sql`: Thêm recurrence fields
- `008-add-priority.sql`: Thêm priority system
- `009-add-tags.sql`: Thêm tag system
- `010-add-schedule-shares.sql`: Thêm schedule sharing
- `011-add-working-hours.sql`: Thêm working hours settings
- `012-add-schedule-templates.sql`: Thêm template system
- `013-add-schedule-audit-log.sql`: Thêm audit logging

## Query Patterns Thường Dùng

### 1. Lấy schedules của user theo ngày
```sql
SELECT * FROM schedules 
WHERE user_id = $1 
  AND start_time >= $2 
  AND start_time < $3 
ORDER BY start_time ASC;
```

### 2. Lấy schedules cần reminder
```sql
SELECT * FROM schedules 
WHERE remind_at <= NOW() 
  AND is_reminded = FALSE 
  AND status = 'pending';
```

### 3. Lấy schedules với tags
```sql
SELECT s.*, array_agg(t.name) as tag_names
FROM schedules s
LEFT JOIN schedule_tags st ON s.id = st.schedule_id
LEFT JOIN tags t ON st.tag_id = t.id
WHERE s.user_id = $1
GROUP BY s.id
ORDER BY s.start_time;
```

### 4. Thống kê theo priority
```sql
SELECT 
  priority,
  COUNT(*) as total,
  COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
FROM schedules 
WHERE user_id = $1 
GROUP BY priority;
```

## Performance Considerations

### Indexing Strategy
- Composite index trên (user_id, start_time) cho queries theo user và time range
- Index trên remind_at cho cron jobs
- Partial index trên status = 'pending' cho active schedules

### Partitioning (Future)
Có thể partition schedules table theo:
- Time range (monthly/yearly partitions)
- User ID (hash partitioning)

### Archiving Strategy
- Schedules cũ (> 1 năm) có thể archive sang bảng khác
- Audit logs có thể có retention policy

---

**Schema này được thiết kế để scalable và maintainable. Khi thêm tính năng mới, luôn tạo migration file mới thay vì modify existing tables.**