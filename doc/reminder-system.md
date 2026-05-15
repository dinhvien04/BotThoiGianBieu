# 🔔 Reminder System

Hướng dẫn chi tiết về hệ thống nhắc nhở tự động trong Hệ Thống Chatbot Quản Lý Sự Kiện & Nhắc Việc Trên Mezon.

## 📋 Tổng Quan

Hệ thống reminder tự động gửi thông báo cho users về các lịch sắp tới thông qua:
- **Cron jobs**: Chạy mỗi phút để check schedules cần nhắc
- **Interactive buttons**: Cho phép snooze, acknowledge reminders
- **Smart scheduling**: Respect working hours, timezone
- **Multi-channel**: Gửi qua DM hoặc channel tùy user settings

## 🏗️ Kiến Trúc Hệ Thống

### Database Schema

```sql
-- Các cột liên quan đến reminder trong bảng schedules
remind_at TIMESTAMP WITH TIME ZONE,              -- Thời điểm gửi reminder
is_reminded BOOLEAN DEFAULT FALSE,               -- Đã gửi reminder chưa (legacy)
acknowledged_at TIMESTAMP WITH TIME ZONE,       -- User đã acknowledge
end_notified_at TIMESTAMP WITH TIME ZONE        -- Đã gửi end notification
```

### Entity Definition

```typescript
@Entity("schedules")
export class Schedule {
  @Column({ type: "timestamp with time zone", nullable: true })
  remind_at!: Date | null;

  @Column({ type: "boolean", default: false })
  is_reminded!: boolean;

  @Column({ type: "timestamp with time zone", nullable: true })
  acknowledged_at!: Date | null;

  @Column({ type: "timestamp with time zone", nullable: true })
  end_notified_at!: Date | null;
}
```

## 🔧 Core Components

### 1. Reminder Service (Cron Jobs)

```typescript
// src/reminder/reminder.service.ts
@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  @Cron(CronExpression.EVERY_MINUTE)
  async checkReminders(): Promise<void> {
    try {
      await this.processStartReminders();
      await this.processEndNotifications();
    } catch (error) {
      this.logger.error('Reminder cron failed', error.stack);
    }
  }

  private async processStartReminders(): Promise<void> {
    const now = new Date();
    
    // Tìm schedules cần nhắc
    const schedules = await this.schedulesService.findSchedulesNeedingReminder(now);
    
    this.logger.debug(`Found ${schedules.length} schedules needing reminder`);

    for (const schedule of schedules) {
      try {
        await this.sendReminder(schedule);
        await this.updateReminderStatus(schedule);
      } catch (error) {
        this.logger.error(`Failed to send reminder for schedule ${schedule.id}`, error);
      }
    }
  }

  private async processEndNotifications(): Promise<void> {
    const now = new Date();
    
    // Tìm schedules đã kết thúc nhưng chưa gửi end notification
    const schedules = await this.schedulesService.findSchedulesNeedingEndNotification(now);
    
    for (const schedule of schedules) {
      try {
        await this.sendEndNotification(schedule);
        await this.markEndNotificationSent(schedule);
      } catch (error) {
        this.logger.error(`Failed to send end notification for schedule ${schedule.id}`, error);
      }
    }
  }
}
```

### 2. Reminder Query Logic

```typescript
// src/schedules/schedules.service.ts
async findSchedulesNeedingReminder(now: Date): Promise<Schedule[]> {
  return this.repository.find({
    where: {
      remind_at: LessThanOrEqual(now),
      acknowledged_at: IsNull(), // Chưa được acknowledge
      status: 'pending',
      start_time: MoreThan(now), // Chưa bắt đầu
    },
    relations: ['user', 'user.settings'],
    order: { remind_at: 'ASC' },
    take: 50, // Limit để tránh overload
  });
}

async findSchedulesNeedingEndNotification(now: Date): Promise<Schedule[]> {
  return this.repository.find({
    where: {
      end_time: LessThanOrEqual(now),
      end_notified_at: IsNull(),
      status: 'pending', // Chưa hoàn thành
    },
    relations: ['user', 'user.settings'],
    take: 50,
  });
}
```

### 3. Message Formatting & Sending

