import { AdminStatsCommand } from "src/bot/commands/admin/admin-stats.command";
import { CommandRegistry } from "src/bot/commands/command-registry";
import type { CommandContext } from "src/bot/commands/command.types";
import { AdminService } from "src/admin/admin.service";
import { UsersService } from "src/users/users.service";

describe("AdminStatsCommand", () => {
  let registry: jest.Mocked<Pick<CommandRegistry, "register">>;
  let adminService: jest.Mocked<Pick<AdminService, "getDashboardStats">>;
  let usersService: jest.Mocked<Pick<UsersService, "findByUserId">>;
  let command: AdminStatsCommand;

  const adminUser = {
    user_id: "admin-1",
    role: "admin",
    is_locked: false,
  };

  const stats = {
    total_users: 12,
    total_admins: 2,
    locked_users: 1,
    total_schedules: 45,
    schedules_pending: 30,
    schedules_completed: 15,
    new_users_today: 3,
    new_schedules_today: 4,
    signups_last_30_days: [],
    schedules_last_30_days: [],
  };

  function makeContext(senderId = "admin-1", prefix = "*"): CommandContext {
    return {
      message: {
        message_id: "m1",
        channel_id: "c1",
        sender_id: senderId,
      },
      rawArgs: "",
      args: [],
      prefix,
      reply: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
      sendDM: jest.fn().mockResolvedValue(undefined),
      ephemeralReply: jest.fn().mockResolvedValue(undefined),
    } as unknown as CommandContext;
  }

  beforeEach(() => {
    registry = { register: jest.fn() };
    adminService = { getDashboardStats: jest.fn().mockResolvedValue(stats) };
    usersService = { findByUserId: jest.fn().mockResolvedValue(adminUser) };
    command = new AdminStatsCommand(
      registry as unknown as CommandRegistry,
      adminService as unknown as AdminService,
      usersService as unknown as UsersService,
    );
  });

  it("declares stable command metadata", () => {
    expect(command.name).toBe("admin-stats");
    expect(command.aliases).toEqual(["admin-thong-ke"]);
    expect(command.syntax).toBe("admin-stats");
    expect(command.description).toContain("[Admin]");
  });

  it("registers itself on module init", () => {
    command.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith(command);
  });

  it("looks up admin rights by sender id", async () => {
    const ctx = makeContext("sender-42");
    await command.execute(ctx);
    expect(usersService.findByUserId).toHaveBeenCalledWith("sender-42");
  });

  it("rejects uninitialized users before querying stats", async () => {
    usersService.findByUserId.mockResolvedValueOnce(null);
    const ctx = makeContext();

    await command.execute(ctx);

    expect(adminService.getDashboardStats).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("bat-dau"));
  });

  it("rejects locked admins before querying stats", async () => {
    usersService.findByUserId.mockResolvedValueOnce({
      ...adminUser,
      is_locked: true,
    } as never);
    const ctx = makeContext();

    await command.execute(ctx);

    expect(adminService.getDashboardStats).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("kho"));
  });

  it("rejects normal users before querying stats", async () => {
    usersService.findByUserId.mockResolvedValueOnce({
      user_id: "u1",
      role: "user",
      is_locked: false,
    } as never);
    const ctx = makeContext();

    await command.execute(ctx);

    expect(adminService.getDashboardStats).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("admin"));
  });

  it("renders plain text KPI output for admins", async () => {
    const ctx = makeContext();

    await command.execute(ctx);

    expect(adminService.getDashboardStats).toHaveBeenCalledTimes(1);
    expect(ctx.reply).toHaveBeenCalledWith(
      [
        "Thong ke he thong",
        "",
        "Tong user: 12 (admin: 2, khoa: 1)",
        "Tong lich: 45 (pending: 30, hoan thanh: 15)",
        "",
        "Hom nay: 3 user moi, 4 lich moi",
      ].join("\n"),
    );
  });

  it("does not emit markdown markers that Mezon may render as a poll", async () => {
    const ctx = makeContext();

    await command.execute(ctx);

    const message = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(message).not.toContain("**");
    expect(message).not.toContain("📊");
    expect(message).not.toContain("Binh chon");
    expect(message).not.toContain("Chon mot dap an");
  });

  it("keeps zero-valued stats visible", async () => {
    adminService.getDashboardStats.mockResolvedValueOnce({
      ...stats,
      total_users: 0,
      total_admins: 0,
      locked_users: 0,
      total_schedules: 0,
      schedules_pending: 0,
      schedules_completed: 0,
      new_users_today: 0,
      new_schedules_today: 0,
    });
    const ctx = makeContext();

    await command.execute(ctx);

    const message = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(message).toContain("Tong user: 0");
    expect(message).toContain("Tong lich: 0");
    expect(message).toContain("Hom nay: 0 user moi, 0 lich moi");
  });
});
