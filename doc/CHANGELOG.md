# 📝 Changelog

Tất cả các thay đổi quan trọng của Hệ Thống Chatbot Quản Lý Sự Kiện & Nhắc Việc Trên Mezon sẽ được ghi lại trong file này.

Định dạng dựa trên [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
và project tuân theo [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Planned
- [ ] Tag hierarchies (project/frontend, project/backend)
- [ ] Calendar view cho `*lich-thang`
- [ ] Export/Import ICS files
- [ ] Bulk operations (delete multiple schedules)
- [ ] Schedule templates system
- [ ] Advanced statistics dashboard
- [ ] Mobile-optimized interactive forms
- [ ] Voice reminders integration
- [ ] AI-powered schedule suggestions

## [0.1.0] - 2026-04-27

### Added
- 🎉 **Initial Release** - Hệ Thống Chatbot Quản Lý Sự Kiện & Nhắc Việc Trên Mezon v0.1.0
- 👤 **User Management**
  - User registration với `*bat-dau`
  - User settings management với `*cai-dat`
  - Timezone support (default: Asia/Ho_Chi_Minh)
  - Working hours configuration
  
- 📅 **Schedule Management**
  - Create schedules với interactive forms (`*them-lich`)
  - View schedules: daily, weekly, upcoming (`*lich-hom-nay`, `*lich-tuan`, `*sap-toi`)
  - Schedule details view (`*chi-tiet`)
  - Edit schedules (`*sua-lich`)
  - Complete schedules (`*hoan-thanh`)
  - Delete schedules với confirmation (`*xoa-lich`)
  - Search schedules (`*tim-kiem`)
  
- 🔄 **Recurring Events**
  - Daily, weekly, monthly recurrence (`*lich-lap`)
  - Configurable intervals (every N days/weeks/months)
  - End date support (`--den` flag)
  - Automatic next instance creation
  - Disable recurrence (`*bo-lap`)
  
- ⚡ **Priority System**
  - Three priority levels: Low (🟢), Normal (🟡), High (🔴)
  - Priority filtering trong các commands (`--uutien` flag)
  - Priority-based sorting và statistics
  
- 🏷️ **Tags System**
  - Create/delete tags (`*tag-them`, `*tag-xoa`)
  - Tag schedules (`*tag`, `*untag`)
  - View schedules by tag (`*lich-tag`)
  - Tag statistics và analytics
  - Auto-create tags khi gắn vào schedule
  
- 🔔 **Reminder System**
  - Automatic reminders với cron jobs (every minute)
  - Set reminder time (`*nhac <ID> <minutes>`)
  - Relative reminders (`*nhac-sau <ID> <duration>`)
  - Interactive reminder buttons:
    - ✅ Acknowledge (tắt reminder)
    - ⏰ Snooze với multiple presets (10p, 1h, 4h)
  - Working hours integration
  - End notifications cho schedules có end_time
  
- 📊 **Statistics & Analytics**
  - Comprehensive statistics (`*thong-ke`)
  - Completion rates by priority
  - Hot hours analysis
  - Type distribution (task, meeting, event, reminder)
  - Tag usage statistics
  - Time-based filtering (week, month, year, all)
  
- 📋 **Excel Integration**
  - Import schedules từ Excel (`*them-lich-excel`)
  - Download Excel template (`*mau-lich-excel`)
  - Support priority và recurrence trong Excel
  
- 🎮 **Interactive Features**
  - Rich interactive forms với InteractiveBuilder
  - Multiple input types: text, textarea, number, date, time
  - Select fields với custom options
  - Button interactions với multiple styles
  - Form validation và error handling
  - Multi-step workflows support
  
- 🛠️ **Developer Features**
  - Modular NestJS architecture
  - TypeORM với PostgreSQL
  - Comprehensive test suite (550+ tests)
  - ESLint + Prettier code formatting
  - Docker support với multi-stage builds
  - PM2 ecosystem configuration
  - Health check endpoints
  - Structured logging với Winston
  
- 🔧 **System Features**
  - Idempotent database migrations
  - Connection pooling và optimization
  - Error handling và recovery
  - Performance monitoring
  - Memory leak detection
  - Graceful shutdown handling

### Technical Details

#### Database Schema
- **Users table**: User profiles từ Mezon
- **User_settings table**: Personal preferences
- **Schedules table**: Main schedule data với full feature support
- **Tags table**: User-specific tags với colors
- **Junction tables**: Schedule-tags và schedule-shares relationships
- **Audit tables**: Change tracking và undo support

#### Architecture
- **NestJS 10.x**: Modern Node.js framework
- **TypeScript 5.x**: Type-safe development
- **PostgreSQL 15+**: Robust database với JSON support
- **Mezon SDK 2.8.44+**: Official Mezon integration
- **Docker**: Containerized deployment
- **PM2**: Process management

#### Performance
- **Database indexes**: Optimized queries cho common operations
- **Connection pooling**: Efficient database connections
- **Caching**: User settings và frequently accessed data
- **Batch processing**: Efficient reminder processing
- **Memory management**: Leak detection và monitoring

#### Security
- **Input validation**: Comprehensive validation với class-validator
- **SQL injection protection**: Parameterized queries
- **Authorization**: User-based access control
- **Rate limiting**: Protection against abuse
- **Error handling**: Secure error messages

### Migration Notes
- Đây là initial release, không có migration từ version trước
- Database schema được tạo từ migrations trong thư mục `migrations/`
- Tất cả migrations đều idempotent và có thể chạy lại an toàn

### Breaking Changes
- N/A (initial release)

### Deprecations
- N/A (initial release)

### Known Issues
- Interactive forms có thể không hoạt động trên một số Mezon clients cũ
- Timezone conversion có thể có độ trễ nhỏ trong DST transitions
- Large Excel files (>1000 rows) có thể timeout khi import
- Reminder buttons có thể duplicate nếu user click nhanh liên tiếp

### Performance Notes
- Bot handle được ~100 concurrent users
- Database queries optimized cho <100ms response time
- Memory usage stable ở ~200MB cho typical workload
- Cron jobs process ~1000 reminders/minute efficiently

---

## Version History

### Pre-release Development
- **2026-04-01**: Project initialization
- **2026-04-05**: Core schedule CRUD completed
- **2026-04-10**: Reminder system implementation
- **2026-04-15**: Interactive forms integration
- **2026-04-20**: Priority và tags system
- **2026-04-25**: Recurring events implementation
- **2026-04-27**: v0.1.0 release

---

## Contributing

Khi contribute vào project:

1. **Feature additions**: Bump minor version (0.1.0 → 0.2.0)
2. **Bug fixes**: Bump patch version (0.1.0 → 0.1.1)
3. **Breaking changes**: Bump major version (0.1.0 → 1.0.0)

### Changelog Guidelines

- **Added**: Tính năng mới
- **Changed**: Thay đổi existing functionality
- **Deprecated**: Features sẽ bị remove trong future versions
- **Removed**: Features đã bị remove
- **Fixed**: Bug fixes
- **Security**: Security improvements

### Commit Message Format

```
type(scope): description

feat(commands): add lich-thang command
fix(reminder): fix timezone calculation bug
docs(api): update command reference
test(schedules): add recurrence tests
```

---

**Changelog này được maintain để track tất cả changes và giúp users understand evolution của bot qua các versions.**