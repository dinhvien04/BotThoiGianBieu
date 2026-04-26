import { Injectable, OnModuleInit } from "@nestjs/common";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

/**
 * Quick-set khung giờ làm việc thay cho việc mở form `*cai-dat`.
 *
 * Cú pháp:
 *   *gio-lam            → xem khung hiện tại
 *   *gio-lam tat        → tắt (đặt 0-0, ping 24/7)
 *   *gio-lam 8 18       → đặt 8h-18h
 *   *gio-lam 22 7       → khung qua đêm 22h-7h
 */
@Injectable()
export class GioLamCommand implements BotCommand, OnModuleInit {
  readonly name = "gio-lam";
  readonly aliases = ["giolam", "work-hours", "workhours"];
  readonly description = "Đặt nhanh khung giờ làm việc — reminder ngoài khung dồn về sáng hôm sau";
  readonly category = "⚙️ CÀI ĐẶT";
  readonly syntax = "gio-lam [start] [end] | tat";
  readonly example = "gio-lam 8 18";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user || !user.settings) {
      await ctx.reply(
        `⚠️ Bạn chưa khởi tạo. Gõ \`${ctx.prefix}batdau\` trước.`,
      );
      return;
    }

    if (ctx.args.length === 0) {
      const s = user.settings.work_start_hour;
      const e = user.settings.work_end_hour;
      if (s === e) {
        await ctx.reply(
          `🕐 Khung giờ làm việc: **tắt** (ping 24/7).\n` +
            `Đặt: \`${ctx.prefix}gio-lam 8 18\` hoặc \`${ctx.prefix}gio-lam tat\`.`,
        );
      } else {
        await ctx.reply(
          `🕐 Khung giờ làm việc hiện tại: **${s}h - ${e}h**.\n` +
            `Reminder ngoài khung này tự dồn về \`${s}h\` ngày kế tiếp.`,
        );
      }
      return;
    }

    if (
      ctx.args[0].toLowerCase() === "tat" ||
      ctx.args[0].toLowerCase() === "off"
    ) {
      await this.usersService.updateSettings(user.user_id, {
        work_start_hour: 0,
        work_end_hour: 0,
      });
      await ctx.reply(`✅ Đã tắt khung giờ làm việc — bot ping 24/7.`);
      return;
    }

    if (ctx.args.length < 2) {
      await ctx.reply(
        `⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\`\n` +
          `Vd: \`${ctx.prefix}${this.example}\` (8h-18h).`,
      );
      return;
    }

    const start = Number(ctx.args[0]);
    const end = Number(ctx.args[1]);
    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 0 ||
      start > 24 ||
      end < 0 ||
      end > 24
    ) {
      await ctx.reply(
        `⚠️ Giờ phải là số nguyên 0-24. Nhận: \`${ctx.args[0]}\` / \`${ctx.args[1]}\`.`,
      );
      return;
    }

    if (start === end) {
      await this.usersService.updateSettings(user.user_id, {
        work_start_hour: 0,
        work_end_hour: 0,
      });
      await ctx.reply(
        `ℹ️ Start === End → khung trống. Đã tắt khung giờ làm việc (ping 24/7).`,
      );
      return;
    }

    await this.usersService.updateSettings(user.user_id, {
      work_start_hour: start,
      work_end_hour: end,
    });

    const overnight = start > end ? " (qua đêm)" : "";
    await ctx.reply(
      `✅ Đã đặt khung giờ làm việc → **${start}h - ${end}h**${overnight}.\n` +
        `Reminder ngoài khung sẽ tự dồn về \`${start}h\` ngày kế tiếp.`,
    );
  }
}
