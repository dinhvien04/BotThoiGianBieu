import { Test, TestingModule } from "@nestjs/testing";
import { HoanTacCommand } from "../../src/bot/commands/hoan-tac.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { SchedulesService } from "../../src/schedules/schedules.service";
import { UndoService } from "../../src/schedules/undo.service";
import { MessageFormatter } from "../../src/shared/utils/message-formatter";
import { CommandContext } from "../../src/bot/commands/command.types";
import { User } from "../../src/users/entities/user.entity";
import { Schedule } from "../../src/schedules/entities/schedule.entity";

describe("HoanTacCommand", () => {
  let command: HoanTacCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockUndoService: jest.Mocked<UndoService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = { user_id: "user123" } as any;

  const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule =>
    ({
      id: 5,
      user_id: "user123",
      title: "Họp",
      status: "pending",
      start_time: new Date("2026-04-24T02:00:00Z"),
      end_time: null,
      remind_at: null,
      acknowledged_at: null,
      end_notified_at: null,
      recurrence_type: "none",
      recurrence_interval: 1,
      recurrence_until: null,
      priority: "normal",
      ...overrides,
    }) as any;

  const buildContext = (args: string[] = []): CommandContext => ({
    message: {
      message_id: "msg",
      channel_id: "ch",
      sender_id: "user123",
      username: "u",
    } as any,
    rawArgs: args.join(" "),
    prefix: "*",
    args,
    reply: jest.fn(),
    send: jest.fn(),
    sendDM: jest.fn(),
    ephemeralReply: jest.fn(),
  });

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSchedulesService = {
      findById: jest.fn(),
      restoreFromSnapshot: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;
    mockUndoService = {
      pop: jest.fn(),
      peek: jest.fn(),
      record: jest.fn(),
      clear: jest.fn(),
    } as any;
    mockFormatter = { formatNotInitialized: jest.fn(() => "NOT_INIT") } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HoanTacCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: UndoService, useValue: mockUndoService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<HoanTacCommand>(HoanTacCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("should expose metadata", () => {
    expect(command.name).toBe("hoan-tac");
    expect(command.aliases).toEqual(["hoantac", "undo"]);
  });

  it("should register on module init", () => {
    command.onModuleInit();
    expect(mockRegistry.register).toHaveBeenCalledWith(command);
  });

  it("should reject extra args", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["foo"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("không nhận tham số"),
    );
  });

  it("should warn when user not initialized", async () => {
    mockUsersService.findByUserId.mockResolvedValue(null);
    const ctx = buildContext();
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
  });

  it("should report empty when nothing to undo", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockUndoService.pop.mockReturnValue(null);
    const ctx = buildContext();
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Không có thao tác nào"),
    );
  });

  describe("undo delete", () => {
    it("should restore deleted schedule from snapshot", async () => {
      const snapshot = makeSchedule({ id: 7, title: "Phỏng vấn" });
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockUndoService.pop.mockReturnValue({
        kind: "delete",
        schedule: snapshot,
        recordedAt: new Date(),
      });
      mockSchedulesService.findById.mockResolvedValue(null);
      mockSchedulesService.restoreFromSnapshot.mockResolvedValue(snapshot);

      const ctx = buildContext();
      await command.execute(ctx);

      expect(mockSchedulesService.restoreFromSnapshot).toHaveBeenCalledWith(
        snapshot,
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Đã khôi phục lịch `#7`"),
      );
    });

    it("should refuse if schedule already exists", async () => {
      const snapshot = makeSchedule({ id: 7 });
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockUndoService.pop.mockReturnValue({
        kind: "delete",
        schedule: snapshot,
        recordedAt: new Date(),
      });
      mockSchedulesService.findById.mockResolvedValue(snapshot);

      const ctx = buildContext();
      await command.execute(ctx);

      expect(mockSchedulesService.restoreFromSnapshot).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("đã được tạo lại"),
      );
    });

    it("should report failure when restore throws", async () => {
      const snapshot = makeSchedule({ id: 7 });
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockUndoService.pop.mockReturnValue({
        kind: "delete",
        schedule: snapshot,
        recordedAt: new Date(),
      });
      mockSchedulesService.findById.mockResolvedValue(null);
      mockSchedulesService.restoreFromSnapshot.mockRejectedValue(
        new Error("boom"),
      );

      const ctx = buildContext();
      await command.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Không thể khôi phục"),
      );
    });
  });

  describe("undo complete", () => {
    it("should revert status + remind_at and not delete spawned when none", async () => {
      const schedule = makeSchedule({ id: 5, status: "completed" });
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockUndoService.pop.mockReturnValue({
        kind: "complete",
        scheduleId: 5,
        scheduleTitle: "Họp",
        prevStatus: "pending",
        prevRemindAt: new Date("2026-04-24T01:45:00Z"),
        prevAcknowledgedAt: null,
        prevEndNotifiedAt: null,
        spawnedNextId: null,
        recordedAt: new Date(),
      });
      mockSchedulesService.findById.mockResolvedValue(schedule);

      const ctx = buildContext();
      await command.execute(ctx);

      expect(mockSchedulesService.update).toHaveBeenCalledWith(5, {
        status: "pending",
        remind_at: new Date("2026-04-24T01:45:00Z"),
        acknowledged_at: null,
        end_notified_at: null,
      });
      expect(mockSchedulesService.delete).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Đã hoàn tác"),
      );
    });

    it("should also delete spawned next when present", async () => {
      const schedule = makeSchedule({ id: 5, status: "completed" });
      const spawned = makeSchedule({ id: 99 });
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockUndoService.pop.mockReturnValue({
        kind: "complete",
        scheduleId: 5,
        scheduleTitle: "Họp",
        prevStatus: "pending",
        prevRemindAt: null,
        prevAcknowledgedAt: null,
        prevEndNotifiedAt: null,
        spawnedNextId: 99,
        recordedAt: new Date(),
      });
      mockSchedulesService.findById
        .mockResolvedValueOnce(schedule) // primary lookup
        .mockResolvedValueOnce(spawned); // spawned lookup

      const ctx = buildContext();
      await command.execute(ctx);

      expect(mockSchedulesService.update).toHaveBeenCalled();
      expect(mockSchedulesService.delete).toHaveBeenCalledWith(99);
      const replyArg = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
      expect(replyArg).toContain("Đã xoá lịch lặp kế tiếp `#99`");
    });

    it("should warn if schedule was deleted after complete", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockUndoService.pop.mockReturnValue({
        kind: "complete",
        scheduleId: 5,
        scheduleTitle: "Họp",
        prevStatus: "pending",
        prevRemindAt: null,
        prevAcknowledgedAt: null,
        prevEndNotifiedAt: null,
        spawnedNextId: null,
        recordedAt: new Date(),
      });
      mockSchedulesService.findById.mockResolvedValue(null);

      const ctx = buildContext();
      await command.execute(ctx);
      expect(mockSchedulesService.update).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Không tìm thấy lịch"),
      );
    });
  });
});
