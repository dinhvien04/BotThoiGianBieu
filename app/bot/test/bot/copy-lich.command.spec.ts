import { Test, TestingModule } from "@nestjs/testing";
import { CopyLichCommand } from "../../src/bot/commands/copy-lich.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { SchedulesService } from "../../src/schedules/schedules.service";
import { MessageFormatter } from "../../src/shared/utils/message-formatter";
import { DateParser } from "../../src/shared/utils/date-parser";
import { CommandContext } from "../../src/bot/commands/command.types";
import { User } from "../../src/users/entities/user.entity";
import { Schedule } from "../../src/schedules/entities/schedule.entity";

describe("CopyLichCommand", () => {
  let command: CopyLichCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = { user_id: "user123" } as any;

  const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule =>
    ({
      id: 5,
      user_id: "user123",
      item_type: "task",
      title: "Họp team",
      description: "Sprint review",
      start_time: new Date("2026-04-24T02:00:00Z"), // 09:00 VN
      end_time: new Date("2026-04-24T03:00:00Z"), // 10:00 VN
      status: "pending",
      remind_at: new Date("2026-04-24T01:45:00Z"), // -15p
      is_reminded: false,
      acknowledged_at: null,
      end_notified_at: null,
      recurrence_type: "none",
      recurrence_interval: 1,
      recurrence_until: null,
      priority: "high",
      recurrence_parent_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    }) as any;

  const buildContext = (args: string[]): CommandContext => ({
    message: {
      message_id: "msg",
      channel_id: "ch",
      sender_id: "user123",
      username: "testuser",
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
      create: jest.fn(),
    } as any;
    mockFormatter = { formatNotInitialized: jest.fn(() => "NOT_INIT") } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CopyLichCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
        DateParser,
      ],
    }).compile();

    command = module.get<CopyLichCommand>(CopyLichCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("should expose metadata", () => {
    expect(command.name).toBe("copy-lich");
    expect(command.aliases).toEqual(["copylich", "copy", "duplicate"]);
  });

  it("should register itself on module init", () => {
    command.onModuleInit();
    expect(mockRegistry.register).toHaveBeenCalledWith(command);
  });

  it("should warn when user not initialized", async () => {
    mockUsersService.findByUserId.mockResolvedValue(null);
    const ctx = buildContext(["5", "21-4-2026"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
  });

  it("should warn on bad usage (missing date)", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["5"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Sai cú pháp"),
    );
  });

  it("should warn on invalid ID", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["abc", "21-4-2026"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("ID không hợp lệ"),
    );
  });

  it("should warn when schedule not found", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(null);
    const ctx = buildContext(["5", "21-4-2026"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Không tìm thấy"),
    );
    expect(mockSchedulesService.create).not.toHaveBeenCalled();
  });

  it("should warn on invalid date", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(makeSchedule());
    const ctx = buildContext(["5", "blah"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Không nhận diện được ngày"),
    );
    expect(mockSchedulesService.create).not.toHaveBeenCalled();
  });

  it("should copy preserving original time when only date provided", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(makeSchedule());
    mockSchedulesService.create.mockImplementation(async (input) => ({
      id: 99,
      ...input,
      priority: input.priority ?? "normal",
      status: "pending",
    }) as any);

    const ctx = buildContext(["5", "30-4-2026"]);
    await command.execute(ctx);

    expect(mockSchedulesService.create).toHaveBeenCalledTimes(1);
    const arg = mockSchedulesService.create.mock.calls[0][0];
    // Source = 09:00 VN ngày 24-4 → copy phải là 09:00 VN ngày 30-4 (UTC = 02:00)
    expect(arg.start_time.toISOString()).toBe("2026-04-30T02:00:00.000Z");
    // end giữ nguyên độ dài 60 phút
    expect(arg.end_time?.toISOString()).toBe("2026-04-30T03:00:00.000Z");
    // remind giữ nguyên offset -15p
    expect(arg.remind_at?.toISOString()).toBe("2026-04-30T01:45:00.000Z");
    // priority + meta được copy
    expect(arg.priority).toBe("high");
    expect(arg.title).toBe("Họp team");
    expect(arg.description).toBe("Sprint review");

    const replyArg = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(replyArg).toContain("Đã sao chép lịch #5 → #99");
    expect(replyArg).toContain("⚡ Ưu tiên:");
  });

  it("should override time when HH:mm provided", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(makeSchedule());
    mockSchedulesService.create.mockImplementation(async (input) => ({
      id: 100,
      ...input,
      priority: input.priority ?? "normal",
      status: "pending",
    }) as any);

    const ctx = buildContext(["5", "30-4-2026", "14:30"]);
    await command.execute(ctx);

    const arg = mockSchedulesService.create.mock.calls[0][0];
    // 14:30 VN ngày 30-4 → UTC 07:30
    expect(arg.start_time.toISOString()).toBe("2026-04-30T07:30:00.000Z");
    // Delta = +6h30 → end shifted
    expect(arg.end_time?.toISOString()).toBe("2026-04-30T08:30:00.000Z");
    expect(arg.remind_at?.toISOString()).toBe("2026-04-30T07:15:00.000Z");
  });

  it("should not copy recurrence when source has it", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(
      makeSchedule({ recurrence_type: "weekly", recurrence_interval: 1 }),
    );
    mockSchedulesService.create.mockResolvedValue({
      id: 101,
      title: "Họp team",
      priority: "high",
    } as any);

    const ctx = buildContext(["5", "30-4-2026"]);
    await command.execute(ctx);

    const arg = mockSchedulesService.create.mock.calls[0][0];
    expect(arg.recurrence_type).toBeUndefined();

    const replyArg = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(replyArg).toContain("Bản sao là lịch một lần");
  });

  it("should default priority to normal when source has none", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(
      makeSchedule({ priority: undefined as any }),
    );
    mockSchedulesService.create.mockResolvedValue({
      id: 102,
      title: "Họp team",
      priority: "normal",
    } as any);

    const ctx = buildContext(["5", "30-4-2026"]);
    await command.execute(ctx);

    const arg = mockSchedulesService.create.mock.calls[0][0];
    expect(arg.priority).toBe("normal");
  });
});