```typescript
private async sendReminder(schedule: Schedule): Promise<void> {
  const user = schedule.user!;
  const settings = user.settings!;
  
  // Format reminder message
  const message = this.formatReminderMessage(schedule);
  
  // Create interactive buttons
  const buttons = this.createReminderButtons(schedule.id);
  
  // Determine where to send
  const channelId = settings.notify_via_dm 
    ? await this.getDMChannelId(user.user_id)
    : this.getDefaultChannelId();
  
  // Send message
  await this.botService.sendInteractive(channelId, message, buttons);
  
  this.logger.log(`Sent reminder for schedule ${schedule.id} to user ${user.user_id}`);
}

private formatReminderMessage(schedule: Schedule): string {
  const timeUntil = this.calculateTimeUntil(schedule.start_time);
  const priorityIcon = this.getPriorityIcon(schedule.priority);
  
  return [
    `🔔 **NHẮC NHỞ LỊCH TRÌNH**`,
    ``,
    `${priorityIcon} **${schedule.title}**`,
    `⏰ Bắt đầu: ${this.dateParser.formatVietnam(schedule.start_time)}`,
    `⏳ Còn lại: ${timeUntil}`,
    schedule.description ? `📝 ${schedule.description}` : '',
    ``,
    `🆔 ID: \`${schedule.id}\``,
  ].filter(Boolean).join('\n');
}

private createReminderButtons(scheduleId: number): ButtonBuilder {
  return new ButtonBuilder()
    .addButton(
      `reminder:ack:${scheduleId}`,
      '✅ Đã nhận',
      EButtonMessageStyle.SUCCESS
    )
    .addButton(
      `reminder:snooze:${scheduleId}:default`,
      '⏰ Snooze',
      EButtonMessageStyle.SECONDARY
    )
    .addButton(
      `reminder:snooze:${scheduleId}:10`,
      '⏰ 10p',
      EButtonMessageStyle.SECONDARY
    )
    .addButton(
      `reminder:snooze:${scheduleId}:60`,
      '⏰ 1h',
      EButtonMessageStyle.SECONDARY
    )
    .addButton(
      `reminder:snooze:${scheduleId}:240`,
      '⏰ 4h',
      EButtonMessageStyle.SECONDARY
    )
    .build();
}
```

## 🎯 Interactive Reminder Buttons

### 1. Button Handler

```typescript
// src/reminder/reminder-interaction.handler.ts
@Injectable()
export class ReminderInteractionHandler implements InteractionHandler {
  readonly interactionId = 'reminder';

  async handleButton(ctx: ButtonInteractionContext): Promise<void> {
    const [action, scheduleIdStr, ...params] = ctx.action.split(':');
    const scheduleId = parseInt(scheduleIdStr);

    switch (action) {
      case 'ack':
        await this.handleAcknowledge(ctx, scheduleId);
        break;
      case 'snooze':
        await this.handleSnooze(ctx, scheduleId, params[0]);
        break;
      default:
        await ctx.send('❌ Hành động không hợp lệ');
    }
  }

  private async handleAcknowledge(
    ctx: ButtonInteractionContext,
    scheduleId: number
  ): Promise<void> {
    await this.schedulesService.acknowledgeReminder(scheduleId, ctx.clickerId);
    
    await ctx.updateMessage('✅ Đã nhận thông báo. Reminder đã được tắt.');
    
    this.logger.log(`User ${ctx.clickerId} acknowledged reminder for schedule ${scheduleId}`);
  }

  private async handleSnooze(
    ctx: ButtonInteractionContext,
    scheduleId: number,
    snoozeType: string
  ): Promise<void> {
    const snoozeMinutes = this.getSnoozeMinutes(snoozeType, ctx.clickerId);
    const newRemindAt = new Date(Date.now() + snoozeMinutes * 60 * 1000);
    
    await this.schedulesService.snoozeReminder(scheduleId, ctx.clickerId, newRemindAt);
    
    const timeText = this.formatSnoozeTime(snoozeMinutes);
    await ctx.updateMessage(`⏰ Đã snooze reminder. Sẽ nhắc lại sau ${timeText}.`);
    
    this.logger.log(`User ${ctx.clickerId} snoozed reminder for schedule ${scheduleId} by ${snoozeMinutes} minutes`);
  }

  private getSnoozeMinutes(snoozeType: string, userId: string): number {
    switch (snoozeType) {
      case '10': return 10;
      case '60': return 60;
      case '240': return 240;
      case 'default':
        // Lấy từ user settings hoặc default 30 phút
        return this.getUserDefaultSnooze(userId);
      default:
        return 30;
    }
  }
}
```

### 2. Snooze Logic

```typescript
// src/schedules/schedules.service.ts
async snoozeReminder(
  scheduleId: number,
  userId: string,
  newRemindAt: Date
): Promise<void> {
  const schedule = await this.findByIdAndUser(scheduleId, userId);
  
  if (!schedule) {
    throw new Error('Schedule not found');
  }

  // Kiểm tra snooze time không vượt quá start time
  if (newRemindAt >= schedule.start_time) {
    throw new Error('Không thể snooze quá thời gian bắt đầu');
  }

  await this.repository.update(scheduleId, {
    remind_at: newRemindAt,
    acknowledged_at: null, // Reset acknowledge status
  });
}

