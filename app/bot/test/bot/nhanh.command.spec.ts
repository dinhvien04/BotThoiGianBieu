import { Test, TestingModule } from "@nestjs/testing";
import { NhanhCommand } from "../../src/bot/commands/nhanh.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { SchedulesService } from "../../src/schedules/schedules.service";
import { MessageFormatter } from "../../src/shared/utils/message-formatter";
import { DateParser } from "../../src/shared/utils/date-parser";
import { CommandContext } from "../../src/bot/commands/command.types";
import { User } from "../../src/users/entities/user.entity";
import { Schedule } from "../../src/schedules/entities/schedule.entity";

describe("NhanhCommand", () => {
  let command: NhanhCommand;
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
    mockSchedulesService = { create: jest.fn() } as any;
    mockFormatter = { formatNotInitialized: jest.fn(() => "NOT_INIT") } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NhanhCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
        DateParser,
      ],
    }).compile();

    command = module.get<NhanhCommand>(NhanhCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("expose metadata", () => {
    expect(command.name).toBe("nhanh");
    expect(command.aliases).toEqual(["quick", "qa", "q"]);
  });

  it("register itself on module init", () => {
    command.onModuleInit();
    expect(mockRegistry.register).toHaveBeenCalledWith(command);
  });

  it("warn when user not initialized", async () => {
    mockUsersService.findByUserId.mockResolvedValue(null);
    const ctx = buildContext(["họp", "9h", "mai"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
  });

  it("show usage when args empty", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext([]);
    await command.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Cú pháp");
    expect(reply).toContain("nhanh");
  });

  it("warn when no time/date detected", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["chỉ", "là", "câu", "vô", "nghĩa"]);
    await command.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Không nhận diện");
    expect(mockSchedulesService.create).not.toHaveBeenCalled();
  });

  it("warn when title empty (only date/time)", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["9h", "mai"]);
    await command.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("thiếu tiêu đề");
    expect(mockSchedulesService.create).not.toHaveBeenCalled();
  });

  it("create schedule when parse OK", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const created: Schedule = {
      id: 99,
      title: "họp team",
    } as any;
    mockSchedulesService.create.mockResolvedValue(created);

    const ctx = buildContext(["họp", "team", "9h", "sáng", "mai"]);
    await command.execute(ctx);

    expect(mockSchedulesService.create).toHaveBeenCalledTimes(1);
    const arg = mockSchedulesService.create.mock.calls[0][0];
    expect(arg.user_id).toBe("user123");
    expect(arg.title).toBe("họp team");
    expect(arg.start_time).toBeInstanceOf(Date);
    expect(arg.end_time).toBeInstanceOf(Date);

    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Đã tạo lịch nhanh #99");
    expect(reply).toContain("họp team");
  });
});
