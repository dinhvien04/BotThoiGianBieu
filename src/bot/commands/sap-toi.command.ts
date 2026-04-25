import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

@Injectable()
export class SapToiCommand implements BotCommand, OnModuleInit {
  readonly name = "sap-toi";
  readonly aliases = ["saptoi", "next"];
  readonly description = "Xem các lịch sắp tới";
  readonly category = "📅 XEM LỊCH";
  readonly syntax = "sap-toi [số_lượng]";
  readonly example = "sap-toi 10";

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

    const limit = this.parseLimit(ctx.args[0]);
    if (limit === null) {
      await ctx.reply(
        `⚠️ Số lượng không hợp lệ: \`${ctx.args[0]}\`.\n` +
          `Vui lòng nhập số nguyên dương (tối đa ${MAX_LIMIT}).`,
      );
      return;
    }

    const schedules = await this.schedulesService.findUpcoming(
      user.user_id,
      new Date(),
      limit,
    );

    await ctx.reply(
      this.formatter.formatScheduleDigest(schedules, "Lịch sắp tới", {
        emptyMessage:
          "Bạn không có lịch pending sắp tới.\n💡 Dùng `" +
          ctx.prefix +
          "them-lich` để thêm lịch mới.",
        footer:
          schedules.length > 0
            ? `💡 Đang hiển thị ${schedules.length} lịch pending sắp tới gần nhất.`
            : undefined,
      }),
    );
  }

  private parseLimit(input: string | undefined): number | null {
    if (!input) {
      return DEFAULT_LIMIT;
    }

    if (!/^\d+$/.test(input)) {
      return null;
    }

    const value = Number(input);
    if (!Number.isInteger(value) || value <= 0 || value > MAX_LIMIT) {
      return null;
    }

    return value;
  }
}