async acknowledgeReminder(scheduleId: number, userId: string): Promise<void> {
  const schedule = await this.findByIdAndUser(scheduleId, userId);
  
  if (!schedule) {
    throw new Error('Schedule not found');
  }

  await this.repository.update(scheduleId, {
    acknowledged_at: new Date(),
    remind_at: null, // Tắt reminder
  });
}
```

## ⏰ Smart Reminder Scheduling

### 1. Working Hours Integration

```typescript
// src/shared/utils/working-hours.ts
export class WorkingHoursService {
  adjustReminderForWorkingHours(
    remindAt: Date,
    workingHours: WorkingHours
  ): Date {
    if (!workingHours.enabled) {
      return remindAt;
    }

    const adjusted = new Date(remindAt);
    const dayOfWeek = adjusted.getDay(); // 0 = Sunday, 1 = Monday, ...
    
    // Kiểm tra có phải ngày làm việc không
    if (!workingHours.working_days.includes(dayOfWeek)) {
      // Đẩy về ngày làm việc tiếp theo
      return this.moveToNextWorkingDay(adjusted, workingHours);
    }

    // Kiểm tra có trong giờ làm việc không
    const hour = adjusted.getHours();
    const minute = adjusted.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    const startMinutes = this.timeToMinutes(workingHours.start_time);
    const endMinutes = this.timeToMinutes(workingHours.end_time);
    
    if (timeInMinutes < startMinutes) {
      // Trước giờ làm việc - đẩy về giờ bắt đầu làm việc
      adjusted.setHours(
        Math.floor(startMinutes / 60),
        startMinutes % 60,
        0,
        0
      );
    } else if (timeInMinutes >= endMinutes) {
      // Sau giờ làm việc - đẩy về sáng hôm sau
      return this.moveToNextWorkingDay(adjusted, workingHours);
    }

    return adjusted;
  }

  private moveToNextWorkingDay(
    date: Date,
    workingHours: WorkingHours
  ): Date {
    const next = new Date(date);
    
    do {
      next.setDate(next.getDate() + 1);
    } while (!workingHours.working_days.includes(next.getDay()));
    
    // Set về giờ bắt đầu làm việc
    const startMinutes = this.timeToMinutes(workingHours.start_time);
    next.setHours(
      Math.floor(startMinutes / 60),
      startMinutes % 60,
      0,
      0
    );
    
    return next;
  }
}
```

### 2. Timezone Handling

```typescript
// src/shared/utils/timezone.ts
export class TimezoneService {
  convertToUserTimezone(utcDate: Date, timezone: string): Date {
    // Sử dụng Intl.DateTimeFormat hoặc date-fns-tz
    return zonedTimeToUtc(utcDate, timezone);
  }

