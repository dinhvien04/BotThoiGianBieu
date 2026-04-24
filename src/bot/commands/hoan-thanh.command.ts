import { Injectable, OnModuleInit } from '@nestjs/common';
import { CommandRegistry } from './command-registry';
import { BotCommand, CommandContext } from './command.types';
import { UsersService } from '../../users/users.service';
import { SchedulesService } from '../../schedules/schedules.service';
import { DateParser } from '../../shared/utils/date-parser';
import { Schedule } from '../../schedules/entities/schedule.entity';

@Injectable()
export class HoanThanhCommand implements BotCommand, OnModuleInit {
  readonly name = 'hoan-thanh';
  readonly description = 'Đánh dấu hoàn thành công việc';
  readonly category = '✏️ QUẢN LÝ LỊCH';
  readonly syntax = 'hoan-thanh <ID>';
  readonly example = 'hoan-thanh 123';

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly dateParser: DateParser,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const id = this.parseId(ctx.args[0]);
    if (id === null) {
      await ctx.reply(
        `⚠️ Cú pháp: \`${ctx.prefix}hoan-thanh <ID>\`.\n` +
          `Vd: \`${ctx.prefix}hoan-thanh 5\``,
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

    if (schedule.status === 'completed') {
      await ctx.reply(
        `ℹ️ Lịch \`#${id}\` — **${schedule.title}** đã hoàn thành từ trước rồi.`,
      );
      return;
    }

    if (schedule.status === 'cancelled') {
      await ctx.reply(
        `❌ Lịch \`#${id}\` đã bị hủy, không thể đánh dấu hoàn thành.`,
      );
      return;
    }

    const now = new Date();
    await this.schedulesService.markCompleted(id, now);

    await ctx.reply(this.formatDoneMessage(schedule, now));
  }

  private formatDoneMessage(schedule: Schedule, now: Date): string {
    const lines: string[] = [
      `🎉 ĐÃ HOÀN THÀNH LỊCH \`#${schedule.id}\`!`,
      ``,
      `📌 ${schedule.title}`,
    ];

    const timingNote = this.buildTimingNote(schedule, now);
    if (timingNote) lines.push(timingNote);

    lines.push('');
    lines.push(`👏 Làm tốt lắm, tiếp tục phát huy nhé!`);

    return lines.join('\n');
  }

  /**
   * Phân tích user làm sớm/đúng giờ/trễ dựa trên `end_time` (hoặc
   * `start_time` nếu lịch không có end_time).
   */
  private buildTimingNote(schedule: Schedule, now: Date): string | null {
    if (schedule.end_time) {
      const diffMin = Math.round((now.getTime() - schedule.end_time.getTime()) / 60000);
      if (diffMin === 0) {
        return `⏱️ Hoàn thành đúng giờ kết thúc — chuẩn!`;
      }
      if (diffMin < 0) {
        return `⚡ Sớm hơn \`${this.dateParser.formatMinutes(diffMin)}\` so với giờ kết thúc.`;
      }
      return `⏱️ Trễ \`${this.dateParser.formatMinutes(diffMin)}\` so với giờ kết thúc.`;
    }

    // Không có end_time — so với start_time
    const diffMin = Math.round((now.getTime() - schedule.start_time.getTime()) / 60000);
    if (diffMin < 0) {
      return `⚡ Hoàn thành \`${this.dateParser.formatMinutes(diffMin)}\` trước cả giờ bắt đầu!`;
    }
    if (diffMin === 0) {
      return `⏱️ Hoàn thành ngay khi bắt đầu.`;
    }
    return `⏱️ Hoàn thành sau \`${this.dateParser.formatMinutes(diffMin)}\` kể từ giờ bắt đầu.`;
  }

  private parseId(raw: string | undefined): number | null {
    if (!raw) return null;
    // Chỉ chấp nhận chuỗi digit thuần (không space, dấu, chữ, dấu chấm thập phân…)
    if (!/^\d+$/.test(raw)) return null;
    const id = Number(raw);
    return Number.isInteger(id) && id > 0 ? id : null;
  }
}
