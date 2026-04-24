import { Injectable, OnModuleInit } from "@nestjs/common";
import { DateParser } from "../../shared/utils/date-parser";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { Schedule, ScheduleItemType, ScheduleStatus } from "../../schedules/entities/schedule.entity";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class ChiTietCommand implements BotCommand, OnModuleInit {
  readonly name = "chi-tiet";
  readonly description = "Xem chi tiết lịch";
  readonly category = "📅 XEM LỊCH";
  readonly syntax = "chi-tiet <ID>";

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

    if (ctx.args.length !== 1) {
      await ctx.reply(this.formatUsage(ctx.prefix));
      return;
    }

    const scheduleId = this.parsePositiveInteger(ctx.args[0]);
    if (!scheduleId) {
      await ctx.reply(
        `⚠️ ID không hợp lệ: \`${ctx.args[0]}\`.\nVui lòng nhập số nguyên dương, ví dụ: \`${ctx.prefix}${this.syntax}\``,
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

    await ctx.reply(this.formatScheduleDetail(schedule));
  }

  private formatUsage(prefix: string): string {
    return `⚠️ Sai cú pháp.\nDùng: \`${prefix}${this.syntax}\``;
  }

  private parsePositiveInteger(input: string): number | null {
    if (!/^\d+$/.test(input)) {
      return null;
    }

    const value = Number(input);
    if (!Number.isInteger(value) || value <= 0) {
      return null;
    }

    return value;
  }

  private formatScheduleDetail(schedule: Schedule): string {
    const lines = [
      `📋 CHI TIẾT LỊCH #${schedule.id}`,
      "━━━━━━━━━━━━━━━━━━━━",
      `➤ Tiêu đề: ${schedule.title}`,
      `➤ Loại: ${this.formatItemType(schedule.item_type)}`,
      `➤ Trạng thái: ${this.formatStatus(schedule.status)}`,
      `➤ Bắt đầu: ${this.dateParser.formatVietnam(schedule.start_time)}`,
    ];

    if (schedule.end_time) {
      lines.push(`➤ Kết thúc: ${this.dateParser.formatVietnam(schedule.end_time)}`);
    }

    lines.push(`➤ Nhắc: ${this.formatReminder(schedule)}`);

    if (schedule.description) {
      lines.push(`➤ Ghi chú: ${schedule.description}`);
    }

    return lines.join("\n");
  }

  private formatReminder(schedule: Schedule): string {
    if (schedule.remind_at) {
      const minutesBefore = Math.max(
        0,
        Math.round(
          (schedule.start_time.getTime() - schedule.remind_at.getTime()) /
            (60 * 1000),
        ),
      );
      return `${this.dateParser.formatVietnam(schedule.remind_at)} (trước ${minutesBefore} phút)`;
    }

    if (schedule.acknowledged_at) {
      return "Đã tắt";
    }

    return "Chưa đặt";
  }

  private formatStatus(status: ScheduleStatus): string {
    switch (status) {
      case "completed":
        return "Đã hoàn thành";
      case "cancelled":
        return "Đã hủy";
      case "pending":
      default:
        return "Đang chờ";
    }
  }

  private formatItemType(type: ScheduleItemType): string {
    switch (type) {
      case "meeting":
        return "Meeting";
      case "event":
        return "Event";
      case "reminder":
        return "Reminder";
      case "task":
      default:
        return "Task";
    }
  }
}
