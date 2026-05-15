# 📡 API Reference

Tài liệu chi tiết về các API endpoints và services trong Hệ Thống Chatbot Quản Lý Sự Kiện & Nhắc Việc Trên Mezon.

## 🏗️ Kiến Trúc API

Bot được xây dựng trên NestJS với kiến trúc modular:
- **Controllers**: HTTP endpoints (nếu có)
- **Services**: Business logic
- **Repositories**: Data access layer
- **DTOs**: Data transfer objects
- **Entities**: Database models

## 🗄️ Database Entities

### 1. User Entity

```typescript
interface User {
  user_id: string;           // Primary key, Mezon user ID
  username: string | null;   // Mezon username
  display_name: string | null; // Display name
  created_at: Date;
  updated_at: Date;
}
```

### 2. UserSettings Entity

```typescript
interface UserSettings {
  user_id: string;                    // Foreign key to User
  timezone: string;                   // IANA timezone (default: Asia/Ho_Chi_Minh)
  default_remind_minutes: number;     // Default reminder time (default: 30)
  notify_via_dm: boolean;            // Send notifications via DM (default: false)
  working_hours_start: string;       // Working hours start (HH:MM format)
  working_hours_end: string;         // Working hours end (HH:MM format)
  working_days: number[];            // Working days (1=Monday, 7=Sunday)
  created_at: Date;
  updated_at: Date;
}
```

### 3. Schedule Entity

```typescript
interface Schedule {
  id: number;                        // Primary key
  user_id: string;                   // Foreign key to User
  item_type: ScheduleItemType;       // 'task' | 'meeting' | 'event' | 'reminder'
  title: string;                     // Schedule title
  description: string | null;        // Optional description
  start_time: Date;                  // Start time (UTC)
  end_time: Date | null;            // End time (UTC, optional)
  status: ScheduleStatus;           // 'pending' | 'completed' | 'cancelled'
  priority: SchedulePriority;       // 'low' | 'normal' | 'high'
  remind_at: Date | null;           // Reminder time (UTC)
  is_reminded: boolean;             // Legacy reminder flag
  acknowledged_at: Date | null;     // When user acknowledged reminder
  end_notified_at: Date | null;     // When end notification was sent
  recurrence_type: RecurrenceType;  // 'none' | 'daily' | 'weekly' | 'monthly'
  recurrence_interval: number;      // Recurrence interval (default: 1)
  recurrence_until: Date | null;    // Stop recurrence after this date
  recurrence_parent_id: number | null; // Parent schedule ID for recurring series
  created_at: Date;
  updated_at: Date;
}
```

### 4. Tag Entity

```typescript
interface Tag {
  id: number;                       // Primary key
  user_id: string;                  // Foreign key to User
  name: string;                     // Tag name (lowercase, unique per user)
  color: string | null;             // Hex color code
  created_at: Date;
}
```

### 5. Junction Tables

```typescript
// Many-to-many: Schedule ↔ Tag
interface ScheduleTag {
  schedule_id: number;              // Foreign key to Schedule
  tag_id: number;                   // Foreign key to Tag
}

// Many-to-many: Schedule sharing
interface ScheduleShare {
  schedule_id: number;              // Foreign key to Schedule
  shared_with_user_id: string;     // Foreign key to User
  shared_at: Date;
}
```

## 🔧 Core Services

### 1. UsersService

```typescript
class UsersService {
  // Create new user
  async create(userData: CreateUserDto): Promise<User>;
  
  // Find user by Mezon user ID
  async findByUserId(userId: string): Promise<User | null>;
  
  // Update user profile
  async update(userId: string, updates: UpdateUserDto): Promise<void>;
  
  // Get or create user settings
  async getSettings(userId: string): Promise<UserSettings>;
  
  // Update user settings
  async updateSettings(userId: string, settings: UpdateSettingsDto): Promise<void>;
  
  // Delete user and all related data
  async delete(userId: string): Promise<void>;
}
```

**DTOs:**
```typescript
interface CreateUserDto {
  user_id: string;
  username?: string;
  display_name?: string;
}

interface UpdateUserDto {
  username?: string;
  display_name?: string;
}

interface UpdateSettingsDto {
  timezone?: string;
  default_remind_minutes?: number;
  notify_via_dm?: boolean;
  working_hours_start?: string;
  working_hours_end?: string;
  working_days?: number[];
}
```

