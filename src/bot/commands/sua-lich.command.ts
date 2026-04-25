import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ButtonBuilder,
  EButtonMessageStyle,
  InteractiveBuilder,
} from 'mezon-sdk';
import { BotService } from '../bot.service';
import { CommandRegistry } from './command-registry';
import { BotCommand, CommandContext } from './command.types';
import { InteractionRegistry } from '../interactions/interaction-registry';
import {
  ButtonInteractionContext,
  InteractionHandler,
} from '../interactions/interaction.types';
import { UsersService } from '../../users/users.service';
import {
  SchedulesService,
  UpdateSchedulePatch,
} from '../../schedules/schedules.service';
import { DateParser } from '../../shared/utils/date-parser';
import {
  Schedule,
  ScheduleItemType,
} from '../../schedules/entities/schedule.entity';
import {
  findItemTypeOption,
  isValidItemType,
  ITEM_TYPES,
} from '../../schedules/schedules.constants';

const INTERACTION_ID = 'sua-lich';

@Injectable()
export class SuaLichCommand implements BotCommand, InteractionHandler, OnModuleInit {
  readonly name = 'sua-lich';
  readonly description = 'Chỉnh sửa lịch';
  readonly category = '✏️ QUẢN LÝ LỊCH';
  readonly syntax = 'sua-lich <ID>';
  readonly example = 'sua-lich 123';
  readonly interactionId = INTERACTION_ID;

  constructor(
    private readonly commandRegistry: CommandRegistry,
    private readonly interactionRegistry: InteractionRegistry,
    private readonly botService: BotService,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly dateParser: DateParser,
  ) {}

  onModuleInit(): void {
    this.commandRegistry.register(this);
    this.interactionRegistry.register(this);
  }

  // ================ TEXT COMMAND ================

  async execute(ctx: CommandContext): Promise<void> {
    const id = this.parseId(ctx.args[0]);
    if (id === null) {
      await ctx.reply(
        `⚠️ Cú pháp: \`${ctx.prefix}sua-lich <ID>\`.\n` +
          `Vd: \`${ctx.prefix}sua-lich 5\``,
      );
      return;
    }

    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(
        `⚠️ Bạn chưa khởi tạo tài khoản.\n` +
          `Vui lòng dùng lệnh \`${ctx.prefix}batdau\` trước.`,
      );
      return;
    }

    // findById với userId để verify ownership ở tầng DB luôn
    const schedule = await this.schedulesService.findById(id, ctx.message.sender_id);
    if (!schedule) {
      await ctx.reply(
        `❌ Không tìm thấy lịch \`#${id}\` — có thể đã bị xóa hoặc không phải của bạn.`,
      );
      return;
    }

