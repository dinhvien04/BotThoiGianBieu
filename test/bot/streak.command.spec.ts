import { Test, TestingModule } from "@nestjs/testing";
import { StreakCommand } from "../../src/bot/commands/streak.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { StreakService } from "../../src/schedules/streak.service";
import { MessageFormatter } from "../../src/shared/utils/message-formatter";
import { CommandContext } from "../../src/bot/commands/command.types";
import { User } from "../../src/users/entities/user.entity";

describe("StreakCommand", () => {
  let cmd: StreakCommand;
  let mockUsers: jest.Mocked<UsersService>;
  let mockStreak: jest.Mocked<StreakService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const ownerUser: User = { user_id: "u1" } as any;

  const buildContext = (): CommandContext =>
    ({
      message: {
        message_id: "m",
        channel_id: "c",
        sender_id: "u1",
      } as any,
      rawArgs: "",
      prefix: "*",
      args: [],
      reply: jest.fn(),
      send: jest.fn(),
    }) as any;

  beforeEach(async () => {
    mockUsers = { findByUserId: jest.fn() } as any;
    mockStreak = { computeStreak: jest.fn() } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreakCommand,
        { provide: CommandRegistry, useValue: { register: jest.fn() } },
        { provide: UsersService, useValue: mockUsers },
        { provide: StreakService, useValue: mockStreak },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();
    cmd = module.get(StreakCommand);
  });

  it("rejects when user not initialised", async () => {
    mockUsers.findByUserId.mockResolvedValue(null);
    const ctx = buildContext();
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
  });

  it("renders empty-state when no completions", async () => {
    mockUsers.findByUserId.mockResolvedValue(ownerUser);
    mockStreak.computeStreak.mockResolvedValue({
      currentStreak: 0,
      longestStreak: 0,
      daysActive: 0,
      totalCompleted: 0,
      lastCompletedDate: null,
    });
    const ctx = buildContext();
    await cmd.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("chưa hoàn-thành");
    expect(reply).toContain("hoan-thanh");
  });

  it("renders streak with badge for 7+ days", async () => {
    mockUsers.findByUserId.mockResolvedValue(ownerUser);
    mockStreak.computeStreak.mockResolvedValue({
      currentStreak: 8,
      longestStreak: 12,
      daysActive: 25,
      totalCompleted: 60,
      lastCompletedDate: "2026-04-25",
    });
    const ctx = buildContext();
    await cmd.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("Chuỗi hiện tại:");
    expect(reply).toContain("8 ngày");
    expect(reply).toContain("tuần");
    expect(reply).toContain("Kỷ lục cá nhân:");
    expect(reply).toContain("12 ngày");
    expect(reply).toContain("25/04/2026");
    expect(reply).toContain("Còn 6 ngày nữa để đạt mốc 14");
  });

  it("renders without badge for short streak", async () => {
    mockUsers.findByUserId.mockResolvedValue(ownerUser);
    mockStreak.computeStreak.mockResolvedValue({
      currentStreak: 1,
      longestStreak: 1,
      daysActive: 1,
      totalCompleted: 1,
      lastCompletedDate: "2026-04-25",
    });
    const ctx = buildContext();
    await cmd.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("1 ngày");
    expect(reply).toContain("Còn 2 ngày nữa để đạt mốc 3");
  });
});