### 2. SchedulesService

```typescript
class SchedulesService {
  // Create new schedule
  async create(scheduleData: CreateScheduleDto): Promise<Schedule>;
  
  // Find schedule by ID and user
  async findByIdAndUser(id: number, userId: string): Promise<Schedule | null>;
  
  // Find schedules by date range
  async findByDateRange(
    userId: string, 
    start: Date, 
    end: Date,
    options?: FindOptions
  ): Promise<Schedule[]>;
  
  // Find upcoming schedules
  async findUpcoming(
    userId: string, 
    options?: UpcomingOptions
  ): Promise<Schedule[]>;
  
  // Find schedules needing reminder
  async findSchedulesNeedingReminder(now: Date): Promise<Schedule[]>;
  
  // Update schedule
  async update(id: number, userId: string, updates: UpdateScheduleDto): Promise<void>;
  
  // Complete schedule
  async complete(id: number, userId: string): Promise<void>;
  
  // Delete schedule
  async delete(id: number, userId: string): Promise<void>;
  
  // Set reminder
  async setReminder(id: number, userId: string, remindAt: Date): Promise<void>;
  
  // Acknowledge reminder
  async acknowledgeReminder(id: number, userId: string): Promise<void>;
  
  // Snooze reminder
  async snoozeReminder(id: number, userId: string, newRemindAt: Date): Promise<void>;
  
  // Set recurrence
  async setRecurrence(
    id: number, 
    userId: string, 
    recurrence: RecurrenceDto
  ): Promise<void>;
  
  // Search schedules
  async search(
    userId: string, 
    query: string, 
    options?: SearchOptions
  ): Promise<PaginatedResult<Schedule>>;
  
  // Get statistics
  async getStatistics(
    userId: string, 
    dateRange?: DateRange
  ): Promise<ScheduleStatistics>;
}
```

**DTOs:**
```typescript
interface CreateScheduleDto {
  user_id: string;
  item_type?: ScheduleItemType;
  title: string;
  description?: string;
  start_time: Date;
  end_time?: Date;
  priority?: SchedulePriority;
  remind_at?: Date;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_until?: Date;
}

interface UpdateScheduleDto {
  title?: string;
  description?: string;
  start_time?: Date;
  end_time?: Date;
  status?: ScheduleStatus;
  priority?: SchedulePriority;
}

interface FindOptions {
  status?: ScheduleStatus;
  priority?: SchedulePriority;
  tags?: string[];
  limit?: number;
  offset?: number;
}

interface UpcomingOptions {
  limit?: number;
  priorityFilter?: SchedulePriority;
  tagFilter?: string[];
}

interface RecurrenceDto {
  type: RecurrenceType;
  interval: number;
  until?: Date;
}

interface SearchOptions {
  page?: number;
  limit?: number;
  status?: ScheduleStatus;
  priority?: SchedulePriority;
}

interface DateRange {
  start: Date;
  end: Date;
}
```

### 3. TagsService

```typescript
class TagsService {
  // Create new tag
  async createTag(userId: string, name: string, color?: string): Promise<Tag>;
  
  // Find all user tags
  async findByUser(userId: string): Promise<Tag[]>;
  
  // Find tag by name
  async findByName(userId: string, name: string): Promise<Tag | null>;
  
  // Update tag
  async updateTag(userId: string, name: string, updates: UpdateTagDto): Promise<void>;
  
  // Delete tag
  async deleteTag(userId: string, name: string): Promise<void>;
  
  // Add tags to schedule
  async addTagsToSchedule(
    scheduleId: number, 
    userId: string, 
    tagNames: string[]
  ): Promise<void>;
  
  // Remove tag from schedule
  async removeTagFromSchedule(
    scheduleId: number, 
    userId: string, 
    tagName: string
  ): Promise<void>;
  
  // Find schedules by tag
  async findSchedulesByTag(
    userId: string, 
    tagName: string, 
    options?: FindByTagOptions
  ): Promise<Schedule[]>;
  
  // Get tag statistics
  async getTagStatistics(userId: string): Promise<TagStatistics>;
}
```

**DTOs:**
```typescript
interface UpdateTagDto {
  name?: string;
  color?: string;
}

interface FindByTagOptions {
  pendingOnly?: boolean;
  limit?: number;
  offset?: number;
}
```

### 4. ReminderService

