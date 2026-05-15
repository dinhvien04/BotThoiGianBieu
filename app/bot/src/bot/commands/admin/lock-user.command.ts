import { Injectable, OnModuleInit } from "@nestjs/common";
import { AdminService } from "../../../admin/admin.service";
import { UsersService } from "../../../users/users.service";
import { CommandRegistry } from "../command-registry";
import { BotCommand, CommandContext } from "../command.types";
import { requireAdmin } from "./admin-base";

@Injectable()
export class LockUserCommand implements BotCommand, OnModuleInit {
  readonly name = "lock-user";
  readonly aliases = ["khoa-user"];
  readonly description = "[Admin] Khoá tài khoản user";
  readonly category = "🛡️ ADMIN";
  readonly syntax = "lock-user <user_id>";
  readonly example = "lock-user 1234567890";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    if (!(await requireAdmin(ctx, this.usersService))) return;
    const target = (ctx.args[0] ?? "").trim();
    if (!target) {
      await ctx.reply(`❌ Thiếu user_id. VD: \`${ctx.prefix}${this.example}\``);
      return;
    }
    if (target === ctx.message.sender_id) {
      await ctx.reply("❌ Không thể tự khoá chính bạn.");
      return;
    }
    try {
      const updated = await this.adminService.setLocked(target, true);
      await ctx.reply(`🔒 Đã khoá tài khoản ${updated.user_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`❌ Không khoá được: ${msg}`);
    }
  }
}

@Injectable()
export class UnlockUserCommand implements BotCommand, OnModuleInit {
  readonly name = "unlock-user";
  readonly aliases = ["mokhoa-user"];
  readonly description = "[Admin] Mở khoá tài khoản user";
  readonly category = "🛡️ ADMIN";
  readonly syntax = "unlock-user <user_id>";
  readonly example = "unlock-user 1234567890";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly adminService: AdminService,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    if (!(await requireAdmin(ctx, this.usersService))) return;
    const target = (ctx.args[0] ?? "").trim();
    if (!target) {
      await ctx.reply(`❌ Thiếu user_id. VD: \`${ctx.prefix}${this.example}\``);
      return;
    }
    try {
      const updated = await this.adminService.setLocked(target, false);
      await ctx.reply(`🔓 Đã mở khoá tài khoản ${updated.user_id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`❌ Không mở khoá được: ${msg}`);
    }
  }
}
