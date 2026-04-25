import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

const PAGE_SIZE = 10;

@Injectable()
export class TimKiemCommand implements BotCommand, OnModuleInit {
  readonly name = "tim-kiem";
  readonly aliases = ["timkiem", "search"];
  readonly description = "Tìm lịch theo từ khoá";
  readonly category = "📅 XEM LỊCH";
  readonly syntax = "tim-kiem <từ khoá> [trang]";
  readonly example = "tim-kiem họp khách hàng";

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

    if (ctx.args.length === 0) {
      await ctx.reply(
        `⚠️ Thiếu từ khoá.\nDùng: \`${ctx.prefix}${this.syntax}\`\n` +
          `Ví dụ: \`${ctx.prefix}${this.example}\``,
      );
      return;
    }

    const { keyword, page } = this.parseArgs(ctx.args);
    if (!keyword) {
      await ctx.reply(
        `⚠️ Từ khoá không hợp lệ.\nDùng: \`${ctx.prefix}${this.syntax}\``,
      );
      return;
    }

    const offset = (page - 1) * PAGE_SIZE;
    const { items, total } = await this.schedulesService.search(
      user.user_id,
      keyword,
      PAGE_SIZE,
      offset,
    );

    if (total === 0) {
      await ctx.reply(
        this.formatter.formatScheduleDigest(
          [],
          `Kết quả tìm: "${keyword}"`,
          { emptyMessage: `Không tìm thấy lịch nào chứa "${keyword}".` },
        ),
      );
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) {
      await ctx.reply(
        `⚠️ Trang ${page} vượt quá số trang (${totalPages}).`,
      );
      return;
    }

    const footer = this.buildFooter(
      ctx.prefix,
      keyword,
      page,
      totalPages,
      total,
    );

    await ctx.reply(
      this.formatter.formatScheduleDigest(
        items,
        `Kết quả tìm: "${keyword}"`,
        { footer },
      ),
    );
  }

  private parseArgs(args: string[]): { keyword: string; page: number } {
    if (args.length === 0) {
      return { keyword: "", page: 1 };
    }

    const last = args[args.length - 1];
    const maybePage = /^\d+$/.test(last) ? Number(last) : null;

    if (maybePage && maybePage > 0 && args.length > 1) {
      return {
        keyword: args.slice(0, -1).join(" ").trim(),
        page: maybePage,
      };
    }

    return { keyword: args.join(" ").trim(), page: 1 };
  }

  private buildFooter(
    prefix: string,
    keyword: string,
    page: number,
    totalPages: number,
    total: number,
  ): string {
    const lines = [`💡 Tổng ${total} kết quả — trang ${page}/${totalPages}.`];
    if (page < totalPages) {
      lines.push(
        `Gõ \`${prefix}${this.name} ${keyword} ${page + 1}\` để xem trang tiếp theo.`,
      );
    }
    return lines.join("\n");
  }
}