  formatInUserTimezone(
    utcDate: Date,
    timezone: string,
    format: string = 'dd/MM/yyyy HH:mm'
  ): string {
    const zonedDate = utcToZonedTime(utcDate, timezone);
    return formatDate(zonedDate, format, { locale: vi });
  }
}
```

## 📝 Reminder Commands

### 1. Set Reminder (`*nhac`)

```typescript
// src/bot/commands/nhac.command.ts
async execute(ctx: CommandContext): Promise<void> {
  const [idStr, minutesStr] = ctx.args;
  
  const scheduleId = parseInt(idStr);
  const minutes = parseInt(minutesStr);
  
  if (!scheduleId || !minutes || minutes < 1 || minutes > 1440) {
    await ctx.reply('❌ Cú pháp: `*nhac <ID> <số_phút>` (1-1440 phút)');
    return;
  }

  const schedule = await this.schedulesService.findByIdAndUser(
    scheduleId,
    ctx.message.sender_id
  );

  if (!schedule) {
    await ctx.reply('❌ Không tìm thấy lịch hoặc bạn không có quyền truy cập');
    return;
  }

  // Tính thời điểm nhắc
  const remindAt = new Date(schedule.start_time.getTime() - minutes * 60 * 1000);
  
  if (remindAt.getTime() <= Date.now()) {
    await ctx.reply('❌ Thời gian nhắc đã qua. Chọn thời gian nhắc ngắn hơn.');
    return;
  }

  // Apply working hours adjustment nếu có
  const user = await this.usersService.findByUserId(ctx.message.sender_id);
  const adjustedRemindAt = user?.settings?.working_hours_enabled
    ? this.workingHoursService.adjustReminderForWorkingHours(
        remindAt,
        user.settings
      )
    : remindAt;

  await this.schedulesService.setReminder(scheduleId, adjustedRemindAt);

  await ctx.reply([
    `🔔 Đã đặt nhắc nhở cho lịch #${scheduleId}`,
    `⏰ Sẽ nhắc lúc: ${this.dateParser.formatVietnam(adjustedRemindAt)}`,
    `📌 Trước ${minutes} phút`,
  ].join('\n'));
}
```

### 2. Relative Reminder (`*nhac-sau`)

```typescript
// src/bot/commands/nhac-sau.command.ts
async execute(ctx: CommandContext): Promise<void> {
  const [idStr, ...durationParts] = ctx.args;
  const scheduleId = parseInt(idStr);
  const durationStr = durationParts.join(' ');

  if (!scheduleId || !durationStr) {
    await ctx.reply('❌ Cú pháp: `*nhac-sau <ID> <thời_gian>`\nVD: `30p`, `2h`, `1d`, `2h30p`');
    return;
  }

  // Parse duration
  const durationMs = this.durationParser.parse(durationStr);
  if (!durationMs) {
    await ctx.reply('❌ Định dạng thời gian không hợp lệ. VD: `30p`, `2h`, `1d`, `2h30p`');
    return;
  }

  const remindAt = new Date(Date.now() + durationMs);

  const schedule = await this.schedulesService.findByIdAndUser(
    scheduleId,
    ctx.message.sender_id
  );

  if (!schedule) {
    await ctx.reply('❌ Không tìm thấy lịch');
    return;
  }

  if (remindAt >= schedule.start_time) {
    await ctx.reply('❌ Thời gian nhắc không được sau thời gian bắt đầu lịch');
    return;
  }

  await this.schedulesService.setReminder(scheduleId, remindAt);

  await ctx.reply([
    `🔔 Đã đặt nhắc nhở cho lịch #${scheduleId}`,
    `⏰ Sẽ nhắc lúc: ${this.dateParser.formatVietnam(remindAt)}`,
    `⏳ Sau ${this.durationParser.format(durationMs)}`,
  ].join('\n'));
}
```

### 3. Disable Reminder (`*tat-nhac`)

```typescript
// src/bot/commands/tat-nhac.command.ts
async execute(ctx: CommandContext): Promise<void> {
  const [idStr] = ctx.args;
  const scheduleId = parseInt(idStr);

  if (!scheduleId) {
    await ctx.reply('❌ Cú pháp: `*tat-nhac <ID>`');
    return;
  }

  await this.schedulesService.disableReminder(
    scheduleId,
    ctx.message.sender_id
  );

  await ctx.reply(`🔕 Đã tắt nhắc nhở cho lịch #${scheduleId}`);
}
```

## 📊 Reminder Analytics

### 1. Reminder Statistics

```typescript
// src/schedules/schedules.service.ts
async getReminderStats(userId: string): Promise<ReminderStats> {
  const result = await this.repository
    .createQueryBuilder('schedule')
    .select([
      'COUNT(*) as total_schedules',
      'COUNT(CASE WHEN remind_at IS NOT NULL THEN 1 END) as with_reminders',
      'COUNT(CASE WHEN acknowledged_at IS NOT NULL THEN 1 END) as acknowledged',
      'AVG(EXTRACT(EPOCH FROM (start_time - remind_at))/60) as avg_remind_minutes'
    ])
    .where('user_id = :userId', { userId })
    .andWhere('status = :status', { status: 'pending' })
    .getRawOne();

  return {
    totalSchedules: parseInt(result.total_schedules),
    withReminders: parseInt(result.with_reminders),
    acknowledged: parseInt(result.acknowledged),
    averageRemindMinutes: Math.round(result.avg_remind_minutes || 30),
    reminderRate: result.total_schedules > 0 
      ? (result.with_reminders / result.total_schedules * 100)
      : 0,
    acknowledgeRate: result.with_reminders > 0
      ? (result.acknowledged / result.with_reminders * 100)
      : 0,
  };
}
```

### 2. Reminder Performance Metrics

```typescript
async getReminderPerformanceMetrics(): Promise<PerformanceMetrics> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  const [sent, failed, acknowledged] = await Promise.all([
    this.countRemindersSent(oneHourAgo, now),
    this.countRemindersFailed(oneHourAgo, now),
    this.countRemindersAcknowledged(oneHourAgo, now),
  ]);

  return {
    remindersSentLastHour: sent,
    remindersFailedLastHour: failed,
    remindersAcknowledgedLastHour: acknowledged,
    successRate: sent > 0 ? ((sent - failed) / sent * 100) : 100,
    acknowledgeRate: sent > 0 ? (acknowledged / sent * 100) : 0,
  };
}
```

## 🔧 Advanced Features

### 1. Reminder Templates

```typescript
interface ReminderTemplate {
  name: string;
  minutesBefore: number;
  message?: string;
  workingHoursOnly: boolean;
}

