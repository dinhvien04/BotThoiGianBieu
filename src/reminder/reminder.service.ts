import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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

/**
 * Interval mặc định (phút) để auto-resend khi user bấm hoãn lấy theo
 * `default_remind_minutes` của user. Ignore-repeat (user không bấm gì) cũng
 * dùng cùng interval đó để UX nhất quán.
 */
const DEFAULT_SNOOZE_MINUTES = 30;

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

  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly botService: BotService,
    private readonly dateParser: DateParser,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async tick(): Promise<void> {
    if (this.running) {
      this.logger.debug('Tick cũ chưa xong, bỏ qua tick hiện tại.');
      return;
    }
    this.running = true;

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
    } finally {
      this.running = false;
    }
  }

  private async sendStartReminder(schedule: Schedule, now: Date): Promise<void> {
    const settings = schedule.user?.settings;
    const snoozeMinutes = settings?.default_remind_minutes ?? DEFAULT_SNOOZE_MINUTES;

    const embed = this.buildStartEmbed(schedule, now);
    const buttons = this.buildStartButtons(schedule.id, snoozeMinutes);
    const mention = this.buildMentionPayload(schedule);

    await this.dispatch(
      schedule.user_id,
      settings,
      embed,
      buttons,
      this.buildStartDmText(schedule, now),
      mention,
    );

    // Đẩy `remind_at` về future → nếu user ignore thì cron sẽ ping lại sau `snoozeMinutes` phút.
    await this.schedulesService.rescheduleAfterPing(schedule.id, snoozeMinutes, now);
    this.logger.log(`✅ Đã gửi start reminder #${schedule.id} (repeat sau ${snoozeMinutes} phút nếu ignore)`);
  }

  private async sendEndNotification(schedule: Schedule, now: Date): Promise<void> {
    const settings = schedule.user?.settings;

    const embed = this.buildEndEmbed(schedule, now);
    const buttons = this.buildEndButtons(schedule.id);
    const mention = this.buildMentionPayload(schedule);

    await this.dispatch(
      schedule.user_id,
      settings,
      embed,
      buttons,
      this.buildEndDmText(schedule, now),
      mention,
    );

    // Chỉ gửi 1 lần — set timestamp để cron không gửi lại.
    await this.schedulesService.markEndNotified(schedule.id, now);
    this.logger.log(`🏁 Đã gửi end notification #${schedule.id}`);
  }

  /**
   * Gửi reminder theo cài đặt user.
   * - Channel là nơi chính: gửi embed có button để user xác nhận/hoãn/hoàn thành.
   * - DM chỉ nhắc thêm bằng text khi đã có ít nhất một channel nhận được form.
   * - Nếu không có channel hợp lệ thì fallback DM interactive để user vẫn thao tác được.
   */
  private async dispatch(
    userId: string,
    settings:
      | {
          notify_via_dm?: boolean;
          notify_via_channel?: boolean;
          default_channel_id?: string | null;
        }
      | undefined,
    embed: ReturnType<InteractiveBuilder['build']>,
    buttons: unknown[],
    dmText: string,
    mention?: { text: string; mentions: ApiMessageMention[] } | null,
  ): Promise<void> {
    const wantDm = settings?.notify_via_dm === true;
    const wantChannel = settings?.notify_via_channel !== false; // default true
    const channelIds = this.parseChannelIds(settings?.default_channel_id ?? null);

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

    // Fallback: nếu không có route nào (vd user chọn "chỉ channel" nhưng chưa
    // set channel nào) → gửi DM interactive để user ít nhất nhận được và bấm được.
    if (tasks.length === 0) {
      tasks.push(
        this.botService.sendDmInteractive(userId, embed, buttons, undefined, true),
      );
    }

    // Gửi song song. Một route lỗi không ảnh hưởng route khác.
    const results = await Promise.allSettled(tasks);
    for (const r of results) {
      if (r.status === 'rejected') {
        this.logError('Reminder dispatch lỗi 1 route', r.reason);
      }
    }
  }

  private parseChannelIds(raw: string | null): string[] {
    if (!raw) return [];
    const ids = raw
      .split(/[,\s;]+/)
      .map((id) => id.trim())
      .filter(Boolean);
    return [...new Set(ids)];
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
      text: parts.join(" ") + " ",
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
    const passedText = minutesPassed === 0
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
    const passedText = minutesPassed === 0
      ? 'vừa kết thúc'
      : `kết thúc cách đây ${this.dateParser.formatMinutes(minutesPassed)}`;

    return [
      `🏁 Lịch đã kết thúc: ${schedule.title}`,
      `ID: ${schedule.id}`,
      schedule.end_time ? `Kết thúc lúc: ${this.dateParser.formatVietnam(schedule.end_time)}` : null,
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
