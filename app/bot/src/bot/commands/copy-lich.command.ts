import { Injectable, OnModuleInit } from "@nestjs/common";
import { DateParser } from "../../shared/utils/date-parser";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { formatPriority } from "../../shared/utils/priority";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

@Injectable()
export class CopyLichCommand implements BotCommand, OnModuleInit {
  readonly name = "copy-lich";
  readonly aliases = ["copylich", "copy", "duplicate"];
  readonly description = "Sao chép lịch sang ngày khác";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "copy-lich <ID> <DD-MM-YYYY> [HH:mm]";
  readonly example = "copy-lich 5 21-4-2026 09:00";

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
      await ctx.reply(this.usageError(ctx.prefix));
      return;
    }

    const scheduleId = this.parsePositiveInteger(ctx.args[0]);
    if (!scheduleId) {
      await ctx.reply(`⚠️ ID không hợp lệ: \`${ctx.args[0]}\`.`);
      return;
    }

    const source = await this.schedulesService.findById(
      scheduleId,
      user.user_id,
    );
    if (!source) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${scheduleId} của bạn.`);
      return;
    }

    const datePart = ctx.args.slice(1).join(" ");
    const hasExplicitTime = datePart.includes(":");
    const targetStart = this.dateParser.parseVietnamLocal(datePart);
    if (!targetStart) {
      await ctx.reply(
        `⚠️ Không nhận diện được ngày: \`${datePart}\`.\n` +
          `Dùng định dạng \`DD-MM-YYYY\` hoặc \`DD-MM-YYYY HH:mm\`.`,
      );
      return;
    }

    let finalStart = targetStart;
    if (!hasExplicitTime) {
      const sourceVn = new Date(source.start_time.getTime() + VN_OFFSET_MS);
      const offsetMs =
        sourceVn.getUTCHours() * 3600_000 +
        sourceVn.getUTCMinutes() * 60_000 +
        sourceVn.getUTCSeconds() * 1000;
      finalStart = new Date(targetStart.getTime() + offsetMs);
    }

    const delta = finalStart.getTime() - source.start_time.getTime();

    const newEnd = source.end_time
      ? new Date(source.end_time.getTime() + delta)
      : null;
    const newRemind = source.remind_at
      ? new Date(source.remind_at.getTime() + delta)
      : null;

    const created = await this.schedulesService.create({
      user_id: user.user_id,
      item_type: source.item_type,
      title: source.title,
      description: source.description,
      start_time: finalStart,
      end_time: newEnd,
      remind_at: newRemind,
      priority: source.priority ?? "normal",
    });

    const lines = [
      `📋 Đã sao chép lịch #${source.id} → #${created.id}`,
      `➤ Tiêu đề: ${created.title}`,
      `➤ Bắt đầu: ${this.dateParser.formatVietnam(finalStart)}` +
        (newEnd ? ` → ${this.dateParser.formatVietnam(newEnd)}` : ""),
    ];
    if (newRemind) {
      lines.push(`🔔 Nhắc: ${this.dateParser.formatVietnam(newRemind)}`);
    }
    lines.push(
      `⚡ Ưu tiên: ${formatPriority(created.priority ?? "normal")}`,
    );
    if (source.recurrence_type && source.recurrence_type !== "none") {
      lines.push(`ℹ️ Bản sao là lịch một lần (không kế thừa lặp).`);
    }
    await ctx.reply(lines.join("\n"));
  }

  private usageError(prefix: string): string {
    return [
      `⚠️ Sai cú pháp.`,
      `Dùng: \`${prefix}${this.syntax}\``,
      `Ví dụ:`,
      `- \`${prefix}copy-lich 5 21-4-2026\` — copy giữ nguyên giờ`,
      `- \`${prefix}copy-lich 5 21-4-2026 09:00\` — copy đổi giờ`,
    ].join("\n");
  }

  private parsePositiveInteger(input: string): number | null {
    if (!/^\d+$/.test(input)) return null;
    const value = Number(input);
    return Number.isInteger(value) && value > 0 ? value : null;
  }
}
