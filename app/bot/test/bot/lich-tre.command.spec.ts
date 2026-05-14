import { Test, TestingModule } from "@nestjs/testing";
import { LichTreCommand } from "../../src/bot/commands/lich-tre.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { SchedulesService } from "../../src/schedules/schedules.service";
import { MessageFormatter } from "../../src/shared/utils/message-formatter";
import { CommandContext } from "../../src/bot/commands/command.types";
import { User } from "../../src/users/entities/user.entity";
import { Schedule } from "../../src/schedules/entities/schedule.entity";

describe("LichTreCommand", () => {
  let command: LichTreCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = { user_id: "user123" } as any;

  const buildContext = (args: string[] = []): CommandContext =>
    ({
      message: {
        message_id: "msg",
        channel_id: "ch",
        sender_id: "user123",
      } as any,
      rawArgs: args.join(" "),
      prefix: "*",
      args,
      reply: jest.fn(),
      send: jest.fn(),
      sendDM: jest.fn(),
      ephemeralReply: jest.fn(),
    }) as any;

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSchedulesService = { findOverdue: jest.fn() } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
      formatScheduleDigest: jest.fn(
        (items, title, opts) =>
          `DIGEST(${title}, ${items.length}, ${opts?.emptyMessage ?? opts?.footer ?? ""})`,
      ),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LichTreCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get(LichTreCommand);
  });

  afterEach(() => jest.clearAllMocks());

  describe("metadata", () => {
    it("registers in CommandRegistry on module init", () => {
      command.onModuleInit();
      expect(mockRegistry.register).toHaveBeenCalledWith(command);
    });

    it("has expected name and aliases", () => {
      expect(command.name).toBe("lich-tre");
      expect(command.aliases).toEqual(
        expect.arrayContaining(["overdue", "qua-han"]),
      );
      expect(command.category).toBe("📅 XEM LỊCH");
    });
  });

  describe("execute", () => {
    it("rejects when user not initialised", async () => {
      mockUsersService.findByUserId.mockResolvedValue(null);
      const ctx = buildContext([]);
      await command.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
    });

    it("shows happy empty state when no overdue", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findOverdue.mockResolvedValue({
        items: [],
        total: 0,
      });
      const ctx = buildContext([]);
      await command.execute(ctx);
      expect(mockSchedulesService.findOverdue).toHaveBeenCalledWith(
        "user123",
        expect.any(Date),
        10,
        0,
        undefined,
      );
      const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
      expect(reply).toContain("Tuyệt vời");
    });

    it("paginates with offset and footer", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const fakeItems: Schedule[] = [{ id: 1 } as any, { id: 2 } as any];
      mockSchedulesService.findOverdue.mockResolvedValue({
        items: fakeItems,
        total: 25,
      });
      const ctx = buildContext(["2"]);
      await command.execute(ctx);
      expect(mockSchedulesService.findOverdue).toHaveBeenCalledWith(
        "user123",
        expect.any(Date),
        10,
        10,
        undefined,
      );
      const callArgs = (
        mockFormatter.formatScheduleDigest as jest.Mock
      ).mock.calls[0];
      expect(callArgs[1]).toContain("Lịch quá hạn");
      expect(callArgs[2].footer).toContain("trang 2/3");
      expect(callArgs[2].footer).toContain("lich-tre 3");
    });

    it("rejects bad page number", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(["abc"]);
      await command.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Trang không hợp lệ"),
      );
      expect(mockSchedulesService.findOverdue).not.toHaveBeenCalled();
    });

    it("rejects page beyond total", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findOverdue.mockResolvedValue({
        items: [],
        total: 5,
      });
      const ctx = buildContext(["3"]);
      await command.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("vượt quá"),
      );
    });

    it("supports priority filter", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findOverdue.mockResolvedValue({
        items: [{ id: 1 } as any],
        total: 1,
      });
      const ctx = buildContext(["--uutien", "cao"]);
      await command.execute(ctx);
      expect(mockSchedulesService.findOverdue).toHaveBeenCalledWith(
        "user123",
        expect.any(Date),
        10,
        0,
        "high",
      );
    });
  });
});
