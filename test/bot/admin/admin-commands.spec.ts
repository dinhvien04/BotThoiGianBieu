import { CommandRegistry } from "../../../app/bot/src/bot/commands/command-registry";
import type {
  CommandContext,
  BotCommand,
} from "../../../app/bot/src/bot/commands/command.types";
import { AdminStatsCommand } from "../../../app/bot/src/bot/commands/admin/admin-stats.command";
import { AdminBroadcastCommand } from "../../../app/bot/src/bot/commands/admin/admin-broadcast.command";
import {
  SetAdminCommand,
  RemoveAdminCommand,
} from "../../../app/bot/src/bot/commands/admin/set-admin.command";
import {
  LockUserCommand,
  UnlockUserCommand,
} from "../../../app/bot/src/bot/commands/admin/lock-user.command";

function makeCtx(
  args: string[],
  rawArgs: string,
  senderId = "admin-1",
): CommandContext {
  return {
    args,
    rawArgs,
    prefix: "*",
    message: { sender_id: senderId } as never,
    reply: jest.fn().mockResolvedValue(undefined),
  } as unknown as CommandContext;
}

const registry = new CommandRegistry();

const adminUser = {
  user_id: "admin-1",
  username: "boss",
  display_name: "Boss",
  role: "admin",
  is_locked: false,
};
const normalUser = {
  user_id: "u-1",
  username: "alice",
  display_name: "Alice",
  role: "user",
  is_locked: false,
};

