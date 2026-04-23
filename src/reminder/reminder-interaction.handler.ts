import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InteractionRegistry } from '../bot/interactions/interaction-registry';
import {
  ButtonInteractionContext,
  InteractionHandler,
} from '../bot/interactions/interaction.types';
import { SchedulesService } from '../schedules/schedules.service';
import { UsersService } from '../users/users.service';
import { DateParser } from '../shared/utils/date-parser';
import { REMINDER_INTERACTION_ID } from './reminder.service';

/**
 * Xử lý button click trên message reminder:
 *   - "reminder:ack:<scheduleId>"    → start reminder: đánh dấu đã nhận, dừng nhắc
 *   - "reminder:snooze:<scheduleId>" → start reminder: hoãn X phút (X từ user_settings)
 *   - "reminder:done:<scheduleId>"   → end notification: mark completed
 *   - "reminder:later:<scheduleId>"  → end notification: đóng form, không làm gì
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
    // action format: "ack:<id>" hoặc "snooze:<id>"
    const [actionType, idStr] = ctx.action.split(':');
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
        await this.handleSnooze(ctx, scheduleId);
        return;
      case 'done':
        await this.handleDone(ctx, scheduleId);
        return;
      case 'later':
        await this.handleLater(ctx, scheduleId);
        return;
      default:
        this.logger.warn(`Action không biết: ${actionType}`);
    }
  }

  private async handleAck(ctx: ButtonInteractionContext, scheduleId: number): Promise<void> {
    await this.schedulesService.acknowledge(scheduleId);
    await this.safeDelete(ctx);
    await ctx.send(
      `✅ Đã ghi nhận bạn **bắt đầu công việc #${scheduleId}**.\n` +
        `Chúc bạn làm việc năng suất! 💪`,
    );
  }

  private async handleSnooze(ctx: ButtonInteractionContext, scheduleId: number): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.clickerId);
    const minutes = user?.settings?.default_remind_minutes ?? 30;
    const nextAt = await this.schedulesService.snooze(scheduleId, minutes);

    await this.safeDelete(ctx);
    await ctx.send(
      `⏰ Đã hoãn nhắc lịch #${scheduleId} thêm **${minutes} phút**.\n` +
        `Sẽ nhắc lại lúc: \`${this.dateParser.formatVietnam(nextAt)}\``,
    );
  }

  private async handleDone(ctx: ButtonInteractionContext, scheduleId: number): Promise<void> {
    await this.schedulesService.markCompleted(scheduleId);
    await this.safeDelete(ctx);
    await ctx.send(
      `🎉 Đã đánh dấu **hoàn thành** lịch #${scheduleId}!\nLàm tốt lắm 👏`,
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
