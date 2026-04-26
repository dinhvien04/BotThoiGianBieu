import { Injectable, OnModuleInit } from "@nestjs/common";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";
import { UsersService } from "../../users/users.service";
import { SchedulesService } from "../../schedules/schedules.service";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { generateIcs } from "../../shared/utils/ics-generator";
import { parseVietnameseDate } from "../../shared/utils/date-utils";

const DEFAULT_FORWARD_MONTHS = 12;
const MAX_INLINE_BYTES = 3500;

@Injectable()
export class ExportIcsCommand implements BotCommand, OnModuleInit {
  readonly name = "export-ics";
  readonly aliases = ["exportics", "ics", "export"];
  readonly description = "Xuất lịch ra file .ics (import vào Google/Apple Calendar)";
  readonly category = "📅 XEM LỊCH";
  readonly syntax = "export-ics [DD-MM-YYYY DD-MM-YYYY | tat-ca]";
  readonly example = "export-ics 1-1-2026 31-12-2026";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly formatter: MessageFormatter,
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

    const range = this.parseRange(ctx);
    if (range === "INVALID") {
      await ctx.reply(this.usageMessage(ctx.prefix));
      return;
    }

    const schedules = range
      ? await this.schedulesService.findByDateRange(
          user.user_id,
          range.start,
          range.end,
        )
      : await this.findAllByUser(user.user_id);

    if (schedules.length === 0) {
      await ctx.reply(
        `ℹ️ Không có lịch nào để xuất.` +
          (range ? ` Thử mở rộng khoảng thời gian.` : ""),
      );
      return;
    }

    const ics = generateIcs(schedules, {
      calendarName: `BotThoiGianBieu — ${user.user_id}`,
    });

    if (ics.length > MAX_INLINE_BYTES) {
      await ctx.reply(
        `⚠️ Có ${schedules.length} lịch — file ICS quá dài (${ics.length} bytes) để gửi trong 1 message.\n` +
          `💡 Hãy lọc bằng khoảng ngày: \`${ctx.prefix}export-ics 1-1-2026 31-12-2026\`.`,
      );
      return;
    }

    const header =
      `📤 Đã xuất ${schedules.length} lịch ra ICS.\n` +
      `Copy nội dung dưới vào file \`lich.ics\`, sau đó import vào Google/Apple Calendar.`;
    await ctx.reply(`${header}\n\`\`\`\n${ics}\`\`\``);
  }

  private parseRange(
    ctx: CommandContext,
  ): { start: Date; end: Date } | null | "INVALID" {
    const args = ctx.args;
    if (args.length === 0) {
      const now = new Date();
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const end = new Date(
        now.getFullYear(),
        now.getMonth() + DEFAULT_FORWARD_MONTHS,
        now.getDate(),
        23,
        59,
        59,
        999,
      );
      return { start, end };
    }

    if (args.length === 1 && args[0].toLowerCase() === "tat-ca") {
      return null;
    }

    if (args.length === 2) {
      const start = parseVietnameseDate(args[0]);
      const end = parseVietnameseDate(args[1]);
      if (!start || !end) return "INVALID";
      const startOfDay = new Date(
        start.getFullYear(),
        start.getMonth(),
        start.getDate(),
      );
      const endOfDay = new Date(
        end.getFullYear(),
        end.getMonth(),
        end.getDate(),
        23,
        59,
        59,
        999,
      );
      if (endOfDay < startOfDay) return "INVALID";
      return { start: startOfDay, end: endOfDay };
    }

    return "INVALID";
  }

  private async findAllByUser(userId: string) {
    const start = new Date(0);
    const end = new Date(8640000000000000); // max Date
    return this.schedulesService.findByDateRange(userId, start, end);
  }

  private usageMessage(prefix: string): string {
    return [
      `⚠️ Sai cú pháp.`,
      `Cú pháp:`,
      `- \`${prefix}export-ics\` — 12 tháng tới kể từ hôm nay`,
      `- \`${prefix}export-ics DD-MM-YYYY DD-MM-YYYY\` — khoảng ngày tuỳ chọn`,
      `- \`${prefix}export-ics tat-ca\` — toàn bộ lịch`,
    ].join("\n");
  }
}
