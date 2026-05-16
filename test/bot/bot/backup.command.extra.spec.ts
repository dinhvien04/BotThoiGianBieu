import { Test, TestingModule } from "@nestjs/testing";
import { BackupCommand } from "src/bot/commands/backup.command";
import { CommandRegistry } from "src/bot/commands/command-registry";
import type { CommandContext } from "src/bot/commands/command.types";
import { BackupService, BackupV1 } from "src/schedules/backup.service";
import { MessageFormatter } from "src/shared/utils/message-formatter";
import { UsersService } from "src/users/users.service";

describe("BackupCommand extended behavior", () => {
  let command: BackupCommand;
  let registry: jest.Mocked<Pick<CommandRegistry, "register">>;
  let usersService: jest.Mocked<Pick<UsersService, "findByUserId">>;
  let backupService: jest.Mocked<Pick<BackupService, "buildBackup">>;
  let formatter: jest.Mocked<Pick<MessageFormatter, "formatNotInitialized">>;

  const backupBase: BackupV1 = {
    version: 1,
    exported_at: "2026-05-15T09:00:00.000Z",
    user_id: "canonical-user",
    settings: {
      timezone: "Asia/Ho_Chi_Minh",
      default_channel_id: "channel-1",
      default_remind_minutes: 15,
      notify_via_dm: true,
      notify_via_channel: false,
      work_start_hour: 8,
      work_end_hour: 17,
    },
    tags: [{ id: 1, name: "work", color: "#ff0000" }],
    templates: [
      {
        id: 1,
        name: "daily",
        item_type: "meeting",
        title: "Daily",
        description: null,
        duration_minutes: 30,
        default_remind_minutes: 5,
        priority: "normal",
      },
    ],
    schedules: [
      {
        id: 1,
        item_type: "task",
        title: "Write report",
        description: "Prepare notes",
        start_time: "2026-05-16T02:00:00.000Z",
        end_time: null,
        status: "pending",
        priority: "high",
        remind_at: null,
        recurrence_type: "none",
        recurrence_interval: 1,
        recurrence_until: null,
        recurrence_parent_id: null,
        acknowledged_at: null,
        tag_names: ["work"],
        shared_with_user_ids: ["teammate"],
      },
    ],
  };

  function makeContext(prefix = "*"): CommandContext {
    return {
      message: {
        message_id: "m1",
        channel_id: "c1",
        sender_id: "sender-user",
      },
      rawArgs: "",
      args: [],
      prefix,
      reply: jest.fn().mockResolvedValue(undefined),
      send: jest.fn().mockResolvedValue(undefined),
      sendDM: jest.fn().mockResolvedValue(undefined),
      ephemeralReply: jest.fn().mockResolvedValue(undefined),
    } as unknown as CommandContext;
  }

  beforeEach(async () => {
    registry = { register: jest.fn() };
    usersService = {
      findByUserId: jest.fn().mockResolvedValue({ user_id: "canonical-user" }),
    };
    backupService = {
      buildBackup: jest.fn().mockResolvedValue(backupBase),
    };
    formatter = {
      formatNotInitialized: jest.fn((prefix) => `not initialized ${prefix}`),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupCommand,
        { provide: CommandRegistry, useValue: registry },
        { provide: UsersService, useValue: usersService },
        { provide: BackupService, useValue: backupService },
        { provide: MessageFormatter, useValue: formatter },
      ],
    }).compile();
    command = module.get(BackupCommand);
  });

  it("declares all backup aliases", () => {
    expect(command.aliases).toEqual([
      "sao-luu",
      "saoluu",
      "export-json",
      "exportjson",
    ]);
  });

  it("registers itself on module init", () => {
    command.onModuleInit();
    expect(registry.register).toHaveBeenCalledWith(command);
  });

  it("looks up the caller by sender id", async () => {
    const ctx = makeContext();
    await command.execute(ctx);
    expect(usersService.findByUserId).toHaveBeenCalledWith("sender-user");
  });

  it("uses canonical user_id from DB when building backup", async () => {
    const ctx = makeContext();
    await command.execute(ctx);
    expect(backupService.buildBackup).toHaveBeenCalledWith("canonical-user");
  });

  it("does not build backup when user is not initialized", async () => {
    usersService.findByUserId.mockResolvedValueOnce(null);
    const ctx = makeContext("!");

    await command.execute(ctx);

    expect(formatter.formatNotInitialized).toHaveBeenCalledWith("!");
    expect(backupService.buildBackup).not.toHaveBeenCalled();
    expect(ctx.reply).toHaveBeenCalledWith("not initialized !");
  });

  it("includes a compact section summary in inline backup", async () => {
    const ctx = makeContext();

    await command.execute(ctx);

    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Schedules: 1");
    expect(reply).toContain("Tags: 1");
    expect(reply).toContain("Templates: 1");
    expect(reply).toContain("Settings: yes");
  });

  it("renders pretty JSON fenced as json", async () => {
    const ctx = makeContext();

    await command.execute(ctx);

    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("```json");
    expect(reply).toContain('\n  "version": 1,');
    expect(reply).toContain('"tag_names": [');
    expect(reply.trim().endsWith("```")).toBe(true);
  });

  it("uses backup user id in filename hint", async () => {
    const ctx = makeContext();

    await command.execute(ctx);

    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("backup-canonical-user.json");
  });

  it("warns instead of sending a giant inline JSON payload", async () => {
    backupService.buildBackup.mockResolvedValueOnce({
      ...backupBase,
      schedules: Array.from({ length: 120 }, (_, id) => ({
        ...backupBase.schedules[0],
        id,
        title: "x".repeat(80),
        description: "y".repeat(160),
      })),
    });
    const ctx = makeContext();

    await command.execute(ctx);

    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("Backup");
    expect(reply).toContain("Schedules: 120");
    expect(reply).not.toContain("```json");
  });

  it("keeps custom command prefix in large-backup cleanup hint", async () => {
    backupService.buildBackup.mockResolvedValueOnce({
      ...backupBase,
      schedules: Array.from({ length: 120 }, (_, id) => ({
        ...backupBase.schedules[0],
        id,
        description: "z".repeat(200),
      })),
    });
    const ctx = makeContext("!");

    await command.execute(ctx);

    const reply = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
    expect(reply).toContain("!xoa-lich <ID>");
  });
});
