import { Test, TestingModule } from "@nestjs/testing";
import { TimezoneCommand } from "src/bot/commands/timezone.command";
import { CommandRegistry } from "src/bot/commands/command-registry";
import { UsersService } from "src/users/users.service";
import { MessageFormatter } from "src/shared/utils/message-formatter";
import { CommandContext } from "src/bot/commands/command.types";
import { User } from "src/users/entities/user.entity";
import { UserSettings } from "src/users/entities/user-settings.entity";

describe("TimezoneCommand", () => {
  let cmd: TimezoneCommand;
  let mockUsers: jest.Mocked<UsersService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const buildUser = (tz = "Asia/Ho_Chi_Minh"): User => ({
    user_id: "u1",
    settings: { timezone: tz } as UserSettings,
  } as any);

  const buildContext = (args: string[] = []): CommandContext =>
    ({
      message: { message_id: "m", channel_id: "c", sender_id: "u1" } as any,
      rawArgs: args.join(" "),
      prefix: "*",
      args,
      reply: jest.fn(),
      send: jest.fn(),
    }) as any;

  beforeEach(async () => {
    mockUsers = {
      findByUserId: jest.fn(),
      updateSettings: jest.fn(),
    } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimezoneCommand,
        { provide: CommandRegistry, useValue: { register: jest.fn() } },
        { provide: UsersService, useValue: mockUsers },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();
    cmd = module.get(TimezoneCommand);
  });

  it("rejects when user not initialised", async () => {
    mockUsers.findByUserId.mockResolvedValue(null);
    const ctx = buildContext();
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
  });

  it("shows current timezone with no args", async () => {
    mockUsers.findByUserId.mockResolvedValue(buildUser("Asia/Tokyo"));
    const ctx = buildContext();
    await cmd.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("Asia/Tokyo");
    expect(reply).toContain("+09:00");
  });

  it("shows list of common timezones", async () => {
    mockUsers.findByUserId.mockResolvedValue(buildUser());
    const ctx = buildContext(["list"]);
    await cmd.execute(ctx);
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("Asia/Ho_Chi_Minh");
    expect(reply).toContain("Asia/Tokyo");
    expect(reply).toContain("UTC");
  });

  it("rejects invalid IANA name", async () => {
    mockUsers.findByUserId.mockResolvedValue(buildUser());
    const ctx = buildContext(["Not/Real_Zone"]);
    await cmd.execute(ctx);
    expect(mockUsers.updateSettings).not.toHaveBeenCalled();
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("không hợp lệ");
  });

  it("sets timezone via IANA name", async () => {
    mockUsers.findByUserId.mockResolvedValue(buildUser("Asia/Ho_Chi_Minh"));
    const ctx = buildContext(["Asia/Tokyo"]);
    await cmd.execute(ctx);
    expect(mockUsers.updateSettings).toHaveBeenCalledWith("u1", {
      timezone: "Asia/Tokyo",
    });
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("Asia/Tokyo");
    expect(reply).toContain("+09:00");
  });

  it("resolves alias before validating", async () => {
    mockUsers.findByUserId.mockResolvedValue(buildUser("Asia/Ho_Chi_Minh"));
    const ctx = buildContext(["tokyo"]);
    await cmd.execute(ctx);
    expect(mockUsers.updateSettings).toHaveBeenCalledWith("u1", {
      timezone: "Asia/Tokyo",
    });
  });

  it("no-ops when same tz", async () => {
    mockUsers.findByUserId.mockResolvedValue(buildUser("Asia/Tokyo"));
    const ctx = buildContext(["Asia/Tokyo"]);
    await cmd.execute(ctx);
    expect(mockUsers.updateSettings).not.toHaveBeenCalled();
    const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
    expect(reply).toContain("không có gì để đổi");
  });

  it("resets to default", async () => {
    mockUsers.findByUserId.mockResolvedValue(buildUser("Asia/Tokyo"));
    const ctx = buildContext(["reset"]);
    await cmd.execute(ctx);
    expect(mockUsers.updateSettings).toHaveBeenCalledWith("u1", {
      timezone: "Asia/Ho_Chi_Minh",
    });
  });
});
