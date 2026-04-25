import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InteractionRegistry } from '../bot/interactions/interaction-registry';
import {
  ButtonInteractionContext,
  InteractionHandler,
} from '../bot/interactions/interaction.types';
import { SchedulesService } from '../schedules/schedules.service';
import { Schedule } from '../schedules/entities/schedule.entity';
import { UsersService } from '../users/users.service';
import { DateParser } from '../shared/utils/date-parser';
import { REMINDER_INTERACTION_ID } from './reminder.service';

/**
 * Xử lý button click trên message reminder:
 *   - "reminder:ack:<scheduleId>"              → start reminder: đánh dấu đã nhận, dừng nhắc
 *   - "reminder:snooze:<scheduleId>"           → start reminder: hoãn theo user_settings (legacy)
 *   - "reminder:snooze:<scheduleId>:<minutes>" → start reminder: hoãn đúng X phút (preset button)
 *   - "reminder:done:<scheduleId>"             → end notification: mark completed
 *   - "reminder:later:<scheduleId>"            → end notification: đóng form, không làm gì
 */
@Injectable()
export class ReminderInteractionHandler implements InteractionHandler, OnModuleInit {
  private readonly logger = new Logger(ReminderInteractionHandler.name);

  readonly interactionId = REMINDER_INTERACTION_ID;

  constructor(
    private readonly registry: InteractionRegistry,
    private readonly schedulesService: SchedulesService,
    private readonly usersService: UsersService,
    private readonly dateParser: DateParser,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async handleButton(ctx: ButtonInteractionContext): Promise<void> {
    // action format: "ack:<id>" / "snooze:<id>" / "snooze:<id>:<minutes>"
    const parts = ctx.action.split(':');
    const [actionType, idStr, minutesStr] = parts;
    const scheduleId = Number(idStr);

    if (!scheduleId || Number.isNaN(scheduleId)) {
      this.logger.warn(`button_id không hợp lệ: ${ctx.event.button_id}`);
      return;
    }

    const schedule = await this.schedulesService.findById(scheduleId);
    if (!schedule) {
      await ctx.send(`❌ Không tìm thấy lịch #${scheduleId} (có thể đã bị xóa).`);
      await this.safeDelete(ctx);
      return;
    }

    // Chỉ chủ lịch mới được ack/snooze
    if (schedule.user_id !== ctx.clickerId) {
      await ctx.send(`⚠️ Bạn không có quyền thao tác trên lịch này.`);
      return;
    }

    switch (actionType) {
      case 'ack':
        await this.handleAck(ctx, scheduleId);
        return;
      case 'snooze':
        await this.handleSnooze(ctx, scheduleId, minutesStr);
        return;
      case 'done':
        await this.handleDone(ctx, schedule);
        return;
      case 'later':
        await this.handleLater(ctx, scheduleId);
        return;
      default:
        this.logger.warn(`Action không biết: ${actionType}`);
    }
  }

  private async handleAck(ctx: ButtonInteractionContext, scheduleId: number): Promise<void> {
    const acknowledged = await this.schedulesService.acknowledge(scheduleId);
    await this.safeDelete(ctx);
    if (!acknowledged) {
      await ctx.send(
        `ℹ️ Lịch #${scheduleId} đã được xử lý ở nơi khác hoặc không còn ở trạng thái chờ.`,
      );
      return;
    }
    await ctx.send(
      `✅ Đã ghi nhận bạn **bắt đầu công việc #${scheduleId}**.\n` +
        `Chúc bạn làm việc năng suất! 💪`,
    );
  }

  private async handleSnooze(
    ctx: ButtonInteractionContext,
    scheduleId: number,
    minutesStr: string | undefined,
  ): Promise<void> {
    const minutes = await this.resolveSnoozeMinutes(ctx, minutesStr);
    const nextAt = await this.schedulesService.snooze(scheduleId, minutes);

    await this.safeDelete(ctx);
    if (!nextAt) {
      await ctx.send(
        `ℹ️ Lịch #${scheduleId} đã được xác nhận hoặc xử lý ở channel khác, không hoãn nữa.`,
      );
      return;
    }

    await ctx.send(
      `⏰ Đã hoãn nhắc lịch #${scheduleId} thêm **${this.dateParser.formatMinutes(minutes)}**.\n` +
        `Sẽ nhắc lại lúc: \`${this.dateParser.formatVietnam(nextAt)}\``,
    );
  }

  private async resolveSnoozeMinutes(
    ctx: ButtonInteractionContext,
    minutesStr: string | undefined,
  ): Promise<number> {
    if (minutesStr !== undefined && /^\d+$/.test(minutesStr)) {
      const parsed = Number(minutesStr);
      if (Number.isInteger(parsed) && parsed > 0) {
        return parsed;
      }
      this.logger.warn(`Snooze minutes không hợp lệ: "${minutesStr}", fallback sang default.`);
    }
    const user = await this.usersService.findByUserId(ctx.clickerId);
    return user?.settings?.default_remind_minutes ?? 30;
  }

  private async handleDone(
    ctx: ButtonInteractionContext,
    schedule: Schedule,
  ): Promise<void> {
    const now = new Date();
    await this.schedulesService.markCompleted(schedule.id, now);

    const next =
      schedule.recurrence_type && schedule.recurrence_type !== 'none'
        ? await this.schedulesService.spawnNextIfRecurring(schedule, now)
        : null;

    const suffix = next
      ? `\n🔁 Đã tạo lịch lặp kế tiếp #${next.id} lúc \`${this.dateParser.formatVietnam(next.start_time)}\`.`
      : '';

    await this.safeDelete(ctx);
    await ctx.send(
      `🎉 Đã đánh dấu **hoàn thành** lịch #${schedule.id}!\nLàm tốt lắm 👏${suffix}`,
    );
  }

  private async handleLater(ctx: ButtonInteractionContext, scheduleId: number): Promise<void> {
    await this.safeDelete(ctx);
    await ctx.send(
      `📋 Đã đóng thông báo lịch #${scheduleId}.\n` +
        `Khi nào xong nhớ gõ \`*hoan-thanh ${scheduleId}\` để đánh dấu hoàn thành nhé.`,
    );
  }

  private async safeDelete(ctx: ButtonInteractionContext): Promise<void> {
    try {
      await ctx.deleteForm();
    } catch {
      // best-effort
    }
  }
}
