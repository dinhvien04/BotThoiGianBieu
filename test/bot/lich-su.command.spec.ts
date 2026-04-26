import { Test, TestingModule } from "@nestjs/testing";
import { LichSuCommand } from "../../src/bot/commands/lich-su.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { SchedulesService } from "../../src/schedules/schedules.service";
import { AuditService } from "../../src/schedules/audit.service";
import { DateParser } from "../../src/shared/utils/date-parser";
import { CommandContext } from "../../src/bot/commands/command.types";

const mkCtx = (args: string[]): CommandContext =>
  ({
    message: { sender_id: "u1", message_id: "m", channel_id: "c" } as any,
    rawArgs: args.join(" "),
    prefix: "*",
    args,
    reply: jest.fn(),
    send: jest.fn(),
    sendDM: jest.fn(),
    ephemeralReply: jest.fn(),
  }) as any;

describe("LichSuCommand", () => {
  let cmd: LichSuCommand;
  let registry: jest.Mocked<CommandRegistry>;
  let users: jest.Mocked<UsersService>;
  let schedules: jest.Mocked<SchedulesService>;
  let audit: jest.Mocked<AuditService>;

  beforeEach(async () => {
    registry = { register: jest.fn() } as any;
    users = { findByUserId: jest.fn() } as any;
    schedules = { findById: jest.fn() } as any;
    audit = { findBySchedule: jest.fn() } as any;

    const m: TestingModule = await Test.createTestingModule({
      providers: [
        LichSuCommand,
        { provide: CommandRegistry, useValue: registry },
        { provide: UsersService, useValue: users },
        { provide: SchedulesService, useValue: schedules },
        { provide: AuditService, useValue: audit },
        DateParser,
      ],
    }).compile();

    cmd = m.get(LichSuCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("metadata", () => {
    expect(cmd.name).toBe("lich-su");
    expect(cmd.aliases).toContain("history");
  });

  it("registers itself", () => {
    cmd.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith(cmd);
  });

  it("rejects no user", async () => {
    users.findByUserId.mockResolvedValue(null);
    const ctx = mkCtx(["5"]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("chưa khởi tạo"),
    );
  });

  it("rejects missing ID", async () => {
    users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    const ctx = mkCtx([]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("Cú pháp"));
  });

  it("rejects bad ID", async () => {
    users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    const ctx = mkCtx(["abc"]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("ID không hợp lệ"),
    );
  });

  it("rejects when schedule not found", async () => {
    users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    schedules.findById.mockResolvedValue(null);
    const ctx = mkCtx(["5"]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Không tìm thấy lịch"),
    );
  });

  it("shows empty state when no audit logs", async () => {
    users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    schedules.findById.mockResolvedValue({ id: 5, title: "Họp" } as any);
    audit.findBySchedule.mockResolvedValue({ items: [], total: 0 });
    const ctx = mkCtx(["5"]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("chưa có lịch sử"),
    );
  });

  it("renders logs with action labels", async () => {
    users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    schedules.findById.mockResolvedValue({ id: 5, title: "Họp" } as any);
    audit.findBySchedule.mockResolvedValue({
      items: [
        {
          id: "2",
          schedule_id: 5,
          user_id: "u1",
          action: "update",
          changes: {
            title: { from: "Họp cũ", to: "Họp mới" },
          },
          created_at: new Date("2026-04-25T02:00:00Z"),
        } as any,
        {
          id: "1",
          schedule_id: 5,
          user_id: "u1",
          action: "create",
          changes: null,
          created_at: new Date("2026-04-24T02:00:00Z"),
        } as any,
      ],
      total: 2,
    });
    const ctx = mkCtx(["5"]);
    await cmd.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("Lịch sử lịch #5");
    expect(reply).toContain("Cập nhật");
    expect(reply).toContain("Tạo lịch");
    expect(reply).toContain("tiêu đề");
    expect(reply).toContain("Họp cũ");
    expect(reply).toContain("Họp mới");
  });

  it("paginates correctly", async () => {
    users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    schedules.findById.mockResolvedValue({ id: 5, title: "Họp" } as any);
    audit.findBySchedule.mockResolvedValue({
      items: Array(10)
        .fill(0)
        .map((_, i) => ({
          id: String(i),
          schedule_id: 5,
          user_id: "u1",
          action: "update",
          changes: null,
          created_at: new Date(),
        })) as any,
      total: 25,
    });
    const ctx = mkCtx(["5", "2"]);
    await cmd.execute(ctx);
    expect(audit.findBySchedule).toHaveBeenCalledWith(5, 10, 10);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("Trang 2/3");
  });

  it("rejects page out of range", async () => {
    users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    schedules.findById.mockResolvedValue({ id: 5, title: "Họp" } as any);
    audit.findBySchedule.mockResolvedValue({ items: [], total: 5 });
    const ctx = mkCtx(["5", "99"]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("vượt quá tổng số trang"),
    );
  });

  it("formats Date-typed change values", async () => {
    users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
    schedules.findById.mockResolvedValue({ id: 5, title: "Họp" } as any);
    audit.findBySchedule.mockResolvedValue({
      items: [
        {
          id: "1",
          schedule_id: 5,
          user_id: "u1",
          action: "update",
          changes: {
            start_time: {
              from: "2026-04-24T02:00:00.000Z",
              to: "2026-04-25T02:00:00.000Z",
            },
          },
          created_at: new Date("2026-04-25T02:00:00Z"),
        } as any,
      ],
      total: 1,
    });
    const ctx = mkCtx(["5"]);
    await cmd.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("giờ bắt đầu");
    expect(reply).toMatch(/\d{2}\/\d{2}\/\d{4}/);
  });
});
