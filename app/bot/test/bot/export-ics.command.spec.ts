import { Test, TestingModule } from "@nestjs/testing";
import { ExportIcsCommand } from "../../src/bot/commands/export-ics.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { SchedulesService } from "../../src/schedules/schedules.service";
import { MessageFormatter } from "../../src/shared/utils/message-formatter";
import { CommandContext } from "../../src/bot/commands/command.types";
import { User } from "../../src/users/entities/user.entity";
import { Schedule } from "../../src/schedules/entities/schedule.entity";

describe("ExportIcsCommand", () => {
  let command: ExportIcsCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = { user_id: "user123" } as any;

  const baseSchedule = (overrides: Partial<Schedule> = {}): Schedule =>
    ({
      id: 1,
      user_id: "user123",
      title: "Họp",
      description: null,
      item_type: "meeting",
      start_time: new Date("2026-04-25T02:00:00Z"),
      end_time: new Date("2026-04-25T03:00:00Z"),
      status: "pending",
      priority: "normal",
      remind_at: null,
      acknowledged_at: null,
      end_notified_at: null,
      is_reminded: false,
      recurrence_type: "none",
      recurrence_interval: 1,
      recurrence_until: null,
      recurrence_parent_id: null,
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
      findByDateRange: jest.fn(),
    } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ExportIcsCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<ExportIcsCommand>(ExportIcsCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("should expose metadata", () => {
    expect(command.name).toBe("export-ics");
    expect(command.aliases).toContain("ics");
  });

  it("should register on module init", () => {
    command.onModuleInit();
    expect(mockRegistry.register).toHaveBeenCalledWith(command);
  });

  it("should warn when user not initialized", async () => {
    mockUsersService.findByUserId.mockResolvedValue(null);
    const ctx = buildContext();
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
  });

  it("should reject invalid args", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["foo"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Sai cú pháp"),
    );
    expect(mockSchedulesService.findByDateRange).not.toHaveBeenCalled();
  });

  it("should reject reverse date range", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["31-12-2026", "1-1-2026"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Sai cú pháp"),
    );
  });

  it("should reply with empty message when no schedules", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findByDateRange.mockResolvedValue([]);
    const ctx = buildContext();
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Không có lịch nào"),
    );
  });

  it("should query default 12-month range when no args", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findByDateRange.mockResolvedValue([baseSchedule()]);
    const ctx = buildContext();
    await command.execute(ctx);
    const call = mockSchedulesService.findByDateRange.mock.calls[0];
    expect(call[0]).toBe("user123");
    const start = call[1] as Date;
    const end = call[2] as Date;
    expect(end.getTime() - start.getTime()).toBeGreaterThan(
      350 * 24 * 60 * 60 * 1000,
    );
  });

  it("should reply with ICS content in code block when small", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findByDateRange.mockResolvedValue([baseSchedule()]);
    const ctx = buildContext();
    await command.execute(ctx);
    const replyArg = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(replyArg).toContain("Đã xuất 1 lịch");
    expect(replyArg).toContain("```");
    expect(replyArg).toContain("BEGIN:VCALENDAR");
    expect(replyArg).toContain("END:VCALENDAR");
  });

  it("should warn when content too long", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const many = Array.from({ length: 100 }, (_, i) =>
      baseSchedule({
        id: i + 1,
        title: "X".repeat(200),
      }),
    );
    mockSchedulesService.findByDateRange.mockResolvedValue(many);
    const ctx = buildContext();
    await command.execute(ctx);
    const replyArg = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(replyArg).toContain("quá dài");
    expect(replyArg).toContain("export-ics");
  });

  it("should accept tat-ca and use unbounded range", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findByDateRange.mockResolvedValue([baseSchedule()]);
    const ctx = buildContext(["tat-ca"]);
    await command.execute(ctx);
    const call = mockSchedulesService.findByDateRange.mock.calls[0];
    const start = call[1] as Date;
    const end = call[2] as Date;
    expect(start.getTime()).toBe(0);
    expect(end.getTime()).toBeGreaterThan(start.getTime() + 1e15);
  });

  it("should accept date range args", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findByDateRange.mockResolvedValue([baseSchedule()]);
    const ctx = buildContext(["1-1-2026", "31-12-2026"]);
    await command.execute(ctx);
    const call = mockSchedulesService.findByDateRange.mock.calls[0];
    const start = call[1] as Date;
    const end = call[2] as Date;
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(0);
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(11);
    expect(end.getDate()).toBe(31);
  });
});
