import { Injectable, OnModuleInit } from "@nestjs/common";
import { DateParser } from "../../shared/utils/date-parser";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";
import { parseNaturalLanguage } from "../../shared/utils/nl-datetime-parser";

@Injectable()
export class NhanhCommand implements BotCommand, OnModuleInit {
  readonly name = "nhanh";
  readonly aliases = ["quick", "qa", "q"];
  readonly description =
    "Quick add lịch bằng câu tiếng Việt (vd: họp team 9h sáng mai)";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "nhanh <câu mô tả>";
  readonly example = 'nhanh họp team 9h sáng mai';

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

    const raw = ctx.args.join(" ").trim();
    if (!raw) {
      await ctx.reply(this.usageError(ctx.prefix));
      return;
    }

    const parsed = parseNaturalLanguage(raw, new Date());
    if (!parsed.start) {
      await ctx.reply(
        [
          `⚠️ Không nhận diện được giờ/ngày trong câu: \`${raw}\`.`,
          ``,
          `Mẹo: thêm giờ rõ ràng (vd \`9h\`, \`14:30\`) hoặc ngày (\`mai\`, \`thứ 6\`, \`30/4\`).`,
          `Ví dụ: \`${ctx.prefix}${this.example}\``,
        ].join("\n"),
      );
      return;
    }

    if (!parsed.title) {
      await ctx.reply(
        `⚠️ Câu chỉ có giờ/ngày, thiếu tiêu đề. Vd: \`${ctx.prefix}${this.example}\``,
      );
      return;
    }

    const created = await this.schedulesService.create({
      user_id: user.user_id,
      title: parsed.title,
      start_time: parsed.start,
      end_time: new Date(parsed.start.getTime() + 60 * 60 * 1000),
    });

    const lines = [
      `⚡ Đã tạo lịch nhanh #${created.id}`,
      `➤ Tiêu đề: ${created.title}`,
      `➤ Bắt đầu: ${this.dateParser.formatVietnam(parsed.start)}`,
    ];
    if (parsed.notes.length > 0) {
      lines.push(...parsed.notes.map((n) => `ℹ️ ${n}`));
    }
    lines.push(
      `💡 Sửa thêm chi tiết: \`${ctx.prefix}sua-lich ${created.id}\``,
    );
    await ctx.reply(lines.join("\n"));
  }

  private usageError(prefix: string): string {
    return [
      `⚠️ Cú pháp: \`${prefix}${this.syntax}\``,
      ``,
      `Ví dụ:`,
      `- \`${prefix}nhanh họp team 9h sáng mai\``,
      `- \`${prefix}nhanh ăn trưa 12h hôm nay\``,
      `- \`${prefix}nhanh deadline báo cáo 17h thứ 6\``,
      `- \`${prefix}nhanh chạy bộ 6h30 thứ 2 tuần sau\``,
      `- \`${prefix}nhanh lễ 30/4 sáng\``,
    ].join("\n");
  }
}
