import { Injectable, OnModuleInit } from "@nestjs/common";
import { DateParser } from "../../shared/utils/date-parser";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class HoanThanhCommand implements BotCommand, OnModuleInit {
  readonly name = "hoan-thanh";
  readonly description = "Hoàn thành công việc";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "hoan-thanh <ID>";

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

    if (schedule.status === "completed") {
      await ctx.reply(`✅ Lịch #${schedule.id} đã được đánh dấu hoàn thành rồi.`);
      return;
    }

    if (schedule.status === "cancelled") {
      await ctx.reply(`⚠️ Lịch #${schedule.id} đã bị hủy, không thể đánh dấu hoàn thành.`);
      return;
    }

    await this.schedulesService.markCompleted(schedule.id);

    const lines = [
      `🎉 Đã đánh dấu hoàn thành lịch #${schedule.id}`,
      `➤ Tiêu đề: ${schedule.title}`,
      `➤ Bắt đầu: ${this.dateParser.formatVietnam(schedule.start_time)}`,
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
}
