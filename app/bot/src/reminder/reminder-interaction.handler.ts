import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import {
  ButtonBuilder,
  EButtonMessageStyle,
  InteractiveBuilder,
} from 'mezon-sdk';
import { BotService } from '../bot/bot.service';
import { InteractionRegistry } from '../bot/interactions/interaction-registry';
import {
  ButtonInteractionContext,
  InteractionHandler,
} from '../bot/interactions/interaction.types';
import { DateParser } from '../shared/utils/date-parser';
import { parseSnoozeFrame } from '../shared/utils/snooze-frame';
import { Schedule } from '../schedules/entities/schedule.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { UsersService } from '../users/users.service';
import { REMINDER_INTERACTION_ID } from './reminder.service';

const FRAME_KEYWORDS: Record<string, string> = {
  work: 'đến giờ làm',
  evening: 'đến tối',
  noon: 'đến trưa',
  afternoon: 'đến chiều',
  eod: 'đến cuối ngày',
};

const DEFAULT_SNOOZE_MINUTES = 30;
const MAX_CUSTOM_SNOOZE_MINUTES = 7 * 24 * 60;

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
import { Schedule } from '../schedules/entities/schedule.entity';
import { SchedulesService } from '../schedules/schedules.service';
import { UsersService } from '../users/users.service';
import { REMINDER_INTERACTION_ID } from './reminder.service';

const DEFAULT_SNOOZE_MINUTES = 30;
const MAX_CUSTOM_SNOOZE_MINUTES = 7 * 24 * 60;

/**
 * Xử lý button click trên reminder:
 * - "reminder:ack:<scheduleId>"
 * - "reminder:snooze:<scheduleId>[:minutes]"
 * - "reminder:custom:<scheduleId>"  → mở form ephemeral
 * - "reminder:csub:<scheduleId>"    → submit form custom snooze
 * - "reminder:ccancel:<scheduleId>" → đóng form custom snooze
 * - "reminder:done:<scheduleId>"
 * - "reminder:later:<scheduleId>"
 */
@Injectable()
export class ReminderInteractionHandler implements InteractionHandler, OnModuleInit {
  private readonly logger = new Logger(ReminderInteractionHandler.name);

  readonly interactionId = REMINDER_INTERACTION_ID;

