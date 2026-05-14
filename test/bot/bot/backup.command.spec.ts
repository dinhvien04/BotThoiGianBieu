import { Test, TestingModule } from "@nestjs/testing";
import { BackupCommand } from "src/bot/commands/backup.command";
import { CommandRegistry } from "src/bot/commands/command-registry";
import { UsersService } from "src/users/users.service";
import { BackupService } from "src/schedules/backup.service";
import { MessageFormatter } from "src/shared/utils/message-formatter";
import { CommandContext } from "src/bot/commands/command.types";
import { User } from "src/users/entities/user.entity";

describe("BackupCommand", () => {
  let cmd: BackupCommand;
  let mockUsers: jest.Mocked<UsersService>;
  let mockBackup: jest.Mocked<BackupService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const owner: User = { user_id: "u1" } as any;

  const buildContext = (): CommandContext =>
    ({
      message: { message_id: "m", channel_id: "c", sender_id: "u1" } as any,
      rawArgs: "",
      prefix: "*",
      args: [],
      reply: jest.fn(),
      send: jest.fn(),
    }) as any;

  beforeEach(async () => {
    mockUsers = { findByUserId: jest.fn() } as any;
    mockBackup = { buildBackup: jest.fn() } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupCommand,
        { provide: CommandRegistry, useValue: { register: jest.fn() } },
        { provide: UsersService, useValue: mockUsers },
        { provide: BackupService, useValue: mockBackup },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();
    cmd = module.get(BackupCommand);
  });

  it("rejects when user not initialised", async () => {
    mockUsers.findByUserId.mockResolvedValue(null);
    const ctx = buildContext();
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
  });

  it("renders backup inline when small", async () => {
    mockUsers.findByUserId.mockResolvedValue(owner);
    mockBackup.buildBackup.mockResolvedValue({
      version: 1,
      exported_at: "2026-04-25T00:00:00.000Z",
      user_id: "u1",
      settings: null,
      tags: [],
      templates: [],
      schedules: [],
    });
    const ctx = buildContext();
    await cmd.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("Backup u1");
    expect(reply).toContain("Schedules: 0");
    expect(reply).toContain("```json");
    expect(reply).toContain('"version": 1');
  });

  it("warns when backup too large", async () => {
    mockUsers.findByUserId.mockResolvedValue(owner);
    mockBackup.buildBackup.mockResolvedValue({
      version: 1,
      exported_at: "2026-04-25T00:00:00.000Z",
      user_id: "u1",
      settings: null,
      tags: [],
      templates: [],
      schedules: Array.from({ length: 200 }, (_, i) => ({
        id: i,
        item_type: "task",
        title: "x".repeat(50),
        description: "y".repeat(100),
        start_time: "2026-04-25T00:00:00.000Z",
        end_time: null,
        status: "pending",
        priority: "normal",
        remind_at: null,
        recurrence_type: "none",
        recurrence_interval: 1,
        recurrence_until: null,
        recurrence_parent_id: null,
        acknowledged_at: null,
        tag_names: [],
        shared_with_user_ids: [],
      })),
    });
    const ctx = buildContext();
    await cmd.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("quá lớn");
    expect(reply).toContain("Schedules: 200");
  });
});
