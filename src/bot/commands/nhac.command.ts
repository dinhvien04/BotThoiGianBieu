import { Injectable, OnModuleInit } from "@nestjs/common";
import { DateParser } from "../../shared/utils/date-parser";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { Schedule } from "../../schedules/entities/schedule.entity";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class NhacCommand implements BotCommand, OnModuleInit {
  readonly name = "nhac";
  readonly description = "Đặt nhắc lịch";
  readonly category = "🔔 NHẮC NHỞ";
  readonly syntax = "nhac <ID> <số_phút>";

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

    if (ctx.args.length !== 2) {
      await ctx.reply(this.formatUsage(ctx.prefix));
      return;
    }

    const scheduleId = this.parsePositiveInteger(ctx.args[0]);
    const minutes = this.parsePositiveInteger(ctx.args[1]);
    if (!scheduleId || !minutes) {
      await ctx.reply(
        `⚠️ Cú pháp không hợp lệ.\nDùng: \`${ctx.prefix}${this.syntax}\``,
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

    const remindAt = this.calculateReminderAt(schedule, minutes);
    await this.schedulesService.setReminder(schedule.id, remindAt);

    const immediate = remindAt.getTime() <= Date.now();
    const lines = [
      `✅ Đã đặt nhắc cho lịch #${schedule.id}`,
      `➤ Tiêu đề: ${schedule.title}`,
      `➤ Nhắc trước: ${minutes} phút`,
      `➤ Sẽ nhắc lúc: ${this.dateParser.formatVietnam(remindAt)}${
        immediate ? " (sát giờ, bot sẽ nhắc trong phút tới)" : ""
      }`,
    ];

    await ctx.reply(lines.join("\n"));
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

  private calculateReminderAt(schedule: Schedule, minutes: number): Date {
    const idealRemindAt = new Date(
      schedule.start_time.getTime() - minutes * 60 * 1000,
    );
    return idealRemindAt.getTime() > Date.now() ? idealRemindAt : new Date();
  }

  private formatStatus(status: Schedule["status"]): string {
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

@Injectable()
export class TatNhacCommand implements BotCommand, OnModuleInit {
  readonly name = "tat-nhac";
  readonly description = "Tắt nhắc lịch";
  readonly category = "🔔 NHẮC NHỞ";
  readonly syntax = "tat-nhac <ID>";

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
        `⚠️ ID không hợp lệ: \`${ctx.args[0]}\`.\nVui lòng nhập số nguyên dương, ví dụ: \`${ctx.prefix}${this.syntax} 3\`.`,
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

    if (schedule.remind_at === null && schedule.acknowledged_at !== null) {
      await ctx.reply(
        `🔕 Lịch #${schedule.id} đã tắt nhắc rồi.\n➤ Tiêu đề: ${schedule.title}`,
      );
      return;
    }

    const previousReminder = schedule.remind_at;
    await this.schedulesService.disableReminder(schedule.id);

    const lines = [
      `🔕 Đã tắt nhắc cho lịch #${schedule.id}`,
      `➤ Tiêu đề: ${schedule.title}`,
    ];

    if (previousReminder) {
      lines.push(
        `➤ Nhắc trước đó: ${this.dateParser.formatVietnam(previousReminder)}`,
      );
    }

    await ctx.reply(lines.join("\n"));
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
}