  constructor(
    private readonly registry: InteractionRegistry,
    private readonly botService: BotService,
    private readonly schedulesService: SchedulesService,
    private readonly usersService: UsersService,
    private readonly dateParser: DateParser,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async handleButton(ctx: ButtonInteractionContext): Promise<void> {
    const [actionType, idStr, extraArg] = ctx.action.split(':');
    const scheduleId = this.parsePositiveInteger(idStr);

    if (!scheduleId) {
      this.logger.warn(`button_id không hợp lệ: ${ctx.event.button_id}`);
      return;
    }

    const schedule = await this.schedulesService.findById(scheduleId);
    if (!schedule) {
      await this.handleMissingSchedule(ctx, actionType, scheduleId);
      return;
    }

    if (schedule.user_id !== ctx.clickerId) {
      await this.replyByAction(
        ctx,
        actionType,
        `⚠️ Bạn không có quyền thao tác trên lịch này.`,
      );
      return;
    }

    switch (actionType) {
      case 'ack':
        await this.handleAck(ctx, scheduleId);
        return;
      case 'snooze':
        await this.handleSnooze(ctx, scheduleId, this.parsePositiveInteger(extraArg));
        return;
      case 'frame':
        await this.handleFrame(ctx, scheduleId, extraArg);
        return;
      case 'custom':
        await this.handleCustom(ctx, scheduleId);
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

  private async handleAck(
    ctx: ButtonInteractionContext,
    scheduleId: number,
  ): Promise<void> {
    const acknowledged = await this.schedulesService.acknowledge(scheduleId);
    await this.safeDelete(ctx);

    if (!acknowledged) {
      await ctx.send(
        `ℹ️ Lịch #${scheduleId} đã được xử lý ở nơi khác, không cần xác nhận lại.`,
      );
      return;
    }

    await ctx.send(
      `✅ Đã ghi nhận bạn **bắt đầu công việc #${scheduleId}**.\n` +
        `Chúc bạn làm việc năng suất!`,
    );
  }

  private async handleSnooze(
    ctx: ButtonInteractionContext,
    scheduleId: number,
    explicitMinutes: number | null,
  ): Promise<void> {
    let minutes = explicitMinutes;
    if (!minutes) {
      const user = await this.usersService.findByUserId(ctx.clickerId);
      minutes = user?.settings?.default_remind_minutes ?? DEFAULT_SNOOZE_MINUTES;
    }

    const nextAt = await this.schedulesService.snooze(scheduleId, minutes);
    await this.safeDelete(ctx);

    if (!nextAt) {
      await ctx.send(
        `ℹ️ Lịch #${scheduleId} đã được xử lý nên không hoãn nữa.`,
      );
      return;
    }

    await ctx.send(
      `⏰ Đã hoãn nhắc lịch #${scheduleId} thêm **${minutes} phút**.\n` +
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

  private async handleCustom(
    ctx: ButtonInteractionContext,
    scheduleId: number,
  ): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.clickerId);
    const defaultMinutes =
      user?.settings?.default_remind_minutes ?? DEFAULT_SNOOZE_MINUTES;

    const embed = new InteractiveBuilder(`⏰ HOÃN NHẮC LỊCH #${scheduleId}`)
      .setDescription(
        `Nhập số phút muốn hoãn. Tối đa ${Math.floor(
          MAX_CUSTOM_SNOOZE_MINUTES / (24 * 60),
        )} ngày.`,
      )
      .addInputField(
        'minutes',
        'Số phút hoãn *',
        'Vd: 45',
        {
          type: 'number',
          defaultValue: String(defaultMinutes),
        },
        'Bắt buộc, số nguyên dương.',
      )
      .build();

    const buttons = new ButtonBuilder()
      .addButton(
        `${REMINDER_INTERACTION_ID}:csub:${scheduleId}`,
        '✅ Xác nhận',
        EButtonMessageStyle.SUCCESS,
      )
      .addButton(
        `${REMINDER_INTERACTION_ID}:ccancel:${scheduleId}`,
        '❌ Hủy',
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
      const reason = err instanceof Error ? err.message : String(err);
      this.logger.warn(`Không mở được custom snooze form: ${reason}`);
      await ctx.send(
        `⚠️ Không mở được form hoãn tuỳ ý lúc này.\n` +
          `Bạn có thể dùng \`*nhac-sau ${scheduleId} 45p\` hoặc \`*nhac-sau ${scheduleId} 2h\`.`,
      );
    }
  }

  private async handleCustomSubmit(
    ctx: ButtonInteractionContext,
    scheduleId: number,
  ): Promise<void> {
    const minutesRaw = (ctx.formData.minutes ?? '').trim();
    if (!minutesRaw) {
      await ctx.ephemeralSend(
        `⚠️ Giá trị phút hoãn không hợp lệ: \`${minutesRaw || '(rỗng)'}\`.`,
      );
      return;
    }

    const minutes = this.parsePositiveInteger(minutesRaw);
    if (!minutes) {
      await ctx.ephemeralSend(
        `⚠️ \`${minutesRaw}\` không phải số phút hợp lệ.`,
      );
      return;
    }

    if (minutes > MAX_CUSTOM_SNOOZE_MINUTES) {
      await ctx.ephemeralSend(
        `⚠️ Tối đa hoãn ${Math.floor(MAX_CUSTOM_SNOOZE_MINUTES / (24 * 60))} ngày.`,
      );
      return;
    }

    const nextAt = await this.schedulesService.snooze(scheduleId, minutes);
    await this.safeDeleteEphemeral(ctx);

    if (!nextAt) {
      await ctx.ephemeralSend(
        `ℹ️ Lịch #${scheduleId} đã được xử lý nên không hoãn nữa.`,
      );
      return;
    }

    await ctx.ephemeralSend(
      `⏰ Đã hoãn nhắc lịch #${scheduleId} thêm **${minutes} phút**.\n` +
        `Sẽ nhắc lại lúc: \`${this.dateParser.formatVietnam(nextAt)}\``,
    );
  }

  private async handleCustomCancel(ctx: ButtonInteractionContext): Promise<void> {
    await this.safeDeleteEphemeral(ctx);
  }

  private async handleDone(
    ctx: ButtonInteractionContext,
    schedule: Schedule,
  ): Promise<void> {
    const now = new Date();
    await this.schedulesService.markCompleted(schedule.id, now);

    let message =
      `🎉 Đã đánh dấu **hoàn thành** lịch #${schedule.id}!`;

    if (
      schedule.recurrence_type === 'daily' ||
      schedule.recurrence_type === 'weekly' ||
      schedule.recurrence_type === 'monthly'
    ) {
      const next = await this.schedulesService.spawnNextIfRecurring(schedule, now);
      if (next) {
        message +=
          `\n🔁 Đã tạo lịch lặp kế tiếp #${next.id} ` +
          `(${this.dateParser.formatVietnam(next.start_time)}).`;
      }
    }

    await this.safeDelete(ctx);
    await ctx.send(message);
  }

  private async handleLater(
    ctx: ButtonInteractionContext,
    scheduleId: number,
  ): Promise<void> {
    await this.safeDelete(ctx);
    await ctx.send(
      `📋 Đã đóng thông báo lịch #${scheduleId}.\n` +
        `Khi nào xong nhớ gõ \`*hoan-thanh ${scheduleId}\` để đánh dấu hoàn thành nhé.`,
    );
  }

  private async handleMissingSchedule(
    ctx: ButtonInteractionContext,
    actionType: string,
    scheduleId: number,
  ): Promise<void> {
    await this.deleteByAction(ctx, actionType);
    await this.replyByAction(
      ctx,
      actionType,
      `❌ Không tìm thấy lịch #${scheduleId} (có thể đã bị xóa).`,
    );
  }

  private async deleteByAction(
    ctx: ButtonInteractionContext,
    actionType: string,
  ): Promise<void> {
    if (this.isCustomFormAction(actionType)) {
      await this.safeDeleteEphemeral(ctx);
      return;
    }
    await this.safeDelete(ctx);
  }

  private async replyByAction(
    ctx: ButtonInteractionContext,
    actionType: string,
    text: string,
  ): Promise<void> {
    if (this.isCustomFormAction(actionType)) {
      await ctx.ephemeralSend(text);
      return;
    }
    await ctx.send(text);
  }

  private isCustomFormAction(actionType: string): boolean {
    return actionType === 'csub' || actionType === 'ccancel';
  }

  private parsePositiveInteger(raw: string | undefined): number | null {
    if (!raw || !/^\d+$/.test(raw)) return null;
    const value = Number(raw);
    return Number.isInteger(value) && value > 0 ? value : null;
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
