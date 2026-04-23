import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import {
  dayRange,
  formatDateShort,
  parseVietnameseDate,
} from "../../shared/utils/date-utils";
import { ScheduleService } from "../../schedules/schedule.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class LichNgayCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-ngay";
  readonly description = "Xem lịch theo ngày";
  readonly category = "📅 Xem lịch";
  readonly syntax = "lich-ngay [DD-MM-YYYY]";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: ScheduleService,
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

    const targetDate = this.resolveTargetDate(ctx);
    if (!targetDate) {
      await ctx.reply(
        this.formatter.formatInvalidDate(ctx.rawArgs, ctx.prefix, this.name),
      );
      return;
    }

    const range = dayRange(targetDate);
    const schedules = await this.schedulesService.findByDateRange(
      user.user_id,
      range.start,
      range.end,
    );

    const title = ctx.rawArgs
      ? `Lịch ngày ${formatDateShort(targetDate)}`
      : "Lịch ngày hôm nay";

    await ctx.reply(this.formatter.formatScheduleList(schedules, title));
  }

  private resolveTargetDate(ctx: CommandContext): Date | null {
    if (!ctx.rawArgs) {
      return new Date();
    }
    if (ctx.args.length !== 1) {
      return null;
    }

    return parseVietnameseDate(ctx.args[0]);
  }
}
