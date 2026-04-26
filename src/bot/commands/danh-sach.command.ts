import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";
import { extractPriorityFlag } from "../../shared/utils/priority-flag";
import { formatPriority } from "../../shared/utils/priority";

const PAGE_SIZE = 10;

@Injectable()
export class DanhSachCommand implements BotCommand, OnModuleInit {
  readonly name = "danh-sach";
  readonly aliases = ["danhsach", "pending", "list"];
  readonly description = "Liệt kê tất cả lịch đang chờ";
  readonly category = "📅 XEM LỊCH";
  readonly syntax = "danh-sach [trang] [--uutien cao|vua|thap]";
  readonly example = "danh-sach 2 --uutien cao";

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

    const flag = extractPriorityFlag(ctx.args);
    if (flag.error) {
      await ctx.reply(flag.error);
      return;
    }

    const page = this.parsePage(flag.rest[0]);
    if (page === null) {
      await ctx.reply(
        `⚠️ Trang không hợp lệ: \`${flag.rest[0]}\`.\n` +
          `Vui lòng nhập số nguyên dương, ví dụ: \`${ctx.prefix}${this.syntax}\`.`,
      );
      return;
    }

    const offset = (page - 1) * PAGE_SIZE;
    const { items, total } = await this.schedulesService.findAllPending(
      user.user_id,
      PAGE_SIZE,
      offset,
      flag.priority,
    );

    const titleSuffix = flag.priority
      ? ` (Ưu tiên ${formatPriority(flag.priority)})`
      : "";
    const emptySuffix = flag.priority
      ? ` với ưu tiên ${formatPriority(flag.priority)}`
      : "";
    const title = `Danh sách lịch chờ${titleSuffix}`;

    if (total === 0) {
      await ctx.reply(
        this.formatter.formatScheduleDigest([], title, {
          emptyMessage:
            `Bạn không có lịch nào đang chờ${emptySuffix}.\n💡 Dùng \`` +
            ctx.prefix +
            "them-lich\` để thêm lịch mới.",
        }),
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

    const footer = this.buildFooter(ctx.prefix, page, totalPages, total, flag.priority);

    await ctx.reply(
      this.formatter.formatScheduleDigest(items, title, {
        footer,
      }),
    );
  }

  private parsePage(input: string | undefined): number | null {
    if (!input) {
      return 1;
    }

    if (!/^\d+$/.test(input)) {
      return null;
    }

    const value = Number(input);
    if (!Number.isInteger(value) || value <= 0) {
      return null;
    }

    return value;
  }

  private buildFooter(
    prefix: string,
    page: number,
    totalPages: number,
    total: number,
    priority?: ReturnType<typeof extractPriorityFlag>["priority"],
  ): string {
    const suffix = priority ? ` (ưu tiên ${formatPriority(priority)})` : "";
    const lines = [
      `💡 Tổng ${total} lịch pending${suffix} — trang ${page}/${totalPages}.`,
    ];
    if (page < totalPages) {
      const next = priority ? ` --uutien ${priority}` : "";
      lines.push(
        `Gõ \`${prefix}${this.name} ${page + 1}${next}\` để xem trang tiếp theo.`,
      );
    }
    return lines.join("\n");
  }
}
