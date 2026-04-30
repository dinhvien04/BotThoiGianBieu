import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

const MAX_LENGTH = 2000;

@Injectable()
export class GhiChuCommand implements BotCommand, OnModuleInit {
  readonly name = "ghi-chu";
  readonly aliases = ["ghichu", "note", "addnote"];
  readonly description =
    "Thêm nhanh ghi chú vào description của lịch (append, không vào form sửa)";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "ghi-chu <ID> <nội dung>";
  readonly example = "ghi-chu 5 Cần chuẩn bị slide";

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

    if (ctx.args.length < 2) {
      await ctx.reply(this.usageError(ctx.prefix));
      return;
    }

    const scheduleId = this.parsePositiveInteger(ctx.args[0]);
    if (!scheduleId) {
      await ctx.reply(`⚠️ ID không hợp lệ: \`${ctx.args[0]}\`.`);
      return;
    }

    const note = ctx.args.slice(1).join(" ").trim();
    if (!note) {
      await ctx.reply(`⚠️ Nội dung ghi chú không được rỗng.`);
      return;
    }

    const schedule = await this.schedulesService.findById(
      scheduleId,
      user.user_id,
    );
    if (!schedule) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${scheduleId} của bạn.`);
      return;
    }

    const stamp = this.formatStamp(new Date());
    const newLine = `[${stamp}] ${note}`;
    const merged = schedule.description
      ? `${schedule.description}\n${newLine}`
      : newLine;

    if (merged.length > MAX_LENGTH) {
      await ctx.reply(
        `⚠️ Description sau khi append vượt quá ${MAX_LENGTH} ký tự ` +
          `(hiện ${merged.length}). Hãy rút gọn ghi chú hoặc dùng \`${ctx.prefix}sua-lich ${scheduleId}\` để dọn description.`,
      );
      return;
    }

    await this.schedulesService.update(scheduleId, { description: merged });

    const lines = [
      `📝 Đã thêm ghi chú vào lịch #${scheduleId}`,
      `➤ Tiêu đề: ${schedule.title}`,
      `➤ Vừa thêm: ${newLine}`,
      `💡 Xem chi tiết: \`${ctx.prefix}chi-tiet ${scheduleId}\``,
    ];
    await ctx.reply(lines.join("\n"));
  }

  private formatStamp(date: Date): string {
    const VN_OFFSET_MS = 7 * 60 * 60 * 1000;
    const vn = new Date(date.getTime() + VN_OFFSET_MS);
    const pad = (n: number) => String(n).padStart(2, "0");
    return (
      `${pad(vn.getUTCDate())}/${pad(vn.getUTCMonth() + 1)} ` +
      `${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`
    );
  }

  private usageError(prefix: string): string {
    return [
      `⚠️ Cú pháp: \`${prefix}${this.syntax}\``,
      `Ví dụ: \`${prefix}${this.example}\``,
    ].join("\n");
  }

  private parsePositiveInteger(input: string): number | null {
    if (!/^\d+$/.test(input)) return null;
    const value = Number(input);
    return Number.isInteger(value) && value > 0 ? value : null;
  }
}
