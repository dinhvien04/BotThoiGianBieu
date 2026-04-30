import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ButtonBuilder,
  EButtonMessageStyle,
  InteractiveBuilder,
} from 'mezon-sdk';
import { InteractionRegistry } from '../bot/interactions/interaction-registry';
import {
  ButtonInteractionContext,
  InteractionHandler,
} from '../bot/interactions/interaction.types';
import { BotService } from '../bot/bot.service';
import { SchedulesService } from '../schedules/schedules.service';
import { Schedule } from '../schedules/entities/schedule.entity';
import { UsersService } from '../users/users.service';
import { DateParser } from '../shared/utils/date-parser';
import { parseSnoozeFrame } from '../shared/utils/snooze-frame';
import { REMINDER_INTERACTION_ID } from './reminder.service';

const FRAME_KEYWORDS: Record<string, string> = {
  work: 'đến giờ làm',
  evening: 'đến tối',
  noon: 'đến trưa',
  afternoon: 'đến chiều',
  eod: 'đến cuối ngày',
};

/**
 * Xử lý button click trên message reminder:
 *   - "reminder:ack:<scheduleId>"              → start reminder: đánh dấu đã nhận, dừng nhắc
 *   - "reminder:snooze:<scheduleId>"           → start reminder: hoãn theo user_settings (legacy)
 *   - "reminder:snooze:<scheduleId>:<minutes>" → start reminder: hoãn đúng X phút (preset button)
 *   - "reminder:frame:<scheduleId>:<key>"      → start reminder: hoãn đến khung giờ (work/evening/...)
 *   - "reminder:custom:<scheduleId>"           → mở form ephemeral cho user nhập số phút tuỳ ý
 *   - "reminder:csub:<scheduleId>"             → submit form custom snooze (formData.minutes)
 *   - "reminder:ccancel:<scheduleId>"          → đóng form custom snooze
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
    private readonly botService: BotService,
    private readonly dateParser: DateParser,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async handleButton(ctx: ButtonInteractionContext): Promise<void> {
    // action format: "ack:<id>" / "snooze:<id>" / "snooze:<id>:<minutes>" / "custom:<id>" / "csub:<id>" / "ccancel:<id>"
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
      case 'frame':
        await this.handleFrame(ctx, scheduleId, minutesStr);
        return;
      case 'custom':
        await this.handleCustomOpen(ctx, scheduleId);
        return;
      case 'csub':
        await this.handleCustomSubmit(ctx, scheduleId);
        return;
      case 'ccancel':
        await this.handleCustomCancel(ctx);
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

  /**
   * Mở form ephemeral để user nhập số phút hoãn tuỳ ý.
   * Form chỉ hiển thị cho user click — channel khác không thấy.
   */
  private async handleFrame(
    ctx: ButtonInteractionContext,
    scheduleId: number,
    frameKey: string | undefined,
  ): Promise<void> {
    const keyword = frameKey ? FRAME_KEYWORDS[frameKey] : undefined;
    if (!keyword) {
      this.logger.warn(`Frame key không hợp lệ: ${frameKey}`);
      await ctx.send(`⚠️ Khung giờ không hợp lệ.`);
      return;
    }

    const user = await this.usersService.findByUserId(ctx.clickerId);
    const now = new Date();
    const frame = parseSnoozeFrame(keyword, now, {
      workStartHour: user?.settings?.work_start_hour ?? 0,
      workEndHour: user?.settings?.work_end_hour ?? 0,
    });
    if (!frame) {
      await ctx.send(`⚠️ Không tính được khung giờ "${keyword}".`);
      return;
    }

    const minutes = Math.max(
      1,
      Math.ceil((frame.remindAt.getTime() - now.getTime()) / 60000),
    );
    const nextAt = await this.schedulesService.snooze(scheduleId, minutes);

    await this.safeDelete(ctx);
    if (!nextAt) {
      await ctx.send(
        `ℹ️ Lịch #${scheduleId} đã được xác nhận hoặc xử lý ở channel khác, không hoãn nữa.`,
      );
      return;
    }

    await ctx.send(
      `⏰ Đã hoãn nhắc lịch #${scheduleId} **${frame.label}**.\n` +
        `Sẽ nhắc lại lúc: \`${this.dateParser.formatVietnam(nextAt)}\``,
    );
  }

  private async handleCustomOpen(
    ctx: ButtonInteractionContext,
    scheduleId: number,
  ): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.clickerId);
    const defaultMin = user?.settings?.default_remind_minutes ?? 30;

    const embed = new InteractiveBuilder('✏️ HOÃN TUỲ Ý')
      .setDescription(
        `Nhập số phút muốn hoãn lịch \`#${scheduleId}\`.\n` +
          `Vd: \`15\` (15 phút), \`90\` (1 giờ rưỡi), tối đa 7 ngày (10080).`,
      )
      .addInputField('minutes', '⏱️ Số phút', `Vd: ${defaultMin}`, {
        defaultValue: String(defaultMin),
      })
      .build();

    const buttons = new ButtonBuilder()
      .addButton(
        `${REMINDER_INTERACTION_ID}:csub:${scheduleId}`,
        '⏰ Hoãn',
        EButtonMessageStyle.PRIMARY,
      )
      .addButton(
        `${REMINDER_INTERACTION_ID}:ccancel:${scheduleId}`,
        '❌ Huỷ',
        EButtonMessageStyle.DANGER,
      )
      .build();

    try {
      await this.botService.sendEphemeralInteractive(
        ctx.channelId,
        ctx.clickerId,
        embed,
        buttons,
      );
    } catch (err) {
      this.logger.warn(
        `Không mở được ephemeral form snooze custom: ${(err as Error).message}`,
      );
      await ctx.send(
        `⚠️ Không mở được form. Hãy dùng button preset hoặc gõ \`*nhac-sau ${scheduleId} <thời gian>\`.`,
      );
    }
  }

  private async handleCustomSubmit(
    ctx: ButtonInteractionContext,
    scheduleId: number,
  ): Promise<void> {
    const raw = (ctx.formData.minutes ?? '').trim();
    const minutes = Number(raw);
    if (!/^\d+$/.test(raw) || !Number.isInteger(minutes) || minutes < 1) {
      await ctx.ephemeralSend(
        `⚠️ "${raw || '(rỗng)'}" không phải số phút hợp lệ. Vui lòng nhập số nguyên dương.`,
      );
      return;
    }
    if (minutes > 10080) {
      await ctx.ephemeralSend(
        `⚠️ Tối đa hoãn 7 ngày (10080 phút). Bạn nhập ${minutes}.`,
      );
      return;
    }

    const nextAt = await this.schedulesService.snooze(scheduleId, minutes);
    await this.safeDeleteEphemeral(ctx);

    if (!nextAt) {
      await ctx.ephemeralSend(
        `ℹ️ Lịch #${scheduleId} đã được xác nhận hoặc xử lý ở channel khác, không hoãn nữa.`,
      );
      return;
    }

    await ctx.ephemeralSend(
      `⏰ Đã hoãn nhắc lịch #${scheduleId} thêm **${this.dateParser.formatMinutes(minutes)}**.\n` +
        `Sẽ nhắc lại lúc: \`${this.dateParser.formatVietnam(nextAt)}\``,
    );
  }

  private async handleCustomCancel(ctx: ButtonInteractionContext): Promise<void> {
    await this.safeDeleteEphemeral(ctx);
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

  private async safeDeleteEphemeral(ctx: ButtonInteractionContext): Promise<void> {
    try {
      await ctx.deleteEphemeralForm();
    } catch {
      // best-effort
    }
  }
}
