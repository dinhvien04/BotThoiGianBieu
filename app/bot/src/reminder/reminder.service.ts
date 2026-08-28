import { Injectable, Logger, Optional } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource, QueryRunner } from 'typeorm';
import {
  ApiMessageMention,
  ButtonBuilder,
  EButtonMessageStyle,
  InteractiveBuilder,
} from 'mezon-sdk';
import { BotService } from '../bot/bot.service';
import { SchedulesService } from '../schedules/schedules.service';
import { Schedule } from '../schedules/entities/schedule.entity';
import { DateParser } from '../shared/utils/date-parser';
import { isWithinWorkingHours, nextWorkingStart } from '../shared/utils/working-hours';
import { User } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';

/**
 * Advisory lock IDs for multi-instance cron execution synchronization in PostgreSQL.
 */
const REMINDER_TICK_ADVISORY_LOCK_ID = 81001;
const DAILY_DIGEST_ADVISORY_LOCK_ID = 81002;

/**
 * Interval mặc định (phút) để auto-resend khi user bấm hoãn lấy theo
 * `default_remind_minutes` của user. Ignore-repeat (user không bấm gì) cũng
 * dùng cùng interval đó để UX nhất quán.
 */
const DEFAULT_SNOOZE_MINUTES = 30;
const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';
const VIETNAM_UTC_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
const DAILY_DIGEST_TODAY_LIMIT = 8;
const DAILY_DIGEST_OVERDUE_LIMIT = 5;
const DEFAULT_INFRA_BACKOFF_MS = 5 * 60 * 1000;

type NotificationSettings = {
  notify_via_dm?: boolean;
  notify_via_channel?: boolean;
  default_channel_id?: string | null;
};

export type DispatchResult = 'delivered' | 'transient-failure' | 'no-route';

/**
 * Các preset snooze nhanh hiển thị dạng button row ngoài cùng với nút "Hoãn
 * mặc định (theo user settings)". Người dùng có thể chọn hoãn 10p / 1h / 4h
 * mà không cần gõ lệnh.
 */
const SNOOZE_PRESETS_MINUTES: readonly number[] = [10, 60, 240];

export const REMINDER_INTERACTION_ID = 'reminder';

@Injectable()
export class ReminderService {
  private readonly logger = new Logger(ReminderService.name);

