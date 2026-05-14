import { Test, TestingModule } from "@nestjs/testing";
import { LichThangCommand } from "src/bot/commands/lich-thang.command";
import { CommandRegistry } from "src/bot/commands/command-registry";
import { UsersService } from "src/users/users.service";
import { SchedulesService } from "src/schedules/schedules.service";
import { MessageFormatter } from "src/shared/utils/message-formatter";
import { CommandContext } from "src/bot/commands/command.types";
import { User } from "src/users/entities/user.entity";
import { Schedule } from "src/schedules/entities/schedule.entity";

describe("LichThangCommand", () => {
  let command: LichThangCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = { user_id: "user123" } as any;

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
    mockSchedulesService = { findByDateRange: jest.fn() } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
      formatMonthlySchedule: jest.fn(() => "MONTHLY"),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LichThangCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<LichThangCommand>(LichThangCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("should expose metadata", () => {
    expect(command.name).toBe("lich-thang");
    expect(command.aliases).toEqual(["lichthang", "month"]);
  });

  it("should register itself on module init", () => {
    command.onModuleInit();
    expect(mockRegistry.register).toHaveBeenCalledWith(command);
  });

  it("should warn when user not initialized", async () => {
    mockUsersService.findByUserId.mockResolvedValue(null);
    const ctx = buildContext([]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
  });

  it("should default to current month when no args", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findByDateRange.mockResolvedValue([]);
    const ctx = buildContext([]);
    await command.execute(ctx);

    expect(mockSchedulesService.findByDateRange).toHaveBeenCalledTimes(1);
    expect(mockFormatter.formatMonthlySchedule).toHaveBeenCalledTimes(1);
    const [, year, month] = mockFormatter.formatMonthlySchedule.mock.calls[0];
    const now = new Date();
    expect(year).toBe(now.getFullYear());
    expect(month).toBe(now.getMonth() + 1);
  });

  it("should use given month when args = MM-YYYY", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const fakeSchedules = [{ id: 1 } as Schedule];
    mockSchedulesService.findByDateRange.mockResolvedValue(fakeSchedules);

    const ctx = buildContext(["4-2026"]);
    await command.execute(ctx);

    const [start, end] = (mockSchedulesService.findByDateRange.mock
      .calls[0] as any[]).slice(1);
    expect(start.getFullYear()).toBe(2026);
    expect(start.getMonth()).toBe(3); // April
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2026);
    expect(end.getMonth()).toBe(3);
    expect(end.getDate()).toBe(30);

    expect(mockFormatter.formatMonthlySchedule).toHaveBeenCalledWith(
      fakeSchedules,
      2026,
      4,
    );
    expect(ctx.reply).toHaveBeenCalledWith("MONTHLY");
  });

  it("should accept slash separator MM/YYYY", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findByDateRange.mockResolvedValue([]);
    const ctx = buildContext(["12/2026"]);
    await command.execute(ctx);

    expect(mockFormatter.formatMonthlySchedule).toHaveBeenCalledWith(
      [],
      2026,
      12,
    );
  });

  it("should warn on invalid month input", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["13-2026"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Tháng không hợp lệ"),
    );
    expect(mockSchedulesService.findByDateRange).not.toHaveBeenCalled();
  });

  it("should warn on multiple args", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["4-2026", "extra"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Tháng không hợp lệ"),
    );
  });
});
