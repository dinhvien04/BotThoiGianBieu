import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ScheduleStatistics,
  SchedulesService,
} from '../../schedules/schedules.service';
import { UsersService } from '../../users/users.service';
import { startOfDay, endOfDay, addDays } from '../../shared/utils/date-utils';
import { findItemTypeOption } from '../../schedules/schedules.constants';
import { CommandRegistry } from './command-registry';
import { BotCommand, CommandContext } from './command.types';

type StatRange = 'tuan' | 'thang' | 'nam' | 'all';

const RANGE_LABELS: Record<StatRange, string> = {
  tuan: '7 ngày qua',
  thang: '30 ngày qua',
  nam: '365 ngày qua',
  all: 'toàn bộ lịch sử',
};

const RANGE_ALIASES: Record<string, StatRange> = {
  tuan: 'tuan',
  week: 'tuan',
  w: 'tuan',
  thang: 'thang',
  month: 'thang',
  m: 'thang',
  nam: 'nam',
  year: 'nam',
  y: 'nam',
  all: 'all',
  tat: 'all',
  'tat-ca': 'all',
  'tatca': 'all',
};

@Injectable()
export class ThongKeCommand implements BotCommand, OnModuleInit {
  readonly name = 'thong-ke';
  readonly aliases = ['thongke', 'stats', 'statistics'];
  readonly description = 'Thống kê lịch (completion rate, giờ bận nhất, ...)';
  readonly category = '📅 XEM LỊCH';
  readonly syntax = 'thong-ke [tuan|thang|nam|all]';
  readonly example = 'thong-ke thang';

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(
        `⚠️ Bạn chưa khởi tạo tài khoản.\n` +
          `Vui lòng dùng lệnh \`${ctx.prefix}batdau\` trước.`,
      );
      return;
    }

    const rawRange = ctx.args[0]?.trim().toLowerCase();
    let range: StatRange = 'thang';
    if (rawRange) {
      const mapped = RANGE_ALIASES[rawRange];
      if (!mapped) {
        await ctx.reply(
          `⚠️ Khoảng thống kê không hợp lệ: \`${rawRange}\`.\n` +
            `Cú pháp: \`${ctx.prefix}thong-ke [tuan|thang|nam|all]\`.`,
        );
        return;
      }
      range = mapped;
    }

    const now = new Date();
    const { start, end } = this.computeRange(range, now);
    const stats = await this.schedulesService.getStatistics(
      user.user_id,
      start,
      end,
      now,
    );

    await ctx.reply(this.formatStatistics(stats, range));
  }

  private computeRange(
    range: StatRange,
    now: Date,
  ): { start: Date | null; end: Date | null } {
    if (range === 'all') return { start: null, end: null };
    const days = range === 'tuan' ? 7 : range === 'thang' ? 30 : 365;
    return {
      start: startOfDay(addDays(now, -days + 1)),
      end: endOfDay(now),
    };
  }

  private formatStatistics(stats: ScheduleStatistics, range: StatRange): string {
    const lines: string[] = [];
    lines.push(`📊 THỐNG KÊ LỊCH — ${RANGE_LABELS[range]}`);
    lines.push('');

    if (stats.total === 0) {
      lines.push(`Không có lịch nào trong khoảng này.`);
      if (stats.recurringActiveCount > 0) {
        lines.push('');
        lines.push(`🔁 Lịch lặp đang hoạt động: \`${stats.recurringActiveCount}\``);
      }
      return lines.join('\n');
    }

    lines.push(`📦 Tổng số lịch: \`${stats.total}\``);
    lines.push(`   • ⏳ Đang chờ: \`${stats.byStatus.pending}\``);
    lines.push(`   • ✅ Hoàn thành: \`${stats.byStatus.completed}\``);
    lines.push(`   • ❌ Đã hủy: \`${stats.byStatus.cancelled}\``);

    const finished = stats.byStatus.completed + stats.byStatus.cancelled;
    if (finished > 0) {
      const rate = (stats.byStatus.completed / finished) * 100;
      lines.push('');
      lines.push(
        `🎯 Tỉ lệ hoàn thành: **${rate.toFixed(1)}%** ` +
          `(${stats.byStatus.completed}/${finished} lịch đã chốt)`,
      );
    }

    const typeEntries = (Object.entries(stats.byItemType) as [
      keyof typeof stats.byItemType,
      number,
    ][])
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1]);
    if (typeEntries.length > 0) {
      lines.push('');
      lines.push(`🏷️ Theo loại:`);
      for (const [type, count] of typeEntries) {
        const label = findItemTypeOption(type)?.label ?? type;
        lines.push(`   • ${label}: \`${count}\``);
      }
    }

    if (stats.topHours.length > 0) {
      lines.push('');
      lines.push(`⏰ Top giờ bận nhất:`);
      for (const { hour, count } of stats.topHours) {
        const slot = `${this.pad(hour)}:00 – ${this.pad((hour + 1) % 24)}:00`;
        lines.push(`   • \`${slot}\` — ${count} lịch`);
      }
    }

    lines.push('');
    lines.push(`🔁 Lịch lặp đang hoạt động: \`${stats.recurringActiveCount}\``);

    return lines.join('\n');
  }

  private pad(value: number): string {
    return value.toString().padStart(2, '0');
  }
}
