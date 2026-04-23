import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import {
  addDays,
  formatDateShort,
  parseVietnameseDate,
  weekRange,
} from "../../shared/utils/date-utils";
import { ScheduleService } from "../../schedules/schedule.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class LichTuanCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-tuan";
  readonly description = "Xem lịch tuần này hoặc tuần chứa ngày được nhập";
  readonly category = "📅 Xem lịch";
  readonly syntax = "lich-tuan [DD-MM-YYYY]";

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

    const range = weekRange(targetDate);
    const schedules = await this.schedulesService.findByDateRange(
      user.user_id,
      range.start,
      range.end,
    );
    const title = ctx.rawArgs
      ? `Lịch tuần chứa ngày ${formatDateShort(targetDate)}`
      : "Lịch tuần này";

    await ctx.reply(
      this.formatter.formatWeeklySchedule(schedules, title, range.start),
    );
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

@Injectable()
export class LichTuanTruocCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-tuan-truoc";
  readonly description = "Xem lịch tuần trước";
  readonly category = "📅 Xem lịch";
  readonly syntax = "lich-tuan-truoc";

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
    if (ctx.rawArgs) {
      await ctx.reply(
        `⚠️ Lệnh này không nhận tham số. Dùng: \`${ctx.prefix}${this.name}\`.`,
      );
      return;
    }

    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(this.formatter.formatNotInitialized(ctx.prefix));
      return;
    }

    const targetDate = addDays(new Date(), -7);
    const range = weekRange(targetDate);
    const schedules = await this.schedulesService.findByDateRange(
      user.user_id,
      range.start,
      range.end,
    );
    const title = "Lịch tuần trước";

    await ctx.reply(
      this.formatter.formatWeeklySchedule(schedules, title, range.start),
    );
  }
}

@Injectable()
export class LichTuanSauCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-tuan-sau";
  readonly description = "Xem lịch tuần sau";
  readonly category = "📅 Xem lịch";
  readonly syntax = "lich-tuan-sau";

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
    if (ctx.rawArgs) {
      await ctx.reply(
        `⚠️ Lệnh này không nhận tham số. Dùng: \`${ctx.prefix}${this.name}\`.`,
      );
      return;
    }

    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(this.formatter.formatNotInitialized(ctx.prefix));
      return;
    }

    const targetDate = addDays(new Date(), 7);
    const range = weekRange(targetDate);
    const schedules = await this.schedulesService.findByDateRange(
      user.user_id,
      range.start,
      range.end,
    );
    const title = "Lịch tuần sau";

    await ctx.reply(
      this.formatter.formatWeeklySchedule(schedules, title, range.start),
    );
  }
}