```typescript
class ReminderService {
  // Process reminders (cron job)
  async checkReminders(): Promise<void>;
  
  // Send individual reminder
  async sendReminder(schedule: Schedule): Promise<void>;
  
  // Process end notifications
  async processEndNotifications(): Promise<void>;
  
  // Handle reminder interaction
  async handleReminderInteraction(
    action: string, 
    scheduleId: number, 
    userId: string, 
    params?: any
  ): Promise<void>;
  
  // Get reminder statistics
  async getReminderStatistics(): Promise<ReminderStatistics>;
}
```

## 📊 Response Types

### 1. Paginated Results

```typescript
interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
```

### 2. Statistics Types

```typescript
interface ScheduleStatistics {
  total: number;
  completed: number;
  pending: number;
  cancelled: number;
  completionRate: number;
  priorityDistribution: PriorityDistribution;
  typeDistribution: TypeDistribution;
  hotHours: HotHour[];
}

interface PriorityDistribution {
  high: { count: number; completed: number };
  normal: { count: number; completed: number };
  low: { count: number; completed: number };
}

interface TypeDistribution {
  task: number;
  meeting: number;
  event: number;
  reminder: number;
}

interface HotHour {
  hour: number;
  count: number;
}

interface TagStatistics {
  mostUsedTags: TagUsage[];
  tagPerformance: TagPerformance[];
}

interface TagUsage {
  name: string;
  color: string;
  count: number;
}

interface TagPerformance {
  name: string;
  total: number;
  completed: number;
  completionRate: number;
}

interface ReminderStatistics {
  totalReminders: number;
  sentToday: number;
  acknowledgedToday: number;
  averageResponseTime: number;
}
```

## 🔍 Query Builders

### 1. Schedule Queries

```typescript
// Find schedules with complex filters
const queryBuilder = this.repository
  .createQueryBuilder('schedule')
  .leftJoinAndSelect('schedule.tags', 'tag')
  .leftJoinAndSelect('schedule.user', 'user')
  .where('schedule.user_id = :userId', { userId });

// Add date range filter
if (dateRange) {
  queryBuilder.andWhere(
    'schedule.start_time BETWEEN :start AND :end',
    dateRange
  );
}

// Add status filter
if (status) {
  queryBuilder.andWhere('schedule.status = :status', { status });
}

// Add priority filter
if (priority) {
  queryBuilder.andWhere('schedule.priority = :priority', { priority });
}

// Add tag filter
if (tags?.length) {
  queryBuilder.andWhere('tag.name IN (:...tags)', { tags });
}

// Add text search
if (searchQuery) {
  queryBuilder.andWhere(
    '(schedule.title ILIKE :query OR schedule.description ILIKE :query)',
    { query: `%${searchQuery}%` }
  );
}

// Order and paginate
const schedules = await queryBuilder
  .orderBy('schedule.start_time', 'ASC')
  .skip((page - 1) * limit)
  .take(limit)
  .getMany();
```

### 2. Statistics Queries

```typescript
// Completion rate by priority
const completionByPriority = await this.repository
  .createQueryBuilder('schedule')
  .select('priority', 'priority')
  .addSelect('COUNT(*)', 'total')
  .addSelect('COUNT(CASE WHEN status = \'completed\' THEN 1 END)', 'completed')
  .where('user_id = :userId', { userId })
  .groupBy('priority')
  .getRawMany();

// Hot hours analysis
const hotHours = await this.repository
  .createQueryBuilder('schedule')
  .select('EXTRACT(HOUR FROM start_time)', 'hour')
  .addSelect('COUNT(*)', 'count')
  .where('user_id = :userId', { userId })
  .groupBy('EXTRACT(HOUR FROM start_time)')
  .orderBy('count', 'DESC')
  .limit(5)
  .getRawMany();

// Tag usage statistics
const tagUsage = await this.repository
  .createQueryBuilder('schedule')
  .leftJoin('schedule.tags', 'tag')
  .select('tag.name', 'tag_name')
  .addSelect('tag.color', 'tag_color')
  .addSelect('COUNT(schedule.id)', 'usage_count')
  .where('schedule.user_id = :userId', { userId })
  .groupBy('tag.id, tag.name, tag.color')
  .orderBy('usage_count', 'DESC')
  .limit(10)
  .getRawMany();
```

## 🔄 Event Handlers

### 1. Schedule Events

