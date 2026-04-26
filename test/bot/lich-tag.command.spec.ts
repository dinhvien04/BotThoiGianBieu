import { Test, TestingModule } from "@nestjs/testing";
import { LichTagCommand } from "../../src/bot/commands/lich-tag.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { TagsService } from "../../src/schedules/tags.service";
import { MessageFormatter } from "../../src/shared/utils/message-formatter";
import { CommandContext } from "../../src/bot/commands/command.types";
import { User } from "../../src/users/entities/user.entity";
import { Schedule } from "../../src/schedules/entities/schedule.entity";
import { Tag } from "../../src/schedules/entities/tag.entity";

describe("LichTagCommand", () => {
  let command: LichTagCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockTagsService: jest.Mocked<TagsService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = { user_id: "user123" } as any;
  const mockSchedule: Schedule = {
    id: 5,
    user_id: "user123",
    title: "Họp",
    start_time: new Date(),
    status: "pending",
    tags: [{ id: 1, name: "work" } as Tag],
  } as any;

  const buildContext = (args: string[]): CommandContext =>
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
    mockTagsService = {
      normalize: jest.fn((s: string) => {
        const t = (s ?? "").trim().toLowerCase();
        return /^[a-z0-9_-]+$/.test(t) && t.length <= 30 ? t : null;
      }),
      findByName: jest.fn(),
      findSchedulesByTag: jest.fn(),
    } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
      formatScheduleDigest: jest.fn(
        (schedules, title) => `DIGEST(${title}, ${schedules.length})`,
      ),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LichTagCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: TagsService, useValue: mockTagsService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<LichTagCommand>(LichTagCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("expose metadata", () => {
    expect(command.name).toBe("lich-tag");
  });

  it("rejects when user not initialised", async () => {
    mockUsersService.findByUserId.mockResolvedValue(null);
    const ctx = buildContext(["work"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
  });

  it("rejects missing tag name", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext([]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("Cú pháp"),
    );
  });

  it("rejects invalid tag name", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    (mockTagsService.normalize as jest.Mock).mockReturnValueOnce(null);
    const ctx = buildContext(["bad name!"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("không hợp lệ"),
    );
  });

  it("rejects when tag does not exist for user", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockTagsService.findByName.mockResolvedValue(null);
    const ctx = buildContext(["ghost"]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("chưa có nhãn"),
    );
  });

  it("lists schedules with tag (all status)", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockTagsService.findByName.mockResolvedValue({ id: 1, name: "work" } as Tag);
    mockTagsService.findSchedulesByTag.mockResolvedValue([mockSchedule]);

    const ctx = buildContext(["work"]);
    await command.execute(ctx);

    expect(mockTagsService.findSchedulesByTag).toHaveBeenCalledWith(
      "user123",
      "work",
      { onlyPending: false },
    );
    expect(mockFormatter.formatScheduleDigest).toHaveBeenCalled();
  });

  it("filters pending only with --cho", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockTagsService.findByName.mockResolvedValue({ id: 1, name: "work" } as Tag);
    mockTagsService.findSchedulesByTag.mockResolvedValue([]);

    const ctx = buildContext(["work", "--cho"]);
    await command.execute(ctx);

    expect(mockTagsService.findSchedulesByTag).toHaveBeenCalledWith(
      "user123",
      "work",
      { onlyPending: true },
    );
  });
});
