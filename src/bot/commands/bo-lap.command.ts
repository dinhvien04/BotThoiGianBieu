import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { formatRecurrence } from "../../shared/utils/recurrence";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class BoLapCommand implements BotCommand, OnModuleInit {
  readonly name = "bo-lap";
  readonly aliases = ["bolap", "unrepeat"];
  readonly description = "Tắt lặp cho lịch (không sinh instance mới)";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "bo-lap <ID>";
  readonly example = "bo-lap 5";

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

    if (ctx.args.length !== 1) {
      await ctx.reply(
        `⚠️ Sai cú pháp.\nDùng: \`${ctx.prefix}${this.syntax}\`\nVí dụ: \`${ctx.prefix}${this.example}\``,
      );
      return;
    }

    const scheduleId = this.parsePositiveInteger(ctx.args[0]);
    if (!scheduleId) {
      await ctx.reply(`⚠️ ID không hợp lệ: \`${ctx.args[0]}\`.`);
      return;
    }

    const schedule = await this.schedulesService.findById(scheduleId, user.user_id);
    if (!schedule) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${scheduleId} của bạn.`);
      return;
    }

    if (schedule.recurrence_type === "none") {
      await ctx.reply(
        `ℹ️ Lịch #${schedule.id} hiện không đang lặp, không cần tắt.`,
      );
      return;
    }

    const prevLabel = formatRecurrence(
      schedule.recurrence_type,
      schedule.recurrence_interval,
    );

    await this.schedulesService.clearRecurrence(schedule.id);

    await ctx.reply(
      [
        `🛑 Đã tắt lặp cho lịch #${schedule.id}`,
        `➤ Tiêu đề: ${schedule.title}`,
        `➤ Chu kỳ cũ: ${prevLabel}`,
        `ℹ️ Lịch hiện tại vẫn giữ; sẽ không sinh instance mới khi hoàn thành.`,
      ].join("\n"),
    );
  }

  private parsePositiveInteger(input: string): number | null {
    if (!/^\d+$/.test(input)) return null;
    const value = Number(input);
    return Number.isInteger(value) && value > 0 ? value : null;
  }
}