```typescript
// Events emitted by SchedulesService
interface ScheduleEvents {
  'schedule.created': { schedule: Schedule; user: User };
  'schedule.updated': { schedule: Schedule; changes: Partial<Schedule> };
  'schedule.completed': { schedule: Schedule; user: User };
  'schedule.deleted': { scheduleId: number; userId: string };
  'reminder.sent': { schedule: Schedule; sentAt: Date };
  'reminder.acknowledged': { schedule: Schedule; acknowledgedAt: Date };
}

// Event listeners
@OnEvent('schedule.completed')
async handleScheduleCompleted(payload: { schedule: Schedule; user: User }) {
  // Create next recurrence instance if needed
  if (payload.schedule.recurrence_type !== 'none') {
    await this.createNextRecurrenceInstance(payload.schedule);
  }
  
  // Log completion for analytics
  await this.auditService.logCompletion(payload.schedule, payload.user);
}
```

### 2. Reminder Events

```typescript
@OnEvent('reminder.sent')
async handleReminderSent(payload: { schedule: Schedule; sentAt: Date }) {
  // Update reminder statistics
  await this.updateReminderStats(payload.schedule.user_id);
  
  // Log for analytics
  await this.analyticsService.trackReminderSent(payload);
}
```

## 🛡️ Validation & Guards

### 1. Input Validation

```typescript
// DTO validation với class-validator
import { IsString, IsOptional, IsDateString, IsEnum } from 'class-validator';

export class CreateScheduleDto {
  @IsString()
  user_id!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  start_time!: string;

  @IsOptional()
  @IsDateString()
  end_time?: string;

  @IsOptional()
  @IsEnum(['low', 'normal', 'high'])
  priority?: SchedulePriority;
}
```

### 2. Authorization Guards

```typescript
@Injectable()
export class ScheduleOwnershipGuard implements CanActivate {
  constructor(private schedulesService: SchedulesService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { scheduleId } = request.params;
    const { userId } = request.user;

    const schedule = await this.schedulesService.findByIdAndUser(
      parseInt(scheduleId),
      userId
    );

    return !!schedule;
  }
}
```

## 🔌 External Integrations

### 1. Mezon SDK Integration

```typescript
// Bot service wrapper
@Injectable()
export class BotService {
  private client: MezonClient;

  async sendMessage(channelId: string, content: string): Promise<void>;
  async sendInteractive(
    channelId: string, 
    embed: any, 
    buttons?: any
  ): Promise<void>;
  async getDMChannel(userId: string): Promise<string>;
  async isUserInChannel(userId: string, channelId: string): Promise<boolean>;
}
```

### 2. Database Integration

```typescript
// TypeORM configuration
export const databaseConfig: TypeOrmModuleOptions = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [User, UserSettings, Schedule, Tag],
  synchronize: false, // Always false in production
  logging: process.env.NODE_ENV === 'development',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
};
```

## 📈 Performance Considerations

### 1. Caching Strategy

```typescript
// Cache frequently accessed data
@Injectable()
export class CacheService {
  private cache = new Map<string, { data: any; expiry: number }>();

  set(key: string, data: any, ttlMs: number): void;
  get<T>(key: string): T | null;
  delete(key: string): void;
  clear(): void;
}

// Usage in services
async getUserSettings(userId: string): Promise<UserSettings> {
  const cacheKey = `user_settings:${userId}`;
  let settings = this.cacheService.get<UserSettings>(cacheKey);
  
  if (!settings) {
    settings = await this.userSettingsRepository.findOne({ user_id: userId });
    this.cacheService.set(cacheKey, settings, 5 * 60 * 1000); // 5 minutes
  }
  
  return settings;
}
```

### 2. Database Optimization

```typescript
// Efficient queries với proper indexing
// Index definitions trong migrations:
CREATE INDEX CONCURRENTLY idx_schedules_user_start 
ON schedules(user_id, start_time);

CREATE INDEX CONCURRENTLY idx_schedules_remind 
ON schedules(remind_at, acknowledged_at) 
WHERE remind_at IS NOT NULL;

CREATE INDEX CONCURRENTLY idx_schedules_status_priority 
ON schedules(status, priority) 
WHERE status = 'pending';
```

---

**API Reference này cung cấp comprehensive overview về tất cả services và interfaces trong bot. Sử dụng làm reference khi develop hoặc integrate với hệ thống.**