describe("Admin bot commands", () => {
  let usersService: { findByUserId: jest.Mock };

  beforeEach(() => {
    usersService = { findByUserId: jest.fn() };
  });

  describe("requireAdmin guard", () => {
    it("rejects user not initialised", async () => {
      const adminService = {
        getDashboardStats: jest.fn(),
      };
      const cmd = new AdminStatsCommand(
        registry,
        adminService as never,
        usersService as never,
      );
      usersService.findByUserId.mockResolvedValue(null);
      const ctx = makeCtx([], "");
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("chưa khởi tạo"),
      );
      expect(adminService.getDashboardStats).not.toHaveBeenCalled();
    });

    it("rejects locked user", async () => {
      const adminService = { getDashboardStats: jest.fn() };
      const cmd = new AdminStatsCommand(
        registry,
        adminService as never,
        usersService as never,
      );
      usersService.findByUserId.mockResolvedValue({
        ...adminUser,
        is_locked: true,
      });
      const ctx = makeCtx([], "");
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("đang bị khoá"),
      );
    });

    it("rejects non-admin user", async () => {
      const adminService = { getDashboardStats: jest.fn() };
      const cmd = new AdminStatsCommand(
        registry,
        adminService as never,
        usersService as never,
      );
      usersService.findByUserId.mockResolvedValue(normalUser);
      const ctx = makeCtx([], "");
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("chỉ dành cho admin"),
      );
    });
  });

  describe("admin-stats", () => {
    it("formats KPI message for admin", async () => {
      const adminService = {
        getDashboardStats: jest.fn().mockResolvedValue({
          total_users: 10,
          total_admins: 2,
          locked_users: 1,
          total_schedules: 50,
          schedules_pending: 30,
          schedules_completed: 20,
          new_users_today: 3,
          new_schedules_today: 5,
          signups_last_30_days: [],
          schedules_last_30_days: [],
        }),
      };
      const cmd = new AdminStatsCommand(
        registry,
        adminService as never,
        usersService as never,
      );
      usersService.findByUserId.mockResolvedValue(adminUser);
      const ctx = makeCtx([], "");
      await cmd.execute(ctx);
      const msg = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
      expect(msg).toContain("Tổng user");
      expect(msg).toContain("10");
      expect(msg).toContain("50");
    });
  });

  describe("admin-broadcast", () => {
    it("rejects empty content", async () => {
      const broadcastService = { sendBroadcast: jest.fn() };
      const cmd = new AdminBroadcastCommand(
        registry,
        broadcastService as never,
        usersService as never,
      );
      usersService.findByUserId.mockResolvedValue(adminUser);
      const ctx = makeCtx([], "  ");
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Thiếu nội dung"),
      );
      expect(broadcastService.sendBroadcast).not.toHaveBeenCalled();
    });

    it("sends broadcast and reports counts", async () => {
      const broadcastService = {
        sendBroadcast: jest.fn().mockResolvedValue({
          total: 5,
          success: 4,
          failed: 1,
          failed_user_ids: ["u-2"],
        }),
      };
      const cmd = new AdminBroadcastCommand(
        registry,
        broadcastService as never,
        usersService as never,
      );
      usersService.findByUserId.mockResolvedValue(adminUser);
      const ctx = makeCtx(["hello", "world"], "hello world");
      await cmd.execute(ctx);
      expect(broadcastService.sendBroadcast).toHaveBeenCalledWith({
        senderUserId: "admin-1",
        message: "hello world",
        filter: { only_unlocked: true },
      });
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Tổng: 5"),
      );
    });
  });

  describe.each([
    ["set-admin", SetAdminCommand, "admin"],
    ["remove-admin", RemoveAdminCommand, "user"],
  ] as const)("%s command", (_label, Ctor, expectedRole) => {
    it("requires user_id arg", async () => {
      const adminService = { setRole: jest.fn() };
      const cmd: BotCommand = new Ctor(
        registry,
        adminService as never,
        usersService as never,
      );
      usersService.findByUserId.mockResolvedValue(adminUser);
      const ctx = makeCtx([], "");
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Thiếu user_id"),
      );
      expect(adminService.setRole).not.toHaveBeenCalled();
    });

    it("calls setRole with correct value", async () => {
      const adminService = {
        setRole: jest
          .fn()
          .mockResolvedValue({ ...normalUser, role: expectedRole }),
      };
      const cmd: BotCommand = new Ctor(
        registry,
        adminService as never,
        usersService as never,
      );
      usersService.findByUserId.mockResolvedValue(adminUser);
      const ctx = makeCtx(["u-1"], "u-1");
      await cmd.execute(ctx);
      expect(adminService.setRole).toHaveBeenCalledWith("u-1", expectedRole);
    });
  });

  it("remove-admin prevents self-demotion", async () => {
    const adminService = { setRole: jest.fn() };
    const cmd = new RemoveAdminCommand(
      registry,
      adminService as never,
      usersService as never,
    );
    usersService.findByUserId.mockResolvedValue(adminUser);
    const ctx = makeCtx(["admin-1"], "admin-1");
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("tự gỡ quyền admin"),
    );
    expect(adminService.setRole).not.toHaveBeenCalled();
  });

  describe.each([
    ["lock-user", LockUserCommand, true],
    ["unlock-user", UnlockUserCommand, false],
  ] as const)("%s command", (_label, Ctor, expectedFlag) => {
    it("requires user_id arg", async () => {
      const adminService = { setLocked: jest.fn() };
      const cmd: BotCommand = new Ctor(
        registry,
        adminService as never,
        usersService as never,
      );
      usersService.findByUserId.mockResolvedValue(adminUser);
      const ctx = makeCtx([], "");
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Thiếu user_id"),
      );
    });

    it("calls setLocked with correct value", async () => {
      const adminService = {
        setLocked: jest
          .fn()
          .mockResolvedValue({ ...normalUser, is_locked: expectedFlag }),
      };
      const cmd: BotCommand = new Ctor(
        registry,
        adminService as never,
        usersService as never,
      );
      usersService.findByUserId.mockResolvedValue(adminUser);
      const ctx = makeCtx(["u-1"], "u-1");
      await cmd.execute(ctx);
      expect(adminService.setLocked).toHaveBeenCalledWith("u-1", expectedFlag);
    });
  });

  it("lock-user prevents self-lock", async () => {
    const adminService = { setLocked: jest.fn() };
    const cmd = new LockUserCommand(
      registry,
      adminService as never,
      usersService as never,
    );
    usersService.findByUserId.mockResolvedValue(adminUser);
    const ctx = makeCtx(["admin-1"], "admin-1");
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("tự khoá"),
    );
    expect(adminService.setLocked).not.toHaveBeenCalled();
  });
});
