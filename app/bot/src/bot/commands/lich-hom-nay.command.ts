import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { dayRange } from "../../shared/utils/date-utils";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class LichHomNayCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-hom-nay";
  readonly description = "Xem lịch hôm nay";
  readonly category = "📅 Xem lịch";
  readonly syntax = "lich-hom-nay";

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

    const today = new Date();
    const range = dayRange(today);
    const schedules = await this.schedulesService.findByDateRange(
      user.user_id,
      range.start,
      range.end,
    );

    await ctx.reply(
      this.formatter.formatScheduleList(schedules, "Lịch hôm nay"),
    );
  }
}
