import { Injectable, OnModuleInit } from "@nestjs/common";
import { AdminService } from "../../../admin/admin.service";
import { UsersService } from "../../../users/users.service";
import { CommandRegistry } from "../command-registry";
import { BotCommand, CommandContext } from "../command.types";
import { requireAdmin } from "./admin-base";

@Injectable()
export class AdminStatsCommand implements BotCommand, OnModuleInit {
  readonly name = "admin-stats";
  readonly aliases = ["admin-thong-ke"];
  readonly description = "[Admin] Xem KPI hệ thống";
  readonly category = "🛡️ ADMIN";
  readonly syntax = "admin-stats";

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
    const s = await this.adminService.getDashboardStats();
    const lines = [
      "Thong ke he thong",
      "",
      `Tong user: ${s.total_users} (admin: ${s.total_admins}, khoa: ${s.locked_users})`,
      `Tong lich: ${s.total_schedules} (pending: ${s.schedules_pending}, hoan thanh: ${s.schedules_completed})`,
      "",
      `Hom nay: ${s.new_users_today} user moi, ${s.new_schedules_today} lich moi`,
    ];
    await ctx.reply(lines.join("\n"));
  }
}
