import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { monthRange, parseMonthYear } from "../../shared/utils/date-utils";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class LichThangCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-thang";
  readonly aliases = ["lichthang", "month"];
  readonly description = "Xem lịch cả tháng";
  readonly category = "📅 XEM LỊCH";
  readonly syntax = "lich-thang [MM-YYYY]";
  readonly example = "lich-thang 4-2026";

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

    const target = this.resolveMonth(ctx);
    if (!target) {
      await ctx.reply(
        `⚠️ Tháng không hợp lệ: \`${ctx.rawArgs}\`.\n` +
          `Dùng: \`${ctx.prefix}${this.syntax}\` (vd: \`${ctx.prefix}${this.example}\`).`,
      );
      return;
    }

    const range = monthRange(target.year, target.month);
    const schedules = await this.schedulesService.findByDateRange(
      user.user_id,
      range.start,
      range.end,
    );

    await ctx.reply(
      this.formatter.formatMonthlySchedule(
        schedules,
        target.year,
        target.month,
      ),
    );
  }

  private resolveMonth(
    ctx: CommandContext,
  ): { year: number; month: number } | null {
    if (!ctx.rawArgs) {
      const now = new Date();
      return { year: now.getFullYear(), month: now.getMonth() + 1 };
    }
    if (ctx.args.length !== 1) return null;
    return parseMonthYear(ctx.args[0]);
  }
}