const REMINDER_TEMPLATES: ReminderTemplate[] = [
  {
    name: 'meeting-default',
    minutesBefore: 15,
    message: 'Cuộc họp sắp bắt đầu',
    workingHoursOnly: true,
  },
  {
    name: 'deadline-urgent',
    minutesBefore: 60,
    message: 'Deadline quan trọng sắp tới',
    workingHoursOnly: false,
  },
  {
    name: 'daily-standup',
    minutesBefore: 5,
    message: 'Daily standup sắp bắt đầu',
    workingHoursOnly: true,
  },
];
```

### 2. Escalation Rules

```typescript
interface EscalationRule {
  scheduleType: string;
  priority: SchedulePriority;
  escalationMinutes: number[];
  maxEscalations: number;
}

const ESCALATION_RULES: EscalationRule[] = [
  {
    scheduleType: 'meeting',
    priority: 'high',
    escalationMinutes: [15, 5, 0], // 15p, 5p, và lúc bắt đầu
    maxEscalations: 3,
  },
  {
    scheduleType: 'task',
    priority: 'normal',
    escalationMinutes: [30],
    maxEscalations: 1,
  },
];
```

### 3. Batch Reminder Processing

```typescript
async processBatchReminders(batchSize: number = 50): Promise<void> {
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const schedules = await this.findSchedulesNeedingReminder(
      new Date(),
      batchSize,
      offset
    );

    if (schedules.length === 0) {
      hasMore = false;
      continue;
    }

    // Process batch in parallel với limit
    await Promise.allSettled(
      schedules.map(schedule => this.sendReminder(schedule))
    );

    offset += batchSize;
    hasMore = schedules.length === batchSize;

    // Throttle để tránh rate limiting
    await this.sleep(1000);
  }
}
```

## 🐛 Error Handling & Recovery

### 1. Retry Logic

```typescript
async sendReminderWithRetry(
  schedule: Schedule,
  maxRetries: number = 3
): Promise<void> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      await this.sendReminder(schedule);
      return; // Success
    } catch (error) {
      lastError = error as Error;
      this.logger.warn(
        `Reminder attempt ${attempt}/${maxRetries} failed for schedule ${schedule.id}`,
        error
      );

      if (attempt < maxRetries) {
        // Exponential backoff
        await this.sleep(Math.pow(2, attempt) * 1000);
      }
    }
  }

  // All retries failed
  this.logger.error(
    `Failed to send reminder for schedule ${schedule.id} after ${maxRetries} attempts`,
    lastError
  );

  // Log to failed reminders table for manual review
  await this.logFailedReminder(schedule, lastError);
}
```

### 2. Dead Letter Queue

```typescript
interface FailedReminder {
  scheduleId: number;
  userId: string;
  attemptedAt: Date;
  error: string;
  retryCount: number;
}

async logFailedReminder(
  schedule: Schedule,
  error: Error
): Promise<void> {
  // Log to database hoặc external service
  await this.failedRemindersRepository.save({
    scheduleId: schedule.id,
    userId: schedule.user_id,
    attemptedAt: new Date(),
    error: error.message,
    retryCount: 0,
  });
}

@Cron('0 */6 * * *') // Mỗi 6 giờ
async retryFailedReminders(): Promise<void> {
  const failedReminders = await this.failedRemindersRepository.find({
    where: { retryCount: LessThan(3) },
    order: { attemptedAt: 'ASC' },
    take: 10,
  });

  for (const failed of failedReminders) {
    try {
      const schedule = await this.schedulesService.findById(failed.scheduleId);
      if (schedule && schedule.status === 'pending') {
        await this.sendReminder(schedule);
        await this.failedRemindersRepository.delete(failed.id);
      }
    } catch (error) {
      await this.failedRemindersRepository.update(failed.id, {
        retryCount: failed.retryCount + 1,
        error: error.message,
      });
    }
  }
}
```

---

**Hệ thống reminder này đảm bảo users không bao giờ miss các lịch quan trọng với reliability cao và user experience tốt.**