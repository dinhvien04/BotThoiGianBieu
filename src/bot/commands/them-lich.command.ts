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
import { ScheduleItemType } from '../../schedules/entities/schedule.entity';

const INTERACTION_ID = 'them-lich';

const ITEM_TYPES: Array<{ label: string; value: ScheduleItemType }> = [
  { label: '📝 Task (công việc)', value: 'task' },
  { label: '👥 Meeting (họp)', value: 'meeting' },
  { label: '🎉 Event (sự kiện)', value: 'event' },
  { label: '🔔 Reminder (nhắc nhở)', value: 'reminder' },
];

@Injectable()
export class ThemLichCommand implements BotCommand, InteractionHandler, OnModuleInit {
  readonly name = 'them-lich';
  readonly description = 'Thêm lịch mới';
  readonly category = '✏️ QUẢN LÝ LỊCH';
  readonly syntax = 'them-lich';
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
    // Yêu cầu user đã khởi tạo bằng *batdau trước
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(
        `⚠️ Bạn chưa khởi tạo tài khoản.\n` +
          `Vui lòng dùng lệnh \`${ctx.prefix}batdau\` trước khi thêm lịch.`,
      );
      return;
    }

    const now = new Date();
    const defaultStart = new Date(now.getTime() + 60 * 60 * 1000); // +1h
    const defaultStartStr = this.toDatetimeLocal(defaultStart);

    const embed = new InteractiveBuilder('📋 THÊM LỊCH MỚI')
      .setDescription(
        'Điền thông tin bên dưới, sau đó bấm **Xác nhận** để lưu hoặc **Hủy** để bỏ qua.',
      )
      .addInputField('title', '📌 Tiêu đề *', 'Vd: Họp team sprint review', {}, 'Bắt buộc')
      .addInputField(
        'description',
        '📝 Mô tả',
        'Mô tả chi tiết (tuỳ chọn)',
        { textarea: true },
        'Tuỳ chọn',
      )
      .addSelectField(
        'item_type',
        '🏷️ Loại lịch',
        ITEM_TYPES,
        ITEM_TYPES[0],
        'Mặc định: Task',
      )
      .addInputField(
        'start_time',
        '⏰ Bắt đầu *',
        'YYYY-MM-DDTHH:MM (vd: 2026-04-25T09:00)',
        { type: 'datetime-local', defaultValue: defaultStartStr },
        'Bắt buộc — giờ Việt Nam',
      )
      .addInputField(
        'end_time',
        '⏱️ Kết thúc',
        'Tuỳ chọn (YYYY-MM-DDTHH:MM)',
        { type: 'datetime-local' },
        'Tuỳ chọn',
      )
      .build();

    const buttons = new ButtonBuilder()
      .addButton(`${INTERACTION_ID}:confirm`, '✅ Xác nhận', EButtonMessageStyle.SUCCESS)
      .addButton(`${INTERACTION_ID}:cancel`, '❌ Hủy', EButtonMessageStyle.DANGER)
      .build();

    await this.botService.sendInteractive(ctx.message.channel_id, embed, buttons);
  }

  // ================ BUTTON INTERACTION ================

  async handleButton(ctx: ButtonInteractionContext): Promise<void> {
    if (ctx.action === 'cancel') {
      await this.closeForm(ctx);
      await ctx.send(`❌ Đã hủy thêm lịch.`);
      return;
    }

    if (ctx.action !== 'confirm') {
      return;
    }

    const { formData, clickerId } = ctx;

    const title = formData.title?.trim();
    const description = formData.description?.trim() || null;
    const itemTypeRaw = formData.item_type?.trim() || 'task';
    const startRaw = formData.start_time?.trim();
    const endRaw = formData.end_time?.trim();

    // ===== Validate =====
    const validationError = this.validate(title, itemTypeRaw, startRaw, endRaw);
    if (validationError) {
      await this.closeForm(ctx);
      await ctx.send(
        `${validationError}\n\n💡 Gõ lại \`*them-lich\` để thử lại.`,
      );
      return;
    }
    const itemType = itemTypeRaw as ScheduleItemType;
    const startTime = this.dateParser.parseVietnamLocal(startRaw)!;
    const endTime = endRaw ? this.dateParser.parseVietnamLocal(endRaw) : null;

    // ===== User settings để tính remind_at =====
    const user = await this.usersService.findByUserId(clickerId);
    if (!user) {
      await this.closeForm(ctx);
      await ctx.send(
        `⚠️ Bạn chưa khởi tạo tài khoản.\n` +
          `Vui lòng dùng lệnh \`*batdau\` trước khi thêm lịch.`,
      );
      return;
    }
    const remindMinutes = user.settings?.default_remind_minutes ?? 30;
    const idealRemindAt = new Date(startTime.getTime() - remindMinutes * 60 * 1000);
    // Nếu thời điểm remind mặc định đã trôi qua (vd: user tạo lịch sát giờ),
    // ping ngay — cron chạy mỗi phút sẽ gửi lần đầu trong vòng 1 phút.
    const remindAt = idealRemindAt.getTime() > Date.now() ? idealRemindAt : new Date();

    // ===== Lưu DB =====
    const schedule = await this.schedulesService.create({
      user_id: clickerId,
      item_type: itemType,
      title: title!,
      description,
      start_time: startTime,
      end_time: endTime,
      remind_at: remindAt,
    });

    // Tắt form trước khi gửi thông báo
    await this.closeForm(ctx);

    const typeLabel = ITEM_TYPES.find((t) => t.value === itemType)?.label ?? itemType;
    const lines: string[] = [
      `✅ ĐÃ THÊM LỊCH THÀNH CÔNG!`,
      ``,
      `🆔 ID: \`${schedule.id}\``,
      `📌 Tiêu đề: ${schedule.title}`,
      `🏷️ Loại: ${typeLabel}`,
      `⏰ Bắt đầu: \`${this.dateParser.formatVietnam(startTime)}\``,
    ];
    if (endTime) {
      lines.push(`⏱️ Kết thúc: \`${this.dateParser.formatVietnam(endTime)}\``);
    }
    if (description) {
      lines.push(`📝 Mô tả: ${description}`);
    }
    if (remindAt.getTime() > Date.now()) {
      lines.push(
        `🔔 Sẽ nhắc lúc: \`${this.dateParser.formatVietnam(remindAt)}\` (trước ${remindMinutes} phút)`,
      );
    } else {
      lines.push(`🔔 Sẽ nhắc ngay (thời gian sát quá, cron sẽ ping trong 1 phút tới).`);
    }

    await ctx.send(lines.join('\n'));
  }

  /** Validate input, trả về message lỗi đầu tiên gặp phải, hoặc null nếu OK. */
  private validate(
    title: string | undefined,
    itemTypeRaw: string,
    startRaw: string | undefined,
    endRaw: string | undefined,
  ): string | null {
    if (!title) {
      return `❌ Thiếu tiêu đề.`;
    }
    if (!this.isValidItemType(itemTypeRaw)) {
      return `❌ Loại lịch không hợp lệ: \`${itemTypeRaw}\`.`;
    }
    const startTime = this.dateParser.parseVietnamLocal(startRaw);
    if (!startTime) {
      return `❌ Thời gian bắt đầu không hợp lệ: \`${startRaw ?? ''}\`.`;
    }
    if (startTime.getTime() <= Date.now()) {
      return `❌ Thời gian bắt đầu phải ở tương lai.`;
    }
    if (endRaw) {
      const endTime = this.dateParser.parseVietnamLocal(endRaw);
      if (!endTime) {
        return `❌ Thời gian kết thúc không hợp lệ: \`${endRaw}\`.`;
      }
      if (endTime.getTime() <= startTime.getTime()) {
        return `❌ Thời gian kết thúc phải sau thời gian bắt đầu.`;
      }
    }
    return null;
  }

  /** Xóa message chứa form; nuốt lỗi nếu SDK không cho xóa (permission, đã xóa, v.v.). */
  private async closeForm(ctx: ButtonInteractionContext): Promise<void> {
    try {
      await ctx.deleteForm();
    } catch {
      // Không đẩy lỗi ra ngoài — đóng form là best-effort UX.
    }
  }

  // ================ Helpers ================

  /** Convert Date (UTC) → "YYYY-MM-DDTHH:MM" giờ VN cho default của datetime-local. */
  private toDatetimeLocal(date: Date): string {
    const vn = new Date(date.getTime() + 7 * 60 * 60 * 1000);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${vn.getUTCFullYear()}-${pad(vn.getUTCMonth() + 1)}-${pad(vn.getUTCDate())}` +
      `T${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`
    );
  }

  private isValidItemType(v: string): v is ScheduleItemType {
    return ['task', 'meeting', 'event', 'reminder'].includes(v);
  }
}