  /** Tránh reentrancy khi tick dài hơn 1 phút. */
  private running = false;
  private dailyDigestRunning = false;
  private nextQueryRetryAt = 0;
  private readonly infraBackoffMs: number;

  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly botService: BotService,
    private readonly dateParser: DateParser,
    private readonly usersService: UsersService,
    private readonly config: ConfigService,
    @Optional() private readonly dataSource?: DataSource,
  ) {
    const configured = Number(this.config.get<string>('REMINDER_INFRA_BACKOFF_MS'));
    this.infraBackoffMs =
      Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_INFRA_BACKOFF_MS;
  }

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) {
      this.logger.debug('Tick cũ chưa xong, bỏ qua tick hiện tại.');
      return;
    }
    if (this.shouldSkipQueryWindow('Reminder tick')) {
      return;
    }
    this.running = true;

    let queryRunner: QueryRunner | null = null;
    let hasLock = false;
    try {
      if (this.dataSource?.isInitialized) {
        try {
          queryRunner = this.dataSource.createQueryRunner();
          await queryRunner.connect();
          const lockResult = await queryRunner.query(
            'SELECT pg_try_advisory_lock($1) as locked',
            [REMINDER_TICK_ADVISORY_LOCK_ID],
          );
          if (!lockResult || !lockResult[0] || lockResult[0].locked !== true) {
            this.logger.debug('Another instance is currently running reminder tick; skipping.');
            return;
          }
          hasLock = true;
        } catch (lockErr) {
          this.logError(
            'Failed to acquire advisory lock for tick; failing closed to prevent duplicate runs: ' +
              (lockErr as Error).message,
            lockErr,
          );
          this.deferAfterTransientInfrastructureError(lockErr);
          return;
        }
      }

      try {
        const now = new Date();

        // 1) Reminders bắt đầu (lặp đến khi user ack)
        const dueStart = await this.schedulesService.findDueReminders(now);
        if (dueStart.length > 0) {
          this.logger.log(`🔔 ${dueStart.length} start-reminder(s) cần gửi`);
          for (const schedule of dueStart) {
            try {
              await this.sendStartReminder(schedule, now);
            } catch (err) {
              this.logError(`Lỗi gửi start reminder #${schedule.id}`, err);
            }
          }
        }

        // 2) Notification kết thúc (chỉ gửi 1 lần)
        const dueEnd = await this.schedulesService.findDueEndNotifications(now);
        if (dueEnd.length > 0) {
          this.logger.log(`🏁 ${dueEnd.length} end-notification(s) cần gửi`);
          for (const schedule of dueEnd) {
            try {
              await this.sendEndNotification(schedule, now);
            } catch (err) {
              this.logError(`Lỗi gửi end notification #${schedule.id}`, err);
            }
          }
        }
      } catch (err) {
        this.logError('Reminder tick lỗi ở tầng truy vấn / hạ tầng', err);
        this.deferAfterTransientInfrastructureError(err);
      }
    } finally {
      if (queryRunner) {
        try {
          if (hasLock) {
            await queryRunner.query('SELECT pg_advisory_unlock($1)', [
              REMINDER_TICK_ADVISORY_LOCK_ID,
            ]);
          }
        } catch (unlockErr) {
          this.logger.warn(
            'Failed to release advisory lock for tick: ' + (unlockErr as Error).message,
          );
        } finally {
          try {
            await queryRunner.release();
          } catch (releaseErr) {
            this.logger.warn(
              'Failed to release queryRunner for tick: ' + (releaseErr as Error).message,
            );
          }
        }
      }
      this.running = false;
    }
  }

  @Cron('0 8 * * *', { timeZone: VIETNAM_TIME_ZONE })
  async sendDailyDigest(now: Date = new Date()): Promise<void> {
    if (this.dailyDigestRunning) {
      this.logger.debug('Daily digest cu chua xong, bo qua lan hien tai.');
      return;
    }
    if (this.shouldSkipQueryWindow('Daily digest')) {
      return;
    }
    this.dailyDigestRunning = true;

    let queryRunner: QueryRunner | null = null;
    let hasLock = false;
    try {
      if (this.dataSource?.isInitialized) {
        try {
          queryRunner = this.dataSource.createQueryRunner();
          await queryRunner.connect();
          const lockResult = await queryRunner.query(
            'SELECT pg_try_advisory_lock($1) as locked',
            [DAILY_DIGEST_ADVISORY_LOCK_ID],
          );
          if (!lockResult || !lockResult[0] || lockResult[0].locked !== true) {
            this.logger.debug('Another instance is currently running daily digest; skipping.');
            return;
          }
          hasLock = true;
        } catch (lockErr) {
          this.logError(
            'Failed to acquire advisory lock for daily digest; failing closed to prevent duplicate runs: ' +
              (lockErr as Error).message,
            lockErr,
          );
          this.deferAfterTransientInfrastructureError(lockErr);
          return;
        }
      }

      const users = await this.usersService.findActiveWithSettings();
      if (users.length === 0) return;

      const { start, end } = this.getVietnamDayRange(now);

      for (const user of users) {
        try {
          const [todaySchedules, overdueResult] = await Promise.all([
            this.schedulesService.findByDateRange(user.user_id, start, end),
            this.schedulesService.findOverdue(user.user_id, now, DAILY_DIGEST_OVERDUE_LIMIT, 0),
          ]);

          const upcomingToday = todaySchedules
            .filter((schedule) => schedule.status === 'pending' && schedule.start_time >= now)
            .slice(0, DAILY_DIGEST_TODAY_LIMIT);

          const digestText = this.buildDailyDigestText(
            user,
            upcomingToday,
            overdueResult.items,
            overdueResult.total,
            now,
          );
          if (!digestText) continue;

          const dispatchResult = await this.dispatchText(user.user_id, user.settings, digestText);
          if (dispatchResult === 'delivered') {
            this.logger.log(`Da gui daily digest cho user ${user.user_id}`);
          }
        } catch (err) {
          this.logError(`Daily digest loi cho user ${user.user_id}`, err);
        }
      }
    } catch (err) {
      this.logError('Daily digest loi o tang truy van / ha tang', err);
      this.deferAfterTransientInfrastructureError(err);
    } finally {
      if (queryRunner) {
        try {
          if (hasLock) {
            await queryRunner.query('SELECT pg_advisory_unlock($1)', [
              DAILY_DIGEST_ADVISORY_LOCK_ID,
            ]);
          }
        } catch (unlockErr) {
          this.logger.warn(
            'Failed to release advisory lock for daily digest: ' + (unlockErr as Error).message,
          );
        } finally {
          try {
            await queryRunner.release();
          } catch (releaseErr) {
            this.logger.warn(
              'Failed to release queryRunner for daily digest: ' + (releaseErr as Error).message,
            );
          }
        }
      }
      this.dailyDigestRunning = false;
    }
  }

  private async sendStartReminder(schedule: Schedule, now: Date): Promise<void> {
    const settings = schedule.user?.settings;

    // Tôn trọng working hours: nếu user đặt khung 8-18 nhưng cron chạy
    // lúc 23:00 → đẩy remind_at về 8h sáng mai và bỏ qua tick này.
    if (!isWithinWorkingHours(now, settings)) {
      const nextStart = nextWorkingStart(now, settings);
      const minutesUntilStart = Math.max(
        1,
        Math.round((nextStart.getTime() - now.getTime()) / 60000),
      );
      await this.schedulesService.rescheduleAfterPing(schedule.id, minutesUntilStart, now);
      this.logger.log(
        `🌙 Trong giờ yên lặng — dồn reminder #${schedule.id} sang ${this.dateParser.formatVietnam(nextStart)}`,
      );
      return;
    }

    const snoozeMinutes = settings?.default_remind_minutes ?? DEFAULT_SNOOZE_MINUTES;

    const embed = this.buildStartEmbed(schedule, now);
    const buttons = this.buildStartButtons(schedule.id, snoozeMinutes);
    const mention = this.buildMentionPayload(schedule);

    const dispatchResult = await this.dispatch(
      schedule.user_id,
      settings,
      schedule.channel_id ?? null,
      embed,
      buttons,
      this.buildStartDmText(schedule, now),
      mention,
    );

    if (dispatchResult === 'delivered') {
      // Đẩy `remind_at` về future → nếu user ignore thì cron sẽ ping lại sau `snoozeMinutes` phút.
      await this.schedulesService.rescheduleAfterPing(schedule.id, snoozeMinutes, now);
      this.logger.log(
        `Da gui start reminder #${schedule.id} (repeat sau ${snoozeMinutes} phut neu ignore)`,
      );
    } else if (dispatchResult === 'transient-failure') {
      // Nếu dispatch thất bại do lỗi mạng tạm thời, retry nhanh sau 2 phút để không bỏ lỡ nhắc nhở
      const fastRetryMinutes = Math.min(2, snoozeMinutes);
      await this.schedulesService.rescheduleAfterPing(schedule.id, fastRetryMinutes, now);
      this.logger.warn(
        `Khong the gui start reminder #${schedule.id} do loi tam thoi, hen thu lai sau ${fastRetryMinutes} phut`,
      );
    } else {
      // no-route: không có route hợp lệ, lùi lại theo snooze chuẩn (ví dụ 30-60 phút) để tránh hot-loop ghi DB 2 phút một lần
      await this.schedulesService.rescheduleAfterPing(schedule.id, snoozeMinutes, now);
      this.logger.warn(
        `Khong co route gui reminder #${schedule.id} cho user ${schedule.user_id}; hoan lai ${snoozeMinutes} phut de tranh hot-loop`,
      );
    }
  }

  /**
   * Tính số phút hoãn cho lần thử tiếp theo dựa trên kết quả dispatch và số lần đã thử trước đó.
   * `previousAttempts`: số lần đã thử trước lần thử hiện tại (mặc định 0 cho lần thử đầu).
   */
  calculateEndNotificationRetryMinutes(
    result: 'transient-failure' | 'no-route',
    previousAttempts: number,
    baseSnoozeMinutes: number = DEFAULT_SNOOZE_MINUTES,
  ): number {
    const attemptIndex = Math.max(0, previousAttempts);

    if (result === 'transient-failure') {
      // attempt 1 (index 0): 2m
      // attempt 2 (index 1): 5m
      // attempt 3 (index 2): 15m
      // attempt 4 (index 3): 30m
      // attempt 5+ (index >= 4): 60m
      const transientDelays = [2, 5, 15, 30, 60];
      const delay = transientDelays[Math.min(attemptIndex, transientDelays.length - 1)];
      return Math.min(delay, 60);
    }

    // no-route:
    // attempt 1 (index 0): Math.max(15, baseSnoozeMinutes)
    // attempt 2 (index 1): 30m
    // attempt 3 (index 2): 60m (1h)
    // attempt 4 (index 3): 120m (2h)
    // attempt 5+ (index >= 4): 360m (6h)
    const initialNoRoute = Math.max(15, baseSnoozeMinutes);
    const noRouteDelays = [initialNoRoute, 30, 60, 120, 360];
    return noRouteDelays[Math.min(attemptIndex, noRouteDelays.length - 1)];
  }

  private async sendEndNotification(schedule: Schedule, now: Date): Promise<void> {
    const settings = schedule.user?.settings;

    const embed = this.buildEndEmbed(schedule, now);
    const buttons = this.buildEndButtons(schedule.id);
    const mention = this.buildMentionPayload(schedule);

    const dispatchResult = await this.dispatch(
      schedule.user_id,
      settings,
      schedule.channel_id ?? null,
      embed,
      buttons,
      this.buildEndDmText(schedule, now),
      mention,
    );

    const snoozeMinutes = settings?.default_remind_minutes ?? DEFAULT_SNOOZE_MINUTES;
    const currentAttempts = schedule.end_notification_attempts ?? 0;

    if (dispatchResult === 'delivered') {
      // Chỉ gửi 1 lần — set timestamp để cron không gửi lại khi đã gửi thành công.
      await this.schedulesService.markEndNotified(schedule.id, now);
      this.logger.log(`Da gui end notification #${schedule.id}`);
    } else if (dispatchResult === 'transient-failure') {
      // Bounded exponential backoff cho transient network errors (2m, 5m, 15m, 30m, 60m)
      const retryMinutes = this.calculateEndNotificationRetryMinutes(
        'transient-failure',
        currentAttempts,
        snoozeMinutes,
      );
      await this.schedulesService.deferEndNotification(schedule.id, retryMinutes, now);
      this.logger.warn(
        `Khong the gui end notification #${schedule.id} do loi mang (lan thu ${currentAttempts + 1}); hen thu lai sau ${retryMinutes} phut`,
      );
    } else {
      // no-route: progressive backoff (15m, 30m, 60m, 120m, 360m) để tránh hot loop
      const retryMinutes = this.calculateEndNotificationRetryMinutes(
        'no-route',
        currentAttempts,
        snoozeMinutes,
      );
      await this.schedulesService.deferEndNotification(schedule.id, retryMinutes, now);
      this.logger.warn(
        `Khong the gui end notification #${schedule.id} vi khong co route hop le (lan thu ${currentAttempts + 1}) cho user ${schedule.user_id}; hoan lai ${retryMinutes} phut de tranh hot loop`,
      );
    }
  }

  /**
   * Gửi reminder theo cài đặt user.
   * - Channel là nơi chính: gửi embed có button để user xác nhận/hoãn/hoàn thành.
   * - DM chỉ nhắc thêm bằng text khi đã có ít nhất một channel nhận được form.
   * - If explicit settings have no valid route, log and skip instead of overriding them.
   */
  private async dispatch(
    userId: string,
    settings: NotificationSettings | undefined,
    scheduleChannelId: string | null,
    embed: ReturnType<InteractiveBuilder['build']>,
    buttons: unknown[],
    dmText: string,
    mention?: { text: string; mentions: ApiMessageMention[] } | null,
  ): Promise<DispatchResult> {
    const wantDm = settings?.notify_via_dm === true;
    const wantChannel = settings?.notify_via_channel !== false; // default true
    const channelIds = this.collectChannelIds(
      scheduleChannelId,
      settings?.default_channel_id ?? null,
    );

    const tasks: Array<Promise<void>> = [];
    let hasInteractiveChannel = false;

    if (wantChannel && channelIds.length > 0) {
      for (const channelId of channelIds) {
        tasks.push(
          this.botService.sendBuzzInteractive(
            channelId,
            embed,
            buttons,
            mention?.text,
            mention?.mentions,
          ),
        );
      }
      hasInteractiveChannel = true;
    }

    if (wantDm) {
      tasks.push(
        hasInteractiveChannel
          ? this.botService.sendDirectMessage(userId, dmText)
          : this.botService.sendDmInteractive(userId, embed, buttons, undefined, true),
      );
    }

    if (tasks.length === 0) {
      if (!settings) {
        tasks.push(this.botService.sendDmInteractive(userId, embed, buttons, undefined, true));
      } else {
        this.logger.warn(
          `Khong co route reminder hop le cho user ${userId}; bo qua gui thong bao.`,
        );
        return 'no-route';
      }
    }

    // Gửi song song. Kiểm tra xem có ít nhất 1 route gửi thành công hay không.
    const results = await Promise.allSettled(tasks);
    let successfulDispatches = 0;
    for (const r of results) {
      if (r.status === 'rejected') {
        this.logError('Reminder dispatch lỗi 1 route', r.reason);
      } else {
        successfulDispatches += 1;
      }
    }
    return successfulDispatches > 0 ? 'delivered' : 'transient-failure';
  }

  private async dispatchText(
    userId: string,
    settings: NotificationSettings | undefined,
    text: string,
  ): Promise<DispatchResult> {
    const wantDm = settings?.notify_via_dm === true;
    const wantChannel = settings?.notify_via_channel !== false; // default true
    const channelIds = this.parseChannelIds(settings?.default_channel_id ?? null);

    const tasks: Array<Promise<void>> = [];

    if (wantChannel && channelIds.length > 0) {
      for (const channelId of channelIds) {
        tasks.push(this.botService.sendMessage(channelId, text));
      }
    }

    if (wantDm) {
      tasks.push(this.botService.sendDirectMessage(userId, text));
    }

    if (tasks.length === 0) {
      if (!settings) {
        tasks.push(this.botService.sendDirectMessage(userId, text));
      } else {
        this.logger.warn(`Khong co route digest hop le cho user ${userId}; bo qua.`);
        return 'no-route';
      }
    }

    const results = await Promise.allSettled(tasks);
    let successfulDispatches = 0;
    for (const r of results) {
      if (r.status === 'rejected') {
        this.logError('Daily digest dispatch loi 1 route', r.reason);
      } else {
        successfulDispatches += 1;
      }
    }
    return successfulDispatches > 0 ? 'delivered' : 'transient-failure';
  }

  private parseChannelIds(raw: string | null): string[] {
    if (!raw) return [];
    const ids = raw
      .split(/[,\s;]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    return [...new Set(ids)];
  }

  private collectChannelIds(
    scheduleChannelId: string | null,
    settingsChannelIds: string | null,
  ): string[] {
    const scheduleIds = this.parseChannelIds(scheduleChannelId);
    if (scheduleIds.length > 0) return scheduleIds;
    return this.parseChannelIds(settingsChannelIds);
  }

  private getVietnamDayRange(now: Date): { start: Date; end: Date } {
    const shifted = new Date(now.getTime() + VIETNAM_UTC_OFFSET_MS);
    const startMs =
      Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) -
      VIETNAM_UTC_OFFSET_MS;

    return {
      start: new Date(startMs),
      end: new Date(startMs + DAY_MS - 1),
    };
  }

  private buildDailyDigestText(
    user: User,
    today: Schedule[],
    overdue: Schedule[],
    overdueTotal: number,
    now: Date,
  ): string | null {
    if (today.length === 0 && overdueTotal === 0) return null;

    const displayName = user.display_name ?? user.username ?? 'bạn';
    const lines = [
      `📋 Tóm tắt lịch hôm nay (${this.dateParser.formatVietnam(now)})`,
      `Chào ${displayName}, bạn có ${today.length} lịch sắp tới${
        overdueTotal > 0 ? ` và ${overdueTotal} lịch quá hạn` : ''
      }.`,
    ];

    if (overdue.length > 0) {
      lines.push('', `⚠️ Quá hạn (${overdueTotal})`);
      for (const schedule of overdue) {
        lines.push(this.formatDigestScheduleLine(schedule));
      }
      const remaining = overdueTotal - overdue.length;
      if (remaining > 0) {
        lines.push(`- Còn ${remaining} lịch quá hạn khác.`);
      }
    }

    if (today.length > 0) {
      lines.push('', `🗓 Hôm nay (${today.length})`);
      for (const schedule of today) {
        lines.push(this.formatDigestScheduleLine(schedule));
      }
    }

    lines.push('', 'Dùng *chi-tiet <ID> để xem chi tiết hoặc mở dashboard để cập nhật.');
    return lines.join('\n');
  }

  private formatDigestScheduleLine(schedule: Schedule): string {
    const title = schedule.title.replace(/\s+/g, ' ').trim();
    return `- #${schedule.id} ${this.formatDigestPriority(schedule.priority)} ${title} (${this.dateParser.formatVietnam(schedule.start_time)})`;
  }

  private formatDigestPriority(priority: Schedule['priority']): string {
    if (priority === 'high') return '[cao]';
    if (priority === 'low') return '[thấp]';
    return '[bình thường]';
  }

  // ============== EMBED + BUTTONS: START ==============

  private buildStartEmbed(schedule: Schedule, now: Date): ReturnType<InteractiveBuilder['build']> {
    const minutesUntilStart = Math.round((schedule.start_time.getTime() - now.getTime()) / 60000);
    const timeRemaining = this.formatTimeUntilStart(minutesUntilStart);

    const builder = new InteractiveBuilder('⏰ NHẮC LỊCH')
      .setDescription(`Bạn có lịch **${schedule.title}** ${timeRemaining}.`)
      .addField('🆔 ID', String(schedule.id), true)
      .addField('⏰ Bắt đầu', this.dateParser.formatVietnam(schedule.start_time), true);

    if (schedule.end_time) {
      builder.addField('🏁 Kết thúc', this.dateParser.formatVietnam(schedule.end_time), true);
    }
    if (schedule.description) {
      builder.addField('📝 Mô tả', schedule.description);
    }

    return builder.build();
  }

  private buildStartButtons(scheduleId: number, snoozeMinutes: number): unknown[] {
    const builder = new ButtonBuilder().addButton(
      `${REMINDER_INTERACTION_ID}:ack:${scheduleId}`,
      '✅ Đã nhận',
      EButtonMessageStyle.SUCCESS,
    );

    // Default snooze (theo user settings) — button_id encode minutes để handler
    // không phải fetch user_settings lại.
    builder.addButton(
      `${REMINDER_INTERACTION_ID}:snooze:${scheduleId}:${snoozeMinutes}`,
      `⏰ ${this.formatSnoozeLabel(snoozeMinutes)}`,
      EButtonMessageStyle.SECONDARY,
    );

    // Các preset khác nhau so với default → quick-snooze không trùng.
    for (const preset of SNOOZE_PRESETS_MINUTES) {
      if (preset === snoozeMinutes) continue;
      builder.addButton(
        `${REMINDER_INTERACTION_ID}:snooze:${scheduleId}:${preset}`,
        `⏰ ${this.formatSnoozeLabel(preset)}`,
        EButtonMessageStyle.SECONDARY,
      );
    }

    // Frame snooze — đến khung giờ thay vì cố định số phút.
    builder.addButton(
      `${REMINDER_INTERACTION_ID}:frame:${scheduleId}:work`,
      '🌅 Đến giờ làm',
      EButtonMessageStyle.SECONDARY,
    );
    builder.addButton(
      `${REMINDER_INTERACTION_ID}:frame:${scheduleId}:evening`,
      '🌙 Đến tối',
      EButtonMessageStyle.SECONDARY,
    );

    // Hoãn tuỳ ý — mở form ephemeral cho user nhập số phút.
    builder.addButton(
      `${REMINDER_INTERACTION_ID}:custom:${scheduleId}`,
      '✏️ Hoãn tuỳ ý',
      EButtonMessageStyle.SECONDARY,
    );

    return builder.build();
  }

  /**
   * Build payload mention `@username` để Mezon gửi notification thật cho
   * user (đèn đỏ + push) khi reminder rơi vào channel chung. Trả `null`
   * nếu schedule không có user/username.
   */
  private buildMentionPayload(
    schedule: Schedule,
  ): { text: string; mentions: ApiMessageMention[] } | null {
    const ownerUsername = schedule.user?.username;
    if (!ownerUsername) return null;

    const targets: Array<{ user_id: string; username: string }> = [
      { user_id: schedule.user_id, username: ownerUsername },
    ];

    for (const u of schedule.sharedWith ?? []) {
      if (!u.username || u.user_id === schedule.user_id) continue;
      if (targets.some((t) => t.user_id === u.user_id)) continue;
      targets.push({ user_id: u.user_id, username: u.username });
    }

    const mentions: ApiMessageMention[] = [];
    const parts: string[] = [];
    let cursor = 0;
    for (const t of targets) {
      const display = `@${t.username}`;
      mentions.push({
        user_id: t.user_id,
        username: t.username,
        s: cursor,
        e: cursor + display.length,
      });
      parts.push(display);
      cursor += display.length + 1;
    }

    return {
      text: parts.join(' ') + ' ',
      mentions,
    };
  }

  private formatSnoozeLabel(minutes: number): string {
    if (minutes >= 60 && minutes % 60 === 0) {
      const hours = minutes / 60;
      return `Hoãn ${hours}h`;
    }
    return `Hoãn ${minutes}p`;
  }

  private buildStartDmText(schedule: Schedule, now: Date): string {
    const minutesUntilStart = Math.round((schedule.start_time.getTime() - now.getTime()) / 60000);
    const lines = [
      `⏰ Nhắc lịch: ${schedule.title}`,
      `ID: ${schedule.id}`,
      `Bắt đầu: ${this.dateParser.formatVietnam(schedule.start_time)}`,
    ];

    if (schedule.end_time) {
      lines.push(`Kết thúc: ${this.dateParser.formatVietnam(schedule.end_time)}`);
    }
    if (schedule.description) {
      lines.push(`Mô tả: ${schedule.description}`);
    }

    lines.push(`Trạng thái: ${this.formatTimeUntilStart(minutesUntilStart).replace(/\*\*/g, '')}.`);
    lines.push('Vui lòng bấm xác nhận/hoãn ở message trong channel.');
    return lines.join('\n');
  }

  // ============== EMBED + BUTTONS: END ==============

  private buildEndEmbed(schedule: Schedule, now: Date): ReturnType<InteractiveBuilder['build']> {
    const minutesPassed = schedule.end_time
      ? Math.max(0, Math.round((now.getTime() - schedule.end_time.getTime()) / 60000))
      : 0;
    const passedText =
      minutesPassed === 0
        ? 'vừa kết thúc'
        : `kết thúc cách đây **${this.dateParser.formatMinutes(minutesPassed)}**`;

    const builder = new InteractiveBuilder('🏁 LỊCH ĐÃ KẾT THÚC')
      .setDescription(`Lịch **${schedule.title}** ${passedText}.`)
      .addField('🆔 ID', String(schedule.id), true);

    if (schedule.end_time) {
      builder.addField('🏁 Kết thúc lúc', this.dateParser.formatVietnam(schedule.end_time), true);
    }

    return builder.build();
  }

  private buildEndButtons(scheduleId: number): unknown[] {
    return new ButtonBuilder()
      .addButton(
        `${REMINDER_INTERACTION_ID}:done:${scheduleId}`,
        '✅ Đã hoàn thành',
        EButtonMessageStyle.SUCCESS,
      )
      .addButton(
        `${REMINDER_INTERACTION_ID}:later:${scheduleId}`,
        '⏭️ Để sau',
        EButtonMessageStyle.SECONDARY,
      )
      .build();
  }

  private buildEndDmText(schedule: Schedule, now: Date): string {
    const minutesPassed = schedule.end_time
      ? Math.max(0, Math.round((now.getTime() - schedule.end_time.getTime()) / 60000))
      : 0;
    const passedText =
      minutesPassed === 0
        ? 'vừa kết thúc'
        : `kết thúc cách đây ${this.dateParser.formatMinutes(minutesPassed)}`;

    return [
      `🏁 Lịch đã kết thúc: ${schedule.title}`,
      `ID: ${schedule.id}`,
      schedule.end_time
        ? `Kết thúc lúc: ${this.dateParser.formatVietnam(schedule.end_time)}`
        : null,
      `Trạng thái: ${passedText}.`,
      'Vui lòng bấm hoàn thành/để sau ở message trong channel.',
    ]
      .filter((line): line is string => Boolean(line))
      .join('\n');
  }

  private formatTimeUntilStart(minutes: number): string {
    if (minutes <= 0) {
      const passed = Math.abs(minutes);
      if (passed === 0) return '**đang bắt đầu ngay bây giờ**';
      return `đã **bắt đầu ${this.dateParser.formatMinutes(passed)} trước**`;
    }
    return `sẽ diễn ra sau **${this.dateParser.formatMinutes(minutes)}**`;
  }

  /** Log error dạng chi tiết — bất kể err có phải Error instance hay không. */
  private shouldSkipQueryWindow(scope: string): boolean {
    const waitMs = this.nextQueryRetryAt - Date.now();
    if (waitMs <= 0) {
      return false;
    }
    this.logger.debug(`${scope}: bo qua truy van DB, thu lai sau ${Math.ceil(waitMs / 1000)}s.`);
    return true;
  }

  private deferAfterTransientInfrastructureError(err: unknown): void {
    if (!this.isTransientInfrastructureError(err)) {
      return;
    }
    this.nextQueryRetryAt = Date.now() + this.infraBackoffMs;
    this.logger.warn(
      `Tam dung truy van reminder ${Math.ceil(
        this.infraBackoffMs / 1000,
      )}s vi DB/DNS dang loi tam thoi.`,
    );
  }

  private isTransientInfrastructureError(err: unknown): boolean {
    const code = this.readErrorField(err, 'code');
    if (
      code === 'ENOTFOUND' ||
      code === 'ECONNRESET' ||
      code === 'ECONNREFUSED' ||
      code === 'ETIMEDOUT'
    ) {
      return true;
    }
    const message = err instanceof Error ? err.message : String(err);
    return /ENOTFOUND|ECONNRESET|ECONNREFUSED|ETIMEDOUT|Connection terminated unexpectedly/i.test(
      message,
    );
  }

  private readErrorField(err: unknown, field: string): unknown {
    if (!err || typeof err !== 'object' || !(field in err)) {
      return undefined;
    }
    return (err as Record<string, unknown>)[field];
  }

  private logError(prefix: string, err: unknown): void {
    if (err instanceof Error) {
      this.logger.error(`${prefix}: ${err.message || '(empty message)'}`, err.stack);
      return;
    }
    try {
      const dump = JSON.stringify(err, Object.getOwnPropertyNames(err ?? {}));
      this.logger.error(`${prefix}: [non-Error] ${dump || String(err)}`);
    } catch {
      this.logger.error(`${prefix}: [non-Error, unstringifiable] ${String(err)}`);
    }
  }
}
