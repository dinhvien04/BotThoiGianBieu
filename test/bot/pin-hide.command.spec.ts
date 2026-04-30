import { Test } from "@nestjs/testing";
import {
  GhimCommand,
  BoGhimCommand,
  LichAnCommand,
  HienCommand,
} from "../../src/bot/commands/pin-hide.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { SchedulesService } from "../../src/schedules/schedules.service";
import { MessageFormatter } from "../../src/shared/utils/message-formatter";
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
    id: 5,
    user_id: "user123",
    title: "Họp",
    is_pinned: false,
    is_hidden: false,
    ...overrides,
  }) as any;

function makeModule<T>(commandClass: new (...args: any[]) => T) {
  const mockRegistry = { register: jest.fn() } as any;
  const mockUsersService = { findByUserId: jest.fn() } as any;
  const mockSchedulesService = {
    setPinned: jest.fn(),
    setHidden: jest.fn(),
  } as any;
  const mockFormatter = {
    formatNotInitialized: jest.fn(() => "NOT_INIT"),
  } as any;
  return Test.createTestingModule({
    providers: [
      commandClass,
      { provide: CommandRegistry, useValue: mockRegistry },
      { provide: UsersService, useValue: mockUsersService },
      { provide: SchedulesService, useValue: mockSchedulesService },
      { provide: MessageFormatter, useValue: mockFormatter },
    ],
  })
    .compile()
    .then((m) => ({
      command: m.get<T>(commandClass),
      mockRegistry,
      mockUsersService: mockUsersService as jest.Mocked<UsersService>,
      mockSchedulesService:
        mockSchedulesService as jest.Mocked<SchedulesService>,
      mockFormatter,
    }));
}

describe("GhimCommand", () => {
  let bag: Awaited<ReturnType<typeof makeModule<GhimCommand>>>;
  beforeEach(async () => {
    bag = await makeModule(GhimCommand);
  });

  it("metadata", () => {
    expect(bag.command.name).toBe("ghim");
    expect(bag.command.aliases).toEqual(["pin"]);
  });

  it("usage when no ID", async () => {
    bag.mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext([]);
    await bag.command.execute(ctx);
    expect((ctx.reply as jest.Mock).mock.calls[0][0]).toContain("Cú pháp");
  });

  it("not found", async () => {
    bag.mockUsersService.findByUserId.mockResolvedValue(mockUser);
    bag.mockSchedulesService.setPinned.mockResolvedValue(null);
    const ctx = buildContext(["999"]);
    await bag.command.execute(ctx);
    expect((ctx.reply as jest.Mock).mock.calls[0][0]).toContain("Không tìm thấy");
  });

  it("pin OK", async () => {
    bag.mockUsersService.findByUserId.mockResolvedValue(mockUser);
    bag.mockSchedulesService.setPinned.mockResolvedValue(
      makeSchedule({ is_pinned: true }),
    );
    const ctx = buildContext(["5"]);
    await bag.command.execute(ctx);
    expect(bag.mockSchedulesService.setPinned).toHaveBeenCalledWith(
      "user123",
      5,
      true,
    );
    expect((ctx.reply as jest.Mock).mock.calls[0][0]).toContain("Đã ghim lịch #5");
  });
});

describe("BoGhimCommand", () => {
  let bag: Awaited<ReturnType<typeof makeModule<BoGhimCommand>>>;
  beforeEach(async () => {
    bag = await makeModule(BoGhimCommand);
  });

  it("unpin calls setPinned(false)", async () => {
    bag.mockUsersService.findByUserId.mockResolvedValue(mockUser);
    bag.mockSchedulesService.setPinned.mockResolvedValue(
      makeSchedule({ is_pinned: false }),
    );
    const ctx = buildContext(["5"]);
    await bag.command.execute(ctx);
    expect(bag.mockSchedulesService.setPinned).toHaveBeenCalledWith(
      "user123",
      5,
      false,
    );
    expect((ctx.reply as jest.Mock).mock.calls[0][0]).toContain("bỏ ghim");
  });
});

describe("LichAnCommand", () => {
  let bag: Awaited<ReturnType<typeof makeModule<LichAnCommand>>>;
  beforeEach(async () => {
    bag = await makeModule(LichAnCommand);
  });

  it("hide calls setHidden(true)", async () => {
    bag.mockUsersService.findByUserId.mockResolvedValue(mockUser);
    bag.mockSchedulesService.setHidden.mockResolvedValue(
      makeSchedule({ is_hidden: true }),
    );
    const ctx = buildContext(["5"]);
    await bag.command.execute(ctx);
    expect(bag.mockSchedulesService.setHidden).toHaveBeenCalledWith(
      "user123",
      5,
      true,
    );
    expect((ctx.reply as jest.Mock).mock.calls[0][0]).toContain("Đã ẩn lịch #5");
  });
});

describe("HienCommand", () => {
  let bag: Awaited<ReturnType<typeof makeModule<HienCommand>>>;
  beforeEach(async () => {
    bag = await makeModule(HienCommand);
  });

  it("unhide calls setHidden(false)", async () => {
    bag.mockUsersService.findByUserId.mockResolvedValue(mockUser);
    bag.mockSchedulesService.setHidden.mockResolvedValue(
      makeSchedule({ is_hidden: false }),
    );
    const ctx = buildContext(["5"]);
    await bag.command.execute(ctx);
    expect(bag.mockSchedulesService.setHidden).toHaveBeenCalledWith(
      "user123",
      5,
      false,
    );
    expect((ctx.reply as jest.Mock).mock.calls[0][0]).toContain("Đã hiện lại");
  });
});
