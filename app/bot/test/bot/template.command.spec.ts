import { Test, TestingModule } from "@nestjs/testing";
import {
  TaoTemplateCommand,
  TuTemplateCommand,
  DsTemplateCommand,
  XoaTemplateCommand,
} from "../../src/bot/commands/template.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { SchedulesService } from "../../src/schedules/schedules.service";
import { TemplatesService } from "../../src/schedules/templates.service";
import { DateParser } from "../../src/shared/utils/date-parser";
import { CommandContext } from "../../src/bot/commands/command.types";

const mkCtx = (args: string[]): CommandContext =>
  ({
    message: {
      message_id: "msg",
      channel_id: "ch",
      sender_id: "u1",
    } as any,
    rawArgs: args.join(" "),
    prefix: "*",
    args,
    reply: jest.fn(),
    send: jest.fn(),
    sendDM: jest.fn(),
    ephemeralReply: jest.fn(),
  }) as any;

describe("Template commands", () => {
  let registry: jest.Mocked<CommandRegistry>;
  let users: jest.Mocked<UsersService>;
  let schedules: jest.Mocked<SchedulesService>;
  let templates: jest.Mocked<TemplatesService>;

  beforeEach(() => {
    registry = { register: jest.fn() } as any;
    users = { findByUserId: jest.fn() } as any;
    schedules = { findById: jest.fn(), create: jest.fn() } as any;
    templates = {
      existsByName: jest.fn(),
      createFromSchedule: jest.fn(),
      findByName: jest.fn(),
      listForUser: jest.fn(),
      deleteByName: jest.fn(),
    } as any;
  });

  afterEach(() => jest.clearAllMocks());

  describe("TaoTemplateCommand", () => {
    let cmd: TaoTemplateCommand;
    beforeEach(async () => {
      const m: TestingModule = await Test.createTestingModule({
        providers: [
          TaoTemplateCommand,
          { provide: CommandRegistry, useValue: registry },
          { provide: UsersService, useValue: users },
          { provide: SchedulesService, useValue: schedules },
          { provide: TemplatesService, useValue: templates },
        ],
      }).compile();
      cmd = m.get(TaoTemplateCommand);
    });

    it("registers itself", () => {
      cmd.onModuleInit();
      expect(registry.register).toHaveBeenCalledWith(cmd);
    });

    it("rejects no user", async () => {
      users.findByUserId.mockResolvedValue(null);
      const ctx = mkCtx(["test", "5"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("chưa khởi tạo"),
      );
    });

    it("rejects missing args", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      const ctx = mkCtx(["test"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Cú pháp"),
      );
    });

    it("rejects bad name", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      const ctx = mkCtx(["bad name", "5"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("không hợp lệ"),
      );
    });

    it("rejects bad ID", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      const ctx = mkCtx(["test", "abc"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("ID lịch không hợp lệ"),
      );
    });

    it("rejects when schedule not found", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      schedules.findById.mockResolvedValue(null);
      const ctx = mkCtx(["test", "5"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Không tìm thấy lịch"),
      );
    });

    it("rejects when name exists", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      schedules.findById.mockResolvedValue({ id: 5 } as any);
      templates.existsByName.mockResolvedValue(true);
      const ctx = mkCtx(["test", "5"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("đã có template"),
      );
    });

    it("creates template successfully", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      schedules.findById.mockResolvedValue({ id: 5 } as any);
      templates.existsByName.mockResolvedValue(false);
      templates.createFromSchedule.mockResolvedValue({
        name: "test",
        title: "Họp",
        item_type: "meeting",
        priority: "normal",
        duration_minutes: 60,
        default_remind_minutes: 15,
        description: null,
      } as any);
      const ctx = mkCtx(["test", "5"]);
      await cmd.execute(ctx);
      expect(templates.createFromSchedule).toHaveBeenCalledWith(
        "u1",
        "test",
        expect.any(Object),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Đã lưu template"),
      );
    });
  });

  describe("TuTemplateCommand", () => {
    let cmd: TuTemplateCommand;
    beforeEach(async () => {
      const m: TestingModule = await Test.createTestingModule({
        providers: [
          TuTemplateCommand,
          { provide: CommandRegistry, useValue: registry },
          { provide: UsersService, useValue: users },
          { provide: SchedulesService, useValue: schedules },
          { provide: TemplatesService, useValue: templates },
          DateParser,
        ],
      }).compile();
      cmd = m.get(TuTemplateCommand);
    });

    it("creates schedule with end_time + remind_at from template", async () => {
      users.findByUserId.mockResolvedValue({
        user_id: "u1",
        settings: { default_remind_minutes: 30 },
      } as any);
      templates.findByName.mockResolvedValue({
        name: "test",
        item_type: "meeting",
        title: "Họp",
        description: "desc",
        duration_minutes: 60,
        default_remind_minutes: 15,
        priority: "high",
      } as any);
      schedules.create.mockResolvedValue({
        id: 99,
        title: "Họp",
        priority: "high",
      } as any);

      const ctx = mkCtx(["test", "28-04-2026", "09:00"]);
      await cmd.execute(ctx);

      expect(schedules.create).toHaveBeenCalled();
      const call = schedules.create.mock.calls[0][0];
      expect(call.title).toBe("Họp");
      expect(call.priority).toBe("high");
      expect(call.end_time).not.toBeNull();
      expect(call.remind_at).not.toBeNull();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Đã tạo lịch"),
      );
    });

    it("uses settings remind_minutes when template has none", async () => {
      users.findByUserId.mockResolvedValue({
        user_id: "u1",
        settings: { default_remind_minutes: 30 },
      } as any);
      templates.findByName.mockResolvedValue({
        name: "t",
        item_type: "task",
        title: "T",
        description: null,
        duration_minutes: null,
        default_remind_minutes: null,
        priority: "normal",
      } as any);
      schedules.create.mockResolvedValue({ id: 1, title: "T", priority: "normal" } as any);

      const ctx = mkCtx(["t", "28-04-2026", "09:00"]);
      await cmd.execute(ctx);

      const call = schedules.create.mock.calls[0][0];
      expect(call.end_time).toBeNull();
      expect(call.remind_at).not.toBeNull();
    });

    it("rejects when template not found", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      templates.findByName.mockResolvedValue(null);
      const ctx = mkCtx(["nope", "28-04-2026", "09:00"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Không tìm thấy template"),
      );
    });

    it("rejects bad date", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      templates.findByName.mockResolvedValue({
        name: "t",
        item_type: "task",
        title: "T",
        description: null,
        duration_minutes: null,
        default_remind_minutes: null,
        priority: "normal",
      } as any);
      const ctx = mkCtx(["t", "garbage"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Thời gian không hợp lệ"),
      );
    });
  });

  describe("DsTemplateCommand", () => {
    let cmd: DsTemplateCommand;
    beforeEach(async () => {
      const m: TestingModule = await Test.createTestingModule({
        providers: [
          DsTemplateCommand,
          { provide: CommandRegistry, useValue: registry },
          { provide: UsersService, useValue: users },
          { provide: TemplatesService, useValue: templates },
        ],
      }).compile();
      cmd = m.get(DsTemplateCommand);
    });

    it("shows empty state", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      templates.listForUser.mockResolvedValue([]);
      const ctx = mkCtx([]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("chưa có template"),
      );
    });

    it("lists templates", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      templates.listForUser.mockResolvedValue([
        {
          name: "hop",
          title: "Họp",
          item_type: "meeting",
          priority: "high",
          duration_minutes: 60,
          default_remind_minutes: 15,
          description: null,
        } as any,
      ]);
      const ctx = mkCtx([]);
      await cmd.execute(ctx);
      const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
      expect(reply).toContain("Templates của bạn");
      expect(reply).toContain("hop");
    });
  });

  describe("XoaTemplateCommand", () => {
    let cmd: XoaTemplateCommand;
    beforeEach(async () => {
      const m: TestingModule = await Test.createTestingModule({
        providers: [
          XoaTemplateCommand,
          { provide: CommandRegistry, useValue: registry },
          { provide: UsersService, useValue: users },
          { provide: TemplatesService, useValue: templates },
        ],
      }).compile();
      cmd = m.get(XoaTemplateCommand);
    });

    it("rejects when not found", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      templates.deleteByName.mockResolvedValue(false);
      const ctx = mkCtx(["nope"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Không tìm thấy template"),
      );
    });

    it("deletes successfully", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      templates.deleteByName.mockResolvedValue(true);
      const ctx = mkCtx(["test"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Đã xoá template"),
      );
    });

    it("rejects without name", async () => {
      users.findByUserId.mockResolvedValue({ user_id: "u1" } as any);
      const ctx = mkCtx([]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Cú pháp"),
      );
    });
  });
});
