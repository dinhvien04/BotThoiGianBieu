import { Injectable, OnModuleInit } from "@nestjs/common";
import { BroadcastService } from "../../../admin/broadcast.service";
import { UsersService } from "../../../users/users.service";
import { CommandRegistry } from "../command-registry";
import { BotCommand, CommandContext } from "../command.types";
import { requireAdmin } from "./admin-base";

@Injectable()
export class AdminBroadcastCommand implements BotCommand, OnModuleInit {
  readonly name = "admin-broadcast";
  readonly aliases = ["broadcast"];
  readonly description = "[Admin] Gửi DM cho tất cả user";
  readonly category = "🛡️ ADMIN";
  readonly syntax = "admin-broadcast <nội dung>";
  readonly example = "admin-broadcast Hệ thống sẽ bảo trì lúc 22h tối nay";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly broadcastService: BroadcastService,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    if (!(await requireAdmin(ctx, this.usersService))) return;
    const message = ctx.rawArgs.trim();
    if (!message) {
      await ctx.reply(
        `❌ Thiếu nội dung. VD: \`${ctx.prefix}${this.example}\``,
      );
      return;
    }
    const result = await this.broadcastService.sendBroadcast({
      senderUserId: ctx.message.sender_id,
      message,
      filter: { only_unlocked: true },
    });
    await ctx.reply(
      `📣 Đã broadcast. Tổng: ${result.total} | Thành công: ${result.success} | Lỗi: ${result.failed}`,
    );
  }
}
