import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { StreakService, streakBadge } from "../../schedules/streak.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

@Injectable()
export class StreakCommand implements BotCommand, OnModuleInit {
  readonly name = "streak";
  readonly aliases = ["chuoi", "chuoi-ngay", "gamification"];
  readonly description =
    "Xem chuỗi ngày liên tiếp hoàn-thành lịch + thống kê + huy hiệu";
  readonly category = "📊 THỐNG KÊ";
  readonly syntax = "streak";
  readonly example = "streak";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly streakService: StreakService,
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

    const stats = await this.streakService.computeStreak(user.user_id);
    const header = `【 CHUỖI HOÀN-THÀNH 】`;
    const separator = "━━━━━━━━━━━━━━━━━━━━";

    if (stats.totalCompleted === 0) {
      await ctx.reply(
        [
          header,
          separator,
          "",
          "📭 Bạn chưa hoàn-thành lịch nào.",
          `💡 Bắt đầu bằng \`${ctx.prefix}hoan-thanh <ID>\` để khởi chuỗi!`,
        ].join("\n"),
      );
      return;
    }

    const badge = streakBadge(stats.currentStreak);
    const lines = [
      header,
      separator,
      "",
      `🔥 **Chuỗi hiện tại:** ${stats.currentStreak} ngày${
        badge ? ` — ${badge}` : ""
      }`,
      `🏅 **Kỷ lục cá nhân:** ${stats.longestStreak} ngày`,
      `📅 **Số ngày có hoàn-thành:** ${stats.daysActive}`,
      `✅ **Tổng lịch hoàn-thành:** ${stats.totalCompleted}`,
    ];
    if (stats.lastCompletedDate) {
      lines.push(`📌 Lần cuối: ${this.formatVNDate(stats.lastCompletedDate)}`);
    }
    lines.push("");
    lines.push(this.buildEncouragement(stats.currentStreak));

    await ctx.reply(lines.join("\n"));
  }

  private formatVNDate(key: string): string {
    const [y, m, d] = key.split("-");
    return `${d}/${m}/${y}`;
  }

  private buildEncouragement(current: number): string {
    if (current === 0) {
      return "💡 Hoàn-thành 1 lịch hôm nay để khởi chuỗi mới!";
    }
    const milestones = [3, 7, 14, 30, 100, 365];
    for (const m of milestones) {
      if (current < m) {
        return `🎯 Còn ${m - current} ngày nữa để đạt mốc ${m} ngày!`;
      }
    }
    return "🌌 Bạn đã vượt mọi mốc — duy trì chuỗi tiếp tục nhé!";
  }
}
