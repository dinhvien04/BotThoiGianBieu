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
            this.logger.error(
              `Lỗi gửi start reminder #${schedule.id}: ${(err as Error).message}`,
              (err as Error).stack,
            );
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
            this.logger.error(
              `Lỗi gửi end notification #${schedule.id}: ${(err as Error).message}`,
              (err as Error).stack,
            );
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

  /** Gửi qua DM hoặc channel mặc định tuỳ `notify_via_dm`. */
  private async dispatch(
    userId: string,
    settings: { notify_via_dm?: boolean; default_channel_id?: string | null } | undefined,
    embed: ReturnType<InteractiveBuilder['build']>,
    buttons: unknown[],
  ): Promise<void> {
    const notifyViaDm = settings?.notify_via_dm === true;
    const channelId = settings?.default_channel_id ?? null;

    if (notifyViaDm) {
      await this.botService.sendDmInteractive(userId, embed, buttons, undefined, true);
    } else if (channelId) {
      await this.botService.sendBuzzInteractive(channelId, embed, buttons);
    } else {
      // Fallback: DM nếu user chưa đặt channel mặc định
      await this.botService.sendDmInteractive(userId, embed, buttons, undefined, true);
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
      : `kết thúc cách đây **${this.formatMinutes(minutesPassed)}**`;

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
      return `đã **bắt đầu ${this.formatMinutes(passed)} trước**`;
    }
    return `sẽ diễn ra sau **${this.formatMinutes(minutes)}**`;
  }

  private formatMinutes(minutes: number): string {
    if (minutes < 60) return `${minutes} phút`;
    if (minutes < 60 * 24) {
      const h = Math.floor(minutes / 60);
      const m = minutes % 60;
      return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
    }
    const days = Math.floor(minutes / (60 * 24));
    return `${days} ngày`;
  }
}
