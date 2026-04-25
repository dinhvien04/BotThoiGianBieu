import { Injectable, OnModuleInit } from "@nestjs/common";
import { DateParser } from "../../shared/utils/date-parser";
import { parseDurationMinutes } from "../../shared/utils/duration-parser";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class NhacSauCommand implements BotCommand, OnModuleInit {
  readonly name = "nhac-sau";
  readonly aliases = ["nhacsau", "remindin"];
  readonly description = "Đặt nhắc lịch sau X phút/giờ/ngày (tương đối)";
  readonly category = "🔔 NHẮC NHỞ";
  readonly syntax = "nhac-sau <ID> <thời gian>";
  readonly example = "nhac-sau 5 30p";

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
        `⚠️ ID không hợp lệ: \`${ctx.args[0]}\`.\n` +
          `Dùng: \`${ctx.prefix}${this.syntax}\``,
      );
      return;
    }

    const durationRaw = ctx.args.slice(1).join(" ");
    const minutes = parseDurationMinutes(durationRaw);
    if (minutes === null) {
      await ctx.reply(
        `⚠️ Thời gian không hợp lệ: \`${durationRaw}\`.\n` +
          `Ví dụ: \`30p\`, \`2h\`, \`2h30p\`, \`1d\`, \`1 ngày 12 giờ\`.`,
      );
      return;
    }

    const schedule = await this.schedulesService.findById(
      scheduleId,
      user.user_id,
    );
    if (!schedule) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${scheduleId} của bạn.`);
      return;
    }

    if (schedule.status !== "pending") {
      await ctx.reply(
        `⚠️ Lịch #${schedule.id} đã ${this.formatStatus(schedule.status)} nên không thể đặt nhắc.`,
      );
      return;
    }

    const remindAt = new Date(Date.now() + minutes * 60 * 1000);
    await this.schedulesService.setReminder(schedule.id, remindAt);

    const warning =
      schedule.end_time && remindAt.getTime() > schedule.end_time.getTime()
        ? `\n⚠️ Lưu ý: thời điểm nhắc nằm SAU khi lịch đã kết thúc (${this.dateParser.formatVietnam(schedule.end_time)}).`
        : "";

    const lines = [
      `✅ Đã đặt nhắc cho lịch #${schedule.id}`,
      `➤ Tiêu đề: ${schedule.title}`,
      `➤ Nhắc sau: ${this.dateParser.formatMinutes(minutes)}`,
      `➤ Sẽ nhắc lúc: ${this.dateParser.formatVietnam(remindAt)}${warning}`,
    ];

    await ctx.reply(lines.join("\n"));
  }

  private formatUsage(prefix: string): string {
    return (
      `⚠️ Sai cú pháp.\nDùng: \`${prefix}${this.syntax}\`\n` +
      `Ví dụ: \`${prefix}${this.example}\` (nhắc sau 30 phút)\n` +
      `        \`${prefix}${this.name} 5 2h30p\` (nhắc sau 2 giờ 30 phút)`
    );
  }

  private parsePositiveInteger(input: string): number | null {
    if (!/^\d+$/.test(input)) return null;
    const value = Number(input);
    return Number.isInteger(value) && value > 0 ? value : null;
  }

  private formatStatus(status: "pending" | "completed" | "cancelled"): string {
    switch (status) {
      case "completed":
        return "đã hoàn thành";
      case "cancelled":
        return "đã hủy";
      case "pending":
      default:
        return "đang chờ";
    }
  }
}
