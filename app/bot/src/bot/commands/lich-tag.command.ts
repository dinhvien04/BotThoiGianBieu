import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { TagsService } from "../../schedules/tags.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class LichTagCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-tag";
  readonly aliases = ["lichtag", "tag-lich", "loc-tag"];
  readonly description = "Liệt kê các lịch theo nhãn";
  readonly category = "📅 XEM LỊCH";
  readonly syntax = "lich-tag <name> [--cho]";
  readonly example = "lich-tag hoc-tap --cho";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly tagsService: TagsService,
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

    if (ctx.args.length < 1) {
      await ctx.reply(
        `⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\`\n` +
          `Vd: \`${ctx.prefix}lich-tag hoc-tap\` (xem tất cả) hoặc ` +
          `\`${ctx.prefix}lich-tag hoc-tap --cho\` (chỉ pending).`,
      );
      return;
    }

    const tagName = ctx.args[0];
    const onlyPending =
      ctx.args.includes("--cho") || ctx.args.includes("--pending");

    const normalized = this.tagsService.normalize(tagName);
    if (!normalized) {
      await ctx.reply(`⚠️ Tên nhãn không hợp lệ: \`${tagName}\`.`);
      return;
    }

    const tag = await this.tagsService.findByName(user.user_id, normalized);
    if (!tag) {
      await ctx.reply(
        `⚠️ Bạn chưa có nhãn \`#${normalized}\`. Tạo trước với \`${ctx.prefix}tag-them ${normalized}\`.`,
      );
      return;
    }

    const schedules = await this.tagsService.findSchedulesByTag(
      user.user_id,
      normalized,
      { onlyPending },
    );

    const titleSuffix = onlyPending ? " (đang chờ)" : "";
    const emptySuffix = onlyPending ? " đang chờ" : "";
    await ctx.reply(
      this.formatter.formatScheduleDigest(
        schedules,
        `Lịch nhãn #${normalized}${titleSuffix}`,
        {
          emptyMessage:
            `Không có lịch${emptySuffix} có nhãn \`#${normalized}\`.\n` +
            `💡 Gắn nhãn: \`${ctx.prefix}tag <ID> ${normalized}\`.`,
          footer:
            schedules.length > 0
              ? `💡 Tổng: ${schedules.length} lịch có nhãn \`#${normalized}\`.`
              : undefined,
        },
      ),
    );
  }
}