    await this.renderEditForm(ctx.message.channel_id, schedule);
  }

  // ================ BUTTON INTERACTION ================

  async handleButton(ctx: ButtonInteractionContext): Promise<void> {
    // action format: "cancel:<id>" | "confirm:<id>"
    const [actionType, idStr] = ctx.action.split(':');
    const scheduleId = Number(idStr);
    if (!scheduleId || Number.isNaN(scheduleId)) {
      return;
    }

    if (actionType === 'cancel') {
      await this.closeForm(ctx);
      await ctx.send(`❌ Đã hủy sửa lịch \`#${scheduleId}\`.`);
      return;
    }
    if (actionType !== 'confirm') return;

    const schedule = await this.schedulesService.findById(scheduleId);
    if (!schedule) {
      await this.closeForm(ctx);
      await ctx.send(`❌ Không tìm thấy lịch \`#${scheduleId}\` (có thể đã bị xóa).`);
      return;
    }
    if (schedule.user_id !== ctx.clickerId) {
      await ctx.send(`⚠️ Bạn không có quyền sửa lịch này.`);
      return;
    }

    const patch = this.buildPatch(ctx.formData, schedule);
    if (patch.error) {
      await this.closeForm(ctx);
      await ctx.send(
        `${patch.error}\n\n💡 Gõ lại \`*sua-lich ${scheduleId}\` để thử lại.`,
      );
      return;
    }

    if (Object.keys(patch.data).length === 0) {
      await this.closeForm(ctx);
      await ctx.send(`ℹ️ Không có thay đổi nào cho lịch \`#${scheduleId}\`.`);
      return;
    }

    // Nếu đổi start_time → recalc remind_at + reset ack
    if (patch.data.start_time) {
      const userSettings = (await this.usersService.findByUserId(ctx.clickerId))?.settings;
      const remindMinutes = userSettings?.default_remind_minutes ?? 30;
      const newStart = patch.data.start_time;
      const idealRemind = new Date(newStart.getTime() - remindMinutes * 60 * 1000);
      patch.data.remind_at = idealRemind.getTime() > Date.now() ? idealRemind : new Date();
      patch.data.acknowledged_at = null;
      patch.data.is_reminded = false;
    }

    // Nếu đổi end_time → reset end_notified_at
    if ('end_time' in patch.data) {
      patch.data.end_notified_at = null;
    }

    const updated = await this.schedulesService.update(scheduleId, patch.data);
    await this.closeForm(ctx);

    if (!updated) {
      await ctx.send(`❌ Lỗi khi cập nhật lịch \`#${scheduleId}\`.`);
      return;
    }

    await ctx.send(this.formatUpdateSummary(updated, patch.data));
  }

  // ================ FORM RENDERING ================

  private async renderEditForm(channelId: string, schedule: Schedule): Promise<void> {
    const endTime = schedule.end_time ?? schedule.start_time;
    const typeOption = findItemTypeOption(schedule.item_type) ?? ITEM_TYPES[0];

    const embed = new InteractiveBuilder(`✏️ SỬA LỊCH #${schedule.id}`)
      .setDescription(
        `Điều chỉnh các trường bên dưới rồi bấm **Xác nhận** để lưu (hoặc **Hủy** để bỏ qua).`,
      )
      .addInputField(
        'title',
        '📌 Tiêu đề *',
        'Tiêu đề mới',
        { defaultValue: schedule.title },
        'Bắt buộc',
      )
      .addInputField(
        'description',
        '📝 Mô tả',
        'Mô tả chi tiết (tuỳ chọn)',
        { textarea: true, defaultValue: schedule.description ?? '' },
        'Tuỳ chọn',
      )
      .addSelectField('item_type', '🏷️ Loại lịch', ITEM_TYPES, typeOption, 'Chọn loại lịch')
      .addInputField(
        'start_date',
        '📅 Ngày bắt đầu *',
        'Vd: 25/04/2026',
        { defaultValue: this.dateParser.formatVietnamDate(schedule.start_time) },
        'Bắt buộc',
      )
      .addInputField(
        'start_time',
        '⏰ Giờ bắt đầu *',
        'Vd: 09:00',
        { defaultValue: this.dateParser.formatVietnamTime(schedule.start_time) },
        'Bắt buộc — giờ Việt Nam',
      )
      .addInputField(
        'end_date',
        '📅 Ngày kết thúc *',
        'Vd: 25/04/2026',
        { defaultValue: this.dateParser.formatVietnamDate(endTime) },
        'Bắt buộc',
      )
      .addInputField(
        'end_time',
        '⏱️ Giờ kết thúc *',
        'Vd: 10:00',
        { defaultValue: this.dateParser.formatVietnamTime(endTime) },
        'Bắt buộc — phải sau giờ bắt đầu',
      )
      .build();

    const buttons = new ButtonBuilder()
      .addButton(
        `${INTERACTION_ID}:confirm:${schedule.id}`,
        '✅ Xác nhận',
        EButtonMessageStyle.SUCCESS,
      )
      .addButton(
        `${INTERACTION_ID}:cancel:${schedule.id}`,
        '❌ Hủy',
        EButtonMessageStyle.DANGER,
      )
      .build();

    await this.botService.sendInteractive(channelId, embed, buttons);
  }

  // ================ VALIDATION + PATCH BUILDING ================

  /**
   * Đọc formData + so sánh với giá trị hiện tại của `current` → trả về patch
   * chỉ chứa các field thực sự thay đổi. Nếu input không hợp lệ → error.
   */
  private buildPatch(
    formData: Record<string, string>,
    current: Schedule,
  ): { data: UpdateSchedulePatch; error?: string } {
    const data: UpdateSchedulePatch = {};

    const title = formData.title?.trim();
    if (title !== undefined) {
      if (!title) return { data, error: `❌ Thiếu tiêu đề.` };
      if (title !== current.title) data.title = title;
    }

    if (formData.description !== undefined) {
      const desc = formData.description.trim() || null;
      if (desc !== (current.description ?? null)) data.description = desc;
    }

    const itemTypeRaw = formData.item_type?.trim();
    if (itemTypeRaw) {
      if (!isValidItemType(itemTypeRaw)) {
        return { data, error: `❌ Loại lịch không hợp lệ: \`${itemTypeRaw}\`.` };
      }
      if (itemTypeRaw !== current.item_type) {
        data.item_type = itemTypeRaw as ScheduleItemType;
      }
    }

    const startRaw = this.combineDateTime(formData.start_date, formData.start_time);
    let newStart: Date | null = null;
    if (startRaw) {
      newStart = this.dateParser.parseVietnamLocal(startRaw);
      if (!newStart) {
        return { data, error: `❌ Thời gian bắt đầu không hợp lệ: \`${startRaw}\`.` };
      }
      if (newStart.getTime() !== current.start_time.getTime()) {
        if (newStart.getTime() <= Date.now()) {
          return { data, error: `❌ Thời gian bắt đầu mới phải ở tương lai.` };
        }
        data.start_time = newStart;
      }
    } else if (formData.start_date !== undefined || formData.start_time !== undefined) {
      return { data, error: `❌ Thiếu ngày hoặc giờ bắt đầu.` };
    }

    const endRaw = this.combineDateTime(formData.end_date, formData.end_time);
    if (endRaw) {
      const newEnd = this.dateParser.parseVietnamLocal(endRaw);
      if (!newEnd) {
        return { data, error: `❌ Thời gian kết thúc không hợp lệ: \`${endRaw}\`.` };
      }
      const startForCompare = data.start_time ?? current.start_time;
      if (newEnd.getTime() <= startForCompare.getTime()) {
        return {
          data,
          error: `❌ Thời gian kết thúc phải sau thời gian bắt đầu.`,
        };
      }
      if (!current.end_time || newEnd.getTime() !== current.end_time.getTime()) {
        data.end_time = newEnd;
      }
    } else if (formData.end_date !== undefined || formData.end_time !== undefined) {
      return { data, error: `❌ Thiếu ngày hoặc giờ kết thúc.` };
    }

    return { data };
  }

  // ================ FORMATTING ================

  private formatUpdateSummary(updated: Schedule, patch: UpdateSchedulePatch): string {
    const changes: string[] = [];
    if (patch.title !== undefined) changes.push(`📌 Tiêu đề → \`${updated.title}\``);
    if (patch.description !== undefined) {
      changes.push(`📝 Mô tả → ${updated.description ? `\`${updated.description}\`` : '_(rỗng)_'}`);
    }
    if (patch.item_type !== undefined) {
      const label = findItemTypeOption(updated.item_type)?.label ?? updated.item_type;
      changes.push(`🏷️ Loại → ${label}`);
    }
    if (patch.start_time !== undefined) {
      changes.push(`⏰ Bắt đầu → \`${this.dateParser.formatVietnam(updated.start_time)}\``);
    }
    if (patch.end_time !== undefined) {
      const val = updated.end_time
        ? `\`${this.dateParser.formatVietnam(updated.end_time)}\``
        : '_(bỏ)_';
      changes.push(`⏱️ Kết thúc → ${val}`);
    }

    const lines = [
      `✅ ĐÃ CẬP NHẬT LỊCH \`#${updated.id}\`!`,
      ``,
      ...changes,
    ];

    if (patch.start_time !== undefined && updated.remind_at) {
      lines.push('');
      lines.push(
        `🔔 Lịch sẽ nhắc lại lúc: \`${this.dateParser.formatVietnam(updated.remind_at)}\``,
      );
    }

    return lines.join('\n');
  }

  // ================ HELPERS ================

  private parseId(raw: string | undefined): number | null {
    if (!raw) return null;
    // Chỉ chấp nhận chuỗi digit thuần (không space, dấu, chữ, dấu chấm thập phân…)
    if (!/^\d+$/.test(raw)) return null;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private combineDateTime(dateRaw: string | undefined, timeRaw: string | undefined): string | null {
    const date = dateRaw?.trim();
    const time = timeRaw?.trim();
    if (!date || !time) return null;
    return `${date} ${time}`;
  }

  private async closeForm(ctx: ButtonInteractionContext): Promise<void> {
    try {
      await ctx.deleteForm();
    } catch {
      // best-effort
    }
  }
}
