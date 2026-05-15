import { BadRequestException } from "@nestjs/common";
import { AdminController } from "../../../app/bot/src/admin/admin.controller";

type ReqType = {
  session: { sub: string; username: string | null; displayName: string | null };
};

const reqAdmin: ReqType = {
  session: { sub: "admin-1", username: "admin", displayName: "Admin" },
};

describe("AdminController", () => {
  let admin: {
    getDashboardStats: jest.Mock;
    listUsers: jest.Mock;
    getUserDetail: jest.Mock;
    setRole: jest.Mock;
    setLocked: jest.Mock;
    deleteUser: jest.Mock;
    listSchedules: jest.Mock;
    deleteSchedule: jest.Mock;
    listAuditLogs: jest.Mock;
    listBroadcasts: jest.Mock;
    getAllSettings: jest.Mock;
    setSetting: jest.Mock;
  };
  let broadcast: { sendBroadcast: jest.Mock };
  let controller: AdminController;

  beforeEach(() => {
    admin = {
      getDashboardStats: jest.fn().mockResolvedValue({ total_users: 1 }),
      listUsers: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getUserDetail: jest.fn().mockResolvedValue({ user: { user_id: "u" } }),
      setRole: jest.fn().mockResolvedValue({ user_id: "u", role: "admin" }),
      setLocked: jest.fn().mockResolvedValue({ user_id: "u", is_locked: true }),
      deleteUser: jest.fn().mockResolvedValue(undefined),
      listSchedules: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      deleteSchedule: jest.fn().mockResolvedValue(undefined),
      listAuditLogs: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      listBroadcasts: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      getAllSettings: jest.fn().mockResolvedValue({ k: 1 }),
      setSetting: jest
        .fn()
        .mockResolvedValue({ key: "k", value: 2 }),
    };
    broadcast = {
      sendBroadcast: jest
        .fn()
        .mockResolvedValue({ total: 1, success: 1, failed: 0, failed_user_ids: [] }),
    };
    controller = new AdminController(admin as never, broadcast as never);
  });

  it("me returns session info", () => {
    expect(controller.me(reqAdmin as never)).toEqual({
      success: true,
      user: { user_id: "admin-1", username: "admin", display_name: "Admin" },
    });
  });

  it("stats calls service", async () => {
    const res = await controller.stats();
    expect(res.success).toBe(true);
    expect(res.stats).toEqual({ total_users: 1 });
  });

  it("listUsers validates role", async () => {
    await expect(
      controller.listUsers(undefined, undefined, undefined, "bogus"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("listUsers parses booleans and pagination", async () => {
    await controller.listUsers("2", "5", "alice", "user", "true");
    expect(admin.listUsers).toHaveBeenCalledWith({
      page: 2,
      limit: 5,
      search: "alice",
      role: "user",
      locked: true,
    });
  });

  it("setRole rejects invalid role", async () => {
    await expect(
      controller.setRole("u-1", { role: "bogus" }, reqAdmin as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("setRole prevents self-demotion", async () => {
    await expect(
      controller.setRole("admin-1", { role: "user" }, reqAdmin as never),
    ).rejects.toThrow("tự gỡ quyền admin");
  });

  it("setLocked requires boolean", async () => {
    await expect(
      controller.setLocked("u-1", {}, reqAdmin as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("setLocked prevents self-lock", async () => {
    await expect(
      controller.setLocked(
        "admin-1",
        { locked: true },
        reqAdmin as never,
      ),
    ).rejects.toThrow("tự khoá");
  });

  it("deleteUser prevents self-delete", async () => {
    await expect(
      controller.deleteUser("admin-1", reqAdmin as never),
    ).rejects.toThrow("tự xoá");
  });

  it("deleteUser succeeds for other user", async () => {
    const res = await controller.deleteUser("other", reqAdmin as never);
    expect(res.success).toBe(true);
    expect(admin.deleteUser).toHaveBeenCalledWith("other");
  });

  it("listSchedules rejects bogus status", async () => {
    await expect(
      controller.listSchedules(undefined, undefined, undefined, "wrong"),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("deleteSchedule passes id", async () => {
    await controller.deleteSchedule(7);
    expect(admin.deleteSchedule).toHaveBeenCalledWith(7);
  });

  it("listAudit parses schedule_id", async () => {
    await controller.listAudit("1", "10", "u", "create", "42");
    expect(admin.listAuditLogs).toHaveBeenCalledWith({
      page: 1,
      limit: 10,
      user_id: "u",
      action: "create",
      schedule_id: 42,
    });
  });

  it("sendBroadcast requires non-empty message", async () => {
    await expect(
      controller.sendBroadcast({ message: "  " }, reqAdmin as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("sendBroadcast validates filter.role", async () => {
    await expect(
      controller.sendBroadcast(
        { message: "hi", filter: { role: "bogus" } },
        reqAdmin as never,
      ),
    ).rejects.toThrow("filter.role không hợp lệ");
  });

  it("sendBroadcast passes filter and sender", async () => {
    await controller.sendBroadcast(
      { message: " hello ", filter: { role: "user", only_unlocked: true } },
      reqAdmin as never,
    );
    expect(broadcast.sendBroadcast).toHaveBeenCalledWith({
      senderUserId: "admin-1",
      message: "hello",
      filter: { role: "user", only_unlocked: true },
    });
  });

  it("listBroadcasts wraps result", async () => {
    const res = await controller.listBroadcasts("1", "10");
    expect(res.success).toBe(true);
  });

  it("getSettings wraps result", async () => {
    const res = await controller.getSettings();
    expect(res.settings).toEqual({ k: 1 });
  });

  it("setSetting requires value", async () => {
    await expect(
      controller.setSetting("k", {}, reqAdmin as never),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it("setSetting passes value and sender", async () => {
    await controller.setSetting("k", { value: 9 }, reqAdmin as never);
    expect(admin.setSetting).toHaveBeenCalledWith("k", 9, "admin-1");
  });
});
