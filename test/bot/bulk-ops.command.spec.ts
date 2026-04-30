import { Test, TestingModule } from "@nestjs/testing";
import {
  HoanThanhTatCaCommand,
  XoaTheoTagCommand,
  XoaCompletedTruocCommand,
} from "../../src/bot/commands/bulk-ops.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { SchedulesService } from "../../src/schedules/schedules.service";
import { TagsService } from "../../src/schedules/tags.service";
import { MessageFormatter } from "../../src/shared/utils/message-formatter";
import { DateParser } from "../../src/shared/utils/date-parser";
import { CommandContext } from "../../src/bot/commands/command.types";
import { User } from "../../src/users/entities/user.entity";
import { Schedule } from "../../src/schedules/entities/schedule.entity";

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

const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule =>
  ({
    id: 1,
    user_id: "user123",
    title: "Họp",
    start_time: new Date("2026-04-25T02:00:00Z"),
    status: "pending",
    ...overrides,
  }) as any;

describe("HoanThanhTatCaCommand", () => {
  let command: HoanThanhTatCaCommand;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockTagsService: jest.Mocked<TagsService>;
  let mockRegistry: jest.Mocked<CommandRegistry>;

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSchedulesService = {
      findPendingByKeyword: jest.fn(),
      bulkComplete: jest.fn(),
    } as any;
    mockTagsService = {
      normalize: jest.fn((s: string) => s.toLowerCase()),
      findSchedulesByTag: jest.fn(),
    } as any;
    const mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HoanThanhTatCaCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: TagsService, useValue: mockTagsService },
        { provide: MessageFormatter, useValue: mockFormatter },
        DateParser,
      ],
    }).compile();
    command = module.get(HoanThanhTatCaCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("preview by keyword (no --xacnhan)", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findPendingByKeyword.mockResolvedValue([
      makeSchedule({ id: 1, title: "Họp 1" }),
      makeSchedule({ id: 2, title: "Họp 2" }),
    ]);

    const ctx = buildContext(["họp"]);
    await command.execute(ctx);

    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Sẽ hoàn-thành 2 lịch");
    expect(reply).toContain("--xacnhan");
    expect(mockSchedulesService.bulkComplete).not.toHaveBeenCalled();
  });

  it("execute with --xacnhan", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findPendingByKeyword.mockResolvedValue([
      makeSchedule({ id: 1 }),
      makeSchedule({ id: 2 }),
    ]);
    mockSchedulesService.bulkComplete.mockResolvedValue(2);

    const ctx = buildContext(["họp", "--xacnhan"]);
    await command.execute(ctx);

    expect(mockSchedulesService.bulkComplete).toHaveBeenCalledWith("user123", [
      1, 2,
    ]);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Đã hoàn-thành 2 lịch");
  });

  it("preview by tag", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockTagsService.findSchedulesByTag.mockResolvedValue([
      makeSchedule({ id: 5 }),
    ]);

    const ctx = buildContext(["--tag", "work"]);
    await command.execute(ctx);

    expect(mockTagsService.findSchedulesByTag).toHaveBeenCalledWith(
      "user123",
      "work",
      { onlyPending: true },
    );
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("tag `work`");
  });

  it("warn when no match", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findPendingByKeyword.mockResolvedValue([]);

    const ctx = buildContext(["abc"]);
    await command.execute(ctx);

    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Không có lịch");
  });

  it("usage when args empty", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);

    const ctx = buildContext([]);
    await command.execute(ctx);

    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Cú pháp");
  });
});

describe("XoaTheoTagCommand", () => {
  let command: XoaTheoTagCommand;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockTagsService: jest.Mocked<TagsService>;
  let mockRegistry: jest.Mocked<CommandRegistry>;

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSchedulesService = { bulkDelete: jest.fn() } as any;
    mockTagsService = {
      normalize: jest.fn((s: string) =>
        /^[a-z0-9_-]+$/.test(s.toLowerCase()) ? s.toLowerCase() : null,
      ),
      findSchedulesByTag: jest.fn(),
    } as any;
    const mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XoaTheoTagCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: TagsService, useValue: mockTagsService },
        { provide: MessageFormatter, useValue: mockFormatter },
        DateParser,
      ],
    }).compile();
    command = module.get(XoaTheoTagCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("preview without --xacnhan", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockTagsService.findSchedulesByTag.mockResolvedValue([
      makeSchedule({ id: 1 }),
      makeSchedule({ id: 2 }),
    ]);

    const ctx = buildContext(["work"]);
    await command.execute(ctx);

    expect(mockSchedulesService.bulkDelete).not.toHaveBeenCalled();
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("XOÁ 2 lịch");
  });

  it("execute with --xacnhan", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockTagsService.findSchedulesByTag.mockResolvedValue([
      makeSchedule({ id: 3 }),
    ]);
    mockSchedulesService.bulkDelete.mockResolvedValue(1);

    const ctx = buildContext(["work", "--xacnhan"]);
    await command.execute(ctx);

    expect(mockSchedulesService.bulkDelete).toHaveBeenCalledWith("user123", [
      3,
    ]);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Đã xoá 1 lịch");
  });

  it("invalid tag name", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["BAD@TAG"]);
    await command.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("không hợp lệ");
  });
});

describe("XoaCompletedTruocCommand", () => {
  let command: XoaCompletedTruocCommand;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockRegistry: jest.Mocked<CommandRegistry>;

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSchedulesService = {
      findCompletedBefore: jest.fn(),
      bulkDelete: jest.fn(),
    } as any;
    const mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XoaCompletedTruocCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
        DateParser,
      ],
    }).compile();
    command = module.get(XoaCompletedTruocCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("preview without --xacnhan", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findCompletedBefore.mockResolvedValue([
      makeSchedule({ id: 1 }),
    ]);

    const ctx = buildContext(["1-1-2026"]);
    await command.execute(ctx);

    expect(mockSchedulesService.bulkDelete).not.toHaveBeenCalled();
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Sẽ XOÁ 1 lịch");
  });

  it("execute with --xacnhan", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findCompletedBefore.mockResolvedValue([
      makeSchedule({ id: 1 }),
      makeSchedule({ id: 2 }),
    ]);
    mockSchedulesService.bulkDelete.mockResolvedValue(2);

    const ctx = buildContext(["1-1-2026", "--xacnhan"]);
    await command.execute(ctx);

    expect(mockSchedulesService.bulkDelete).toHaveBeenCalledWith("user123", [
      1, 2,
    ]);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Đã xoá 2 lịch");
  });

  it("invalid date", async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(["abc"]);
    await command.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Không nhận diện được ngày");
  });
});
