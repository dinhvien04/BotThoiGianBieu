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
import {
  RecurrenceType,
  SchedulePriority,
  ScheduleItemType,
} from '../../schedules/entities/schedule.entity';
import {
  findItemTypeOption,
  isValidItemType,
  ITEM_TYPES,
} from '../../schedules/schedules.constants';
import {
  formatRecurrence,
  parseRecurrenceType,
  RECURRENCE_TYPE_OPTIONS,
} from '../../shared/utils/recurrence';
import {
  formatPriority,
  parsePriority,
  PRIORITY_OPTIONS,
} from '../../shared/utils/priority';

const INTERACTION_ID = 'them-lich';

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
    const defaultStart = now;
    const defaultEnd = new Date(now.getTime() + 60 * 60 * 1000); // +1h duration

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
        'start_date',
        '📅 Ngày bắt đầu *',
        'Chọn ngày bắt đầu',
        { type: 'date', defaultValue: this.dateParser.toDateInputVietnam(defaultStart) },
        'Bắt buộc',
      )
      .addInputField(
        'start_time',
        '⏰ Giờ bắt đầu *',
        'Chọn giờ bắt đầu',
        { type: 'time', defaultValue: this.dateParser.formatVietnamTime(defaultStart) },
        'Bắt buộc — giờ Việt Nam',
      )
      .addInputField(
        'end_date',
        '📅 Ngày kết thúc *',
        'Chọn ngày kết thúc',
        { type: 'date', defaultValue: this.dateParser.toDateInputVietnam(defaultEnd) },
        'Bắt buộc',
      )
      .addInputField(
        'end_time',
        '⏱️ Giờ kết thúc *',
        'Chọn giờ kết thúc',
        { type: 'time', defaultValue: this.dateParser.formatVietnamTime(defaultEnd) },
        'Bắt buộc — phải sau giờ bắt đầu',
      )
      .addSelectField(
        'priority',
        '⚡ Ưu tiên',
        PRIORITY_OPTIONS,
        PRIORITY_OPTIONS[1],
        'Mặc định: Vừa',
      )
      .addSelectField(
        'recurrence_type',
        '🔁 Lặp lại',
        RECURRENCE_TYPE_OPTIONS,
        RECURRENCE_TYPE_OPTIONS[0],
        'Mặc định: Không lặp',
      )
      .addInputField(
        'recurrence_interval',
        '🔢 Khoảng lặp',
        '1',
        { type: 'number', defaultValue: '1' },
        'Chỉ áp dụng khi chọn lặp. Vd 2 = mỗi 2 ngày/tuần/tháng.',
      )
      .addInputField(
        'recurrence_until',
        '🛑 Dừng lặp sau ngày',
        'Chọn ngày (tuỳ chọn)',
        { type: 'date' },
        'Tuỳ chọn — để trống = lặp vô hạn. Chỉ áp dụng khi chọn lặp.',
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
    const priorityRaw = formData.priority?.trim() || 'normal';
    const startDateRaw = formData.start_date?.trim();
    const startTimeRaw = formData.start_time?.trim();
    const endDateRaw = formData.end_date?.trim();
    const endTimeRaw = formData.end_time?.trim();
    const recurrenceTypeRaw = formData.recurrence_type?.trim() || 'none';
    const recurrenceIntervalRaw = formData.recurrence_interval?.trim() || '1';
    const recurrenceUntilRaw = formData.recurrence_until?.trim() || '';

    // ===== Validate + parse (parse chỉ 1 lần để tái sử dụng) =====
    const validation = this.validate(
      title,
      itemTypeRaw,
      priorityRaw,
      startDateRaw,
      startTimeRaw,
      endDateRaw,
      endTimeRaw,
      recurrenceTypeRaw,
      recurrenceIntervalRaw,
      recurrenceUntilRaw,
    );
    if (validation.error) {
      await this.closeForm(ctx);
      await ctx.send(
        `${validation.error}\n\n💡 Gõ lại \`*them-lich\` để thử lại.`,
      );
      return;
    }
    const itemType = itemTypeRaw as ScheduleItemType;
    const priority = validation.priority!;
    const startTime = validation.startTime!;
    const endTime = validation.endTime!;
    const recurrenceType = validation.recurrenceType!;
    const recurrenceInterval = validation.recurrenceInterval!;
    const recurrenceUntil = validation.recurrenceUntil ?? null;

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
      priority,
      recurrence_type: recurrenceType,
      recurrence_interval: recurrenceInterval,
      recurrence_until: recurrenceUntil,
    });

    // Tắt form trước khi gửi thông báo
    await this.closeForm(ctx);

    const typeLabel = findItemTypeOption(itemType)?.label ?? itemType;
    const lines: string[] = [
      `✅ ĐÃ THÊM LỊCH THÀNH CÔNG!`,
      ``,
      `🆔 ID: \`${schedule.id}\``,
      `📌 Tiêu đề: ${schedule.title}`,
      `🏷️ Loại: ${typeLabel}`,
      `⚡ Ưu tiên: ${formatPriority(priority)}`,
      `⏰ Bắt đầu: \`${this.dateParser.formatVietnam(startTime)}\``,
    ];
    lines.push(`⏱️ Kết thúc: \`${this.dateParser.formatVietnam(endTime)}\``);
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
    if (recurrenceType !== 'none') {
      lines.push(
        `🔁 Lặp: ${formatRecurrence(recurrenceType, recurrenceInterval)}`,
      );
      if (recurrenceUntil) {
        lines.push(
          `🛑 Dừng lặp sau: \`${this.dateParser.formatVietnam(recurrenceUntil, false)}\``,
        );
      }
    }

    await ctx.send(lines.join('\n'));
  }

  /**
   * Validate input + parse datetime 1 lần duy nhất. Trả:
   *   - `error`: message lỗi đầu tiên (nếu có)
   *   - `startTime`, `endTime`: đã parse (khi hợp lệ)
   */
  private validate(
    title: string | undefined,
    itemTypeRaw: string,
    priorityRaw: string,
    startDateRaw: string | undefined,
    startTimeRaw: string | undefined,
    endDateRaw: string | undefined,
    endTimeRaw: string | undefined,
    recurrenceTypeRaw: string,
    recurrenceIntervalRaw: string,
    recurrenceUntilRaw: string,
  ): {
    error?: string;
    startTime?: Date;
    endTime?: Date;
    priority?: SchedulePriority;
    recurrenceType?: RecurrenceType;
    recurrenceInterval?: number;
    recurrenceUntil?: Date | null;
  } {
    if (!title) {
      return { error: `❌ Thiếu tiêu đề.` };
    }
    if (!isValidItemType(itemTypeRaw)) {
      return { error: `❌ Loại lịch không hợp lệ: \`${itemTypeRaw}\`.` };
    }
    const priority = parsePriority(priorityRaw);
    if (!priority) {
      return { error: `❌ Ưu tiên không hợp lệ: \`${priorityRaw}\`.` };
    }
    const startRaw = this.combineDateTime(startDateRaw, startTimeRaw);
    if (!startRaw) {
      return { error: `❌ Thiếu ngày hoặc giờ bắt đầu.` };
    }
    const startTime = this.dateParser.parseVietnamLocal(startRaw);
    if (!startTime) {
      return {
        error: `❌ Thời gian bắt đầu không hợp lệ: \`${startRaw ?? ''}\`.`,
      };
    }
    if (startTime.getTime() <= Date.now()) {
      return { error: `❌ Thời gian bắt đầu phải ở tương lai.` };
    }
    const endRaw = this.combineDateTime(endDateRaw, endTimeRaw);
    if (!endRaw) {
      return { error: `❌ Thiếu ngày hoặc giờ kết thúc.` };
    }
    const endTime = this.dateParser.parseVietnamLocal(endRaw);
    if (!endTime) {
      return {
        error: `❌ Thời gian kết thúc không hợp lệ: \`${endRaw}\`.`,
      };
    }
    if (endTime.getTime() <= startTime.getTime()) {
      return {
        error: `❌ Thời gian kết thúc phải sau thời gian bắt đầu.`,
      };
    }

    const recurrenceType = parseRecurrenceType(recurrenceTypeRaw);
    if (!recurrenceType) {
      return {
        error: `❌ Kiểu lặp không hợp lệ: \`${recurrenceTypeRaw}\`.`,
      };
    }

    let recurrenceInterval = 1;
    let recurrenceUntil: Date | null = null;
    if (recurrenceType !== 'none') {
      const parsedInterval = Number.parseInt(recurrenceIntervalRaw, 10);
      if (
        !Number.isFinite(parsedInterval) ||
        parsedInterval < 1 ||
        String(parsedInterval) !== recurrenceIntervalRaw.replace(/^0+(?=\d)/, '')
      ) {
        return {
          error: `❌ Khoảng lặp không hợp lệ: \`${recurrenceIntervalRaw}\` (phải là số nguyên ≥ 1).`,
        };
      }
      recurrenceInterval = parsedInterval;

      if (recurrenceUntilRaw) {
        const parsedUntil = this.dateParser.parseVietnamLocal(
          `${recurrenceUntilRaw} 23:59`,
        );
        if (!parsedUntil) {
          return {
            error: `❌ Ngày dừng lặp không hợp lệ: \`${recurrenceUntilRaw}\`.`,
          };
        }
        if (parsedUntil.getTime() <= startTime.getTime()) {
          return {
            error: `❌ Ngày dừng lặp phải SAU ngày bắt đầu.`,
          };
        }
        recurrenceUntil = parsedUntil;
      }
    }

    return {
      startTime,
      endTime,
      priority,
      recurrenceType,
      recurrenceInterval,
      recurrenceUntil,
    };
  }

  private combineDateTime(dateRaw: string | undefined, timeRaw: string | undefined): string | null {
    const date = dateRaw?.trim();
    const time = timeRaw?.trim();
    if (!date || !time) return null;
    return `${date} ${time}`;
  }

  /** Xóa message chứa form; nuốt lỗi nếu SDK không cho xóa (permission, đã xóa, v.v.). */
  private async closeForm(ctx: ButtonInteractionContext): Promise<void> {
    try {
      await ctx.deleteForm();
    } catch {
      // Không đẩy lỗi ra ngoài — đóng form là best-effort UX.
    }
  }

}
