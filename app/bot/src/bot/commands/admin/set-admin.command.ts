import { Injectable, OnModuleInit } from "@nestjs/common";
import { AdminService } from "../../../admin/admin.service";
import { UsersService } from "../../../users/users.service";
import { CommandRegistry } from "../command-registry";
import { BotCommand, CommandContext } from "../command.types";
import { requireAdmin } from "./admin-base";

@Injectable()
export class SetAdminCommand implements BotCommand, OnModuleInit {
  readonly name = "set-admin";
  readonly aliases = ["promote-admin"];
  readonly description = "[Admin] Promote user thành admin";
  readonly category = "🛡️ ADMIN";
  readonly syntax = "set-admin <user_id>";
  readonly example = "set-admin 1234567890";

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
      const updated = await this.adminService.setRole(target, "admin");
      await ctx.reply(
        `✅ ${updated.display_name ?? updated.username ?? updated.user_id} (${updated.user_id}) đã được promote thành **admin**`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`❌ Không promote được: ${msg}`);
    }
  }
}

@Injectable()
export class RemoveAdminCommand implements BotCommand, OnModuleInit {
  readonly name = "remove-admin";
  readonly aliases = ["demote-admin"];
  readonly description = "[Admin] Hạ quyền admin về user thường";
  readonly category = "🛡️ ADMIN";
  readonly syntax = "remove-admin <user_id>";
  readonly example = "remove-admin 1234567890";

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
      await ctx.reply("❌ Không thể tự gỡ quyền admin của chính bạn.");
      return;
    }
    try {
      const updated = await this.adminService.setRole(target, "user");
      await ctx.reply(
        `✅ ${updated.display_name ?? updated.username ?? updated.user_id} (${updated.user_id}) đã chuyển về **user** thường`,
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await ctx.reply(`❌ Không demote được: ${msg}`);
    }
  }
}
