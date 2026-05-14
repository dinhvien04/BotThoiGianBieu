import { Injectable, OnModuleInit } from "@nestjs/common";
import { DateParser } from "../../shared/utils/date-parser";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import {
  formatRecurrence,
  parseRecurrenceType,
} from "../../shared/utils/recurrence";
import { RecurrenceType } from "../../schedules/entities/schedule.entity";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

interface ParsedArgs {
  type: RecurrenceType;
  interval: number;
  until: Date | null;
}

@Injectable()
export class LichLapCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-lap";
  readonly aliases = ["lichlap", "recur"];
  readonly description = "Bật lặp cho lịch (daily/weekly/monthly)";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "lich-lap <ID> <daily|weekly|monthly> [interval] [--den DD/MM/YYYY]";
  readonly example = "lich-lap 5 weekly 2 --den 31/12/2026";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly formatter: MessageFormatter,
    private readonly dateParser: DateParser,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(this.formatter.formatNotInitialized(ctx.prefix));
      return;
    }

    if (ctx.args.length < 2) {
      await ctx.reply(this.formatUsage(ctx.prefix));
      return;
    }

    const scheduleId = this.parsePositiveInteger(ctx.args[0]);
    if (!scheduleId) {
      await ctx.reply(
        `⚠️ ID không hợp lệ: \`${ctx.args[0]}\`.\nDùng: \`${ctx.prefix}${this.syntax}\``,
      );
      return;
    }

    const parsed = this.parseRecurrenceArgs(ctx.args.slice(1));
    if (!parsed.ok) {
      await ctx.reply(`⚠️ ${parsed.error}\nDùng: \`${ctx.prefix}${this.syntax}\``);
      return;
    }

    if (parsed.value.type === "none") {
      await ctx.reply(
        `⚠️ Không thể dùng \`none\` cho \`lich-lap\`. Dùng \`${ctx.prefix}bo-lap <ID>\` để tắt lặp.`,
      );
      return;
    }

    const schedule = await this.schedulesService.findById(scheduleId, user.user_id);
    if (!schedule) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${scheduleId} của bạn.`);
      return;
    }

    if (
      parsed.value.until &&
      parsed.value.until.getTime() <= schedule.start_time.getTime()
    ) {
      await ctx.reply(
        `⚠️ Ngày dừng lặp \`${this.dateParser.formatVietnam(parsed.value.until, false)}\` phải SAU ngày bắt đầu của lịch (\`${this.dateParser.formatVietnam(schedule.start_time, false)}\`).`,
      );
      return;
    }

    const updated = await this.schedulesService.setRecurrence(schedule.id, {
      type: parsed.value.type,
      interval: parsed.value.interval,
      until: parsed.value.until,
    });

    if (!updated) {
      await ctx.reply(`⚠️ Không cập nhật được lịch #${schedule.id}.`);
      return;
    }

    const lines = [
      `🔁 Đã bật lặp cho lịch #${schedule.id}`,
      `➤ Tiêu đề: ${schedule.title}`,
      `➤ Chu kỳ: ${formatRecurrence(parsed.value.type, parsed.value.interval)}`,
    ];
    if (parsed.value.until) {
      lines.push(`➤ Dừng lặp sau: ${this.dateParser.formatVietnam(parsed.value.until, false)}`);
    } else {
      lines.push(`➤ Dừng lặp sau: (không giới hạn)`);
    }
    lines.push(
      `ℹ️ Lịch mới sẽ tự tạo khi bạn đánh dấu hoàn thành instance hiện tại.`,
    );

    await ctx.reply(lines.join("\n"));
  }

  private formatUsage(prefix: string): string {
    return (
      `⚠️ Sai cú pháp.\nDùng: \`${prefix}${this.syntax}\`\n` +
      `Ví dụ:\n` +
      `  \`${prefix}${this.name} 5 daily\` — lặp hàng ngày\n` +
      `  \`${prefix}${this.name} 5 weekly 2\` — 2 tuần 1 lần\n` +
      `  \`${prefix}${this.example}\``
    );
  }

  private parseRecurrenceArgs(
    args: string[],
  ): { ok: true; value: ParsedArgs } | { ok: false; error: string } {
    const type = parseRecurrenceType(args[0] ?? "");
    if (!type) {
      return {
        ok: false,
        error: `Kiểu lặp không hợp lệ: \`${args[0] ?? ""}\`. Chấp nhận: daily / weekly / monthly (hoặc ngày / tuần / tháng).`,
      };
    }

    let interval = 1;
    let untilArg: string | null = null;
    const rest = args.slice(1);

    // Lấy --den (hoặc --until/-u) + value kế tiếp; còn lại là interval.
    const leftover: string[] = [];
    for (let i = 0; i < rest.length; i++) {
      const tok = rest[i];
      if (tok === "--den" || tok === "--until" || tok === "-u") {
        if (i + 1 >= rest.length) {
          return { ok: false, error: `Thiếu giá trị cho \`${tok}\`.` };
        }
        untilArg = rest[i + 1];
        i++;
      } else {
        leftover.push(tok);
      }
    }

    if (leftover.length > 1) {
      return {
        ok: false,
        error: `Quá nhiều tham số: \`${leftover.join(" ")}\`.`,
      };
    }
    if (leftover.length === 1) {
      const parsedInterval = this.parsePositiveInteger(leftover[0]);
      if (!parsedInterval) {
        return {
          ok: false,
          error: `Interval không hợp lệ: \`${leftover[0]}\`. Phải là số nguyên dương.`,
        };
      }
      interval = parsedInterval;
    }

    let until: Date | null = null;
    if (untilArg) {
      until = this.dateParser.parseVietnamLocal(untilArg);
      if (!until) {
        return {
          ok: false,
          error: `Ngày dừng lặp không hợp lệ: \`${untilArg}\`. Định dạng: \`DD/MM/YYYY\`.`,
        };
      }
    }

    return { ok: true, value: { type, interval, until } };
  }

  private parsePositiveInteger(input: string): number | null {
    if (!/^\d+$/.test(input)) return null;
    const value = Number(input);
    return Number.isInteger(value) && value > 0 ? value : null;
  }
}
