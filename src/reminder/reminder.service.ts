import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import {
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

    await this.dispatch(schedule.user_id, settings, embed, buttons);

    // Đẩy `remind_at` về future → nếu user ignore thì cron sẽ ping lại sau `snoozeMinutes` phút.
    await this.schedulesService.rescheduleAfterPing(schedule.id, snoozeMinutes, now);
    this.logger.log(`✅ Đã gửi start reminder #${schedule.id} (repeat sau ${snoozeMinutes} phút nếu ignore)`);
  }

  private async sendEndNotification(schedule: Schedule, now: Date): Promise<void> {
    const settings = schedule.user?.settings;

    const embed = this.buildEndEmbed(schedule, now);
    const buttons = this.buildEndButtons(schedule.id);

    await this.dispatch(schedule.user_id, settings, embed, buttons);

    // Chỉ gửi 1 lần — set timestamp để cron không gửi lại.
    await this.schedulesService.markEndNotified(schedule.id, now);
    this.logger.log(`🏁 Đã gửi end notification #${schedule.id}`);
  }

  /**
   * Gửi reminder theo cài đặt user. Có thể gửi:
   *   - Chỉ DM                       (notify_via_dm=true, notify_via_channel=false)
   *   - Chỉ channel mặc định          (notify_via_dm=false, notify_via_channel=true)
   *   - Cả hai (song song)            (cả 2 = true)
   * Nếu user chọn channel nhưng chưa đặt `default_channel_id` → fallback DM
   * để không bị mất thông báo.
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
  ): Promise<void> {
    const wantDm = settings?.notify_via_dm === true;
    const wantChannel = settings?.notify_via_channel !== false; // default true
    const channelId = settings?.default_channel_id ?? null;

    const tasks: Array<Promise<void>> = [];

    if (wantChannel && channelId) {
      tasks.push(this.botService.sendBuzzInteractive(channelId, embed, buttons));
    }
    if (wantDm) {
      tasks.push(
        this.botService.sendDmInteractive(userId, embed, buttons, undefined, true),
      );
    }

    // Fallback: nếu không có route nào (vd user chọn "chỉ channel" nhưng chưa
    // set default_channel_id) → gửi DM để user ít nhất nhận được.
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
    return new ButtonBuilder()
      .addButton(
        `${REMINDER_INTERACTION_ID}:ack:${scheduleId}`,
        '✅ Đã nhận',
        EButtonMessageStyle.SUCCESS,
      )
      .addButton(
        `${REMINDER_INTERACTION_ID}:snooze:${scheduleId}`,
        `⏰ Hoãn ${snoozeMinutes} phút`,
        EButtonMessageStyle.SECONDARY,
      )
      .build();
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
