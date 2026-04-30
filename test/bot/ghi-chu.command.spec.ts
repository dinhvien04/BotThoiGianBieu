import { Test, TestingModule } from "@nestjs/testing";
import { GhiChuCommand } from "../../src/bot/commands/ghi-chu.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { SchedulesService } from "../../src/schedules/schedules.service";
import { MessageFormatter } from "../../src/shared/utils/message-formatter";
import { CommandContext } from "../../src/bot/commands/command.types";
import { User } from "../../src/users/entities/user.entity";
import { Schedule } from "../../src/schedules/entities/schedule.entity";

describe("GhiChuCommand", () => {
  let command: GhiChuCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = { user_id: "user123" } as any;

  const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule =>
    ({
      id: 5,
      user_id: "user123",
      title: "Họp team",
      description: null,
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
      update: jest.fn(),
    } as any;
    mockFormatter = { formatNotInitialized: jest.fn(() => "NOT_INIT") } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GhiChuCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<GhiChuCommand>(GhiChuCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("metadata", () => {
    expect(command.name).toBe("ghi-chu");
    expect(command.aliases).toEqual(["ghichu", "note", "addnote"]);
  });

  it("register on init", () => {
    command.onModuleInit();
    expect(mockRegistry.register).toHaveBeenCalledWith(command);
  });

  it("warn when user not initialized", async () => {
    mockUsersService.findByUserId.mockResolvedValue(null);
    const ctx = buildContext(["5", "ghi", "chú"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
  });

  it("usage when args missing", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["5"]);
    await command.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Cú pháp");
  });

  it("invalid ID", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["abc", "note"]);
    await command.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("ID không hợp lệ");
  });

  it("schedule not found", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(null);
    const ctx = buildContext(["999", "note"]);
    await command.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Không tìm thấy lịch");
  });

  it("append note vào description rỗng", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(
      makeSchedule({ description: null }),
    );
    mockSchedulesService.update.mockResolvedValue({} as any);

    const ctx = buildContext(["5", "Cần", "chuẩn", "bị", "slide"]);
    await command.execute(ctx);

    expect(mockSchedulesService.update).toHaveBeenCalledTimes(1);
    const [id, patch] = mockSchedulesService.update.mock.calls[0];
    expect(id).toBe(5);
    expect(patch.description).toMatch(/^\[\d{2}\/\d{2} \d{2}:\d{2}\] Cần chuẩn bị slide$/);

    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Đã thêm ghi chú vào lịch #5");
  });

  it("append note vào description có sẵn", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(
      makeSchedule({ description: "Sprint review" }),
    );
    mockSchedulesService.update.mockResolvedValue({} as any);

    const ctx = buildContext(["5", "Thêm", "ý"]);
    await command.execute(ctx);

    const [, patch] = mockSchedulesService.update.mock.calls[0];
    expect(patch.description).toMatch(
      /^Sprint review\n\[\d{2}\/\d{2} \d{2}:\d{2}\] Thêm ý$/,
    );
  });

  it("reject note quá dài", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(
      makeSchedule({ description: "x".repeat(1990) }),
    );

    const ctx = buildContext(["5", "y".repeat(50)]);
    await command.execute(ctx);

    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("vượt quá");
    expect(mockSchedulesService.update).not.toHaveBeenCalled();
  });
});
