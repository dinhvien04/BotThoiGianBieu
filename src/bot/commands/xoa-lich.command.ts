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
import { SchedulesService } from '../../schedules/schedules.service';
import { DateParser } from '../../shared/utils/date-parser';
import { Schedule } from '../../schedules/entities/schedule.entity';
import { findItemTypeOption } from '../../schedules/schedules.constants';

const INTERACTION_ID = 'xoa-lich';

@Injectable()
export class XoaLichCommand implements BotCommand, InteractionHandler, OnModuleInit {
  readonly name = 'xoa-lich';
  readonly description = 'Xóa lịch';
  readonly category = '✏️ QUẢN LÝ LỊCH';
  readonly syntax = 'xoa-lich <ID>';
  readonly example = 'xoa-lich 123';
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
        `⚠️ Cú pháp: \`${ctx.prefix}xoa-lich <ID>\`.\n` +
          `Vd: \`${ctx.prefix}xoa-lich 5\``,
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

    const schedule = await this.schedulesService.findById(id, ctx.message.sender_id);
    if (!schedule) {
      await ctx.reply(
        `❌ Không tìm thấy lịch \`#${id}\` — có thể đã bị xóa hoặc không phải của bạn.`,
      );
      return;
    }

    await this.renderConfirmForm(ctx.message.channel_id, schedule);
  }

  // ================ BUTTON INTERACTION ================

  async handleButton(ctx: ButtonInteractionContext): Promise<void> {
    const [actionType, idStr] = ctx.action.split(':');
    const scheduleId = Number(idStr);
    if (!scheduleId || Number.isNaN(scheduleId)) return;

    if (actionType === 'cancel') {
      await this.closeForm(ctx);
      await ctx.send(`❌ Đã hủy xóa lịch \`#${scheduleId}\`.`);
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
      await ctx.send(`⚠️ Bạn không có quyền xóa lịch này.`);
      return;
    }

    await this.schedulesService.delete(scheduleId);
    await this.closeForm(ctx);
    await ctx.send(
      `🗑️ Đã xóa lịch \`#${scheduleId}\` — **${schedule.title}**.\n` +
        `_Lịch đã bị xóa vĩnh viễn khỏi hệ thống._`,
    );
  }

  // ================ FORM RENDERING ================

  private async renderConfirmForm(channelId: string, schedule: Schedule): Promise<void> {
    const typeLabel = findItemTypeOption(schedule.item_type)?.label ?? schedule.item_type;

    const builder = new InteractiveBuilder(`🗑️ XÓA LỊCH #${schedule.id}?`)
      .setDescription(
        `⚠️ Bạn có chắc muốn xóa lịch này? Hành động này **không thể hoàn tác**.`,
      )
      .addField('📌 Tiêu đề', schedule.title, false)
      .addField('🏷️ Loại', typeLabel, true)
      .addField('📊 Trạng thái', this.formatStatus(schedule.status), true)
      .addField('⏰ Bắt đầu', this.dateParser.formatVietnam(schedule.start_time), false);

    if (schedule.end_time) {
      builder.addField('⏱️ Kết thúc', this.dateParser.formatVietnam(schedule.end_time), false);
    }
    if (schedule.description) {
      builder.addField('📝 Mô tả', schedule.description, false);
    }

    const buttons = new ButtonBuilder()
      .addButton(
        `${INTERACTION_ID}:confirm:${schedule.id}`,
        '🗑️ Xác nhận xóa',
        EButtonMessageStyle.DANGER,
      )
      .addButton(
        `${INTERACTION_ID}:cancel:${schedule.id}`,
        '↩️ Hủy',
        EButtonMessageStyle.SECONDARY,
      )
      .build();

    await this.botService.sendInteractive(channelId, builder.build(), buttons);
  }

  // ================ HELPERS ================

  private formatStatus(status: string): string {
    const map: Record<string, string> = {
      pending: '⏳ Đang chờ',
      completed: '✅ Hoàn thành',
      cancelled: '❌ Đã hủy',
    };
    return map[status] ?? status;
  }

  private parseId(raw: string | undefined): number | null {
    if (!raw) return null;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  }

  private async closeForm(ctx: ButtonInteractionContext): Promise<void> {
    try {
      await ctx.deleteForm();
    } catch {
      // best-effort
    }
  }
}
