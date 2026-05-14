import { Test, TestingModule } from "@nestjs/testing";
import { GioLamCommand } from "src/bot/commands/gio-lam.command";
import { CommandRegistry } from "src/bot/commands/command-registry";
import { UsersService } from "src/users/users.service";
import { CommandContext } from "src/bot/commands/command.types";

const buildContext = (args: string[]): CommandContext =>
  ({
    message: {
      message_id: "msg",
      channel_id: "ch",
      sender_id: "user1",
    } as any,
    rawArgs: args.join(" "),
    prefix: "*",
    args,
    reply: jest.fn(),
    send: jest.fn(),
    sendDM: jest.fn(),
    ephemeralReply: jest.fn(),
  }) as any;

describe("GioLamCommand", () => {
  let cmd: GioLamCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = {
      findByUserId: jest.fn(),
      updateSettings: jest.fn(),
    } as any;
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GioLamCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();
    cmd = module.get(GioLamCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it("registers itself", () => {
    cmd.onModuleInit();
    expect(mockRegistry.register).toHaveBeenCalledWith(cmd);
  });

  it("rejects when not initialised", async () => {
    mockUsersService.findByUserId.mockResolvedValue(null);
    const ctx = buildContext([]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("chưa khởi tạo"),
    );
  });

  it("shows current range when no args", async () => {
    mockUsersService.findByUserId.mockResolvedValue({
      user_id: "user1",
      settings: { work_start_hour: 8, work_end_hour: 18 } as any,
    } as any);
    const ctx = buildContext([]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("8h - 18h"),
    );
  });

  it("shows 'tắt' when start === end", async () => {
    mockUsersService.findByUserId.mockResolvedValue({
      user_id: "user1",
      settings: { work_start_hour: 0, work_end_hour: 0 } as any,
    } as any);
    const ctx = buildContext([]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining("tắt"));
  });

  it("disables on 'tat'", async () => {
    mockUsersService.findByUserId.mockResolvedValue({
      user_id: "user1",
      settings: { work_start_hour: 8, work_end_hour: 18 } as any,
    } as any);
    const ctx = buildContext(["tat"]);
    await cmd.execute(ctx);
    expect(mockUsersService.updateSettings).toHaveBeenCalledWith("user1", {
      work_start_hour: 0,
      work_end_hour: 0,
    });
  });

  it("rejects invalid hour", async () => {
    mockUsersService.findByUserId.mockResolvedValue({
      user_id: "user1",
      settings: { work_start_hour: 0, work_end_hour: 0 } as any,
    } as any);
    const ctx = buildContext(["abc", "18"]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("phải là số nguyên 0-24"),
    );
    expect(mockUsersService.updateSettings).not.toHaveBeenCalled();
  });

  it("sets 8 18", async () => {
    mockUsersService.findByUserId.mockResolvedValue({
      user_id: "user1",
      settings: { work_start_hour: 0, work_end_hour: 0 } as any,
    } as any);
    const ctx = buildContext(["8", "18"]);
    await cmd.execute(ctx);
    expect(mockUsersService.updateSettings).toHaveBeenCalledWith("user1", {
      work_start_hour: 8,
      work_end_hour: 18,
    });
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("8h - 18h"),
    );
  });

  it("notes overnight when start > end", async () => {
    mockUsersService.findByUserId.mockResolvedValue({
      user_id: "user1",
      settings: { work_start_hour: 0, work_end_hour: 0 } as any,
    } as any);
    const ctx = buildContext(["22", "7"]);
    await cmd.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining("qua đêm"),
    );
  });

  it("treats start === end as disabled", async () => {
    mockUsersService.findByUserId.mockResolvedValue({
      user_id: "user1",
      settings: { work_start_hour: 0, work_end_hour: 0 } as any,
    } as any);
    const ctx = buildContext(["8", "8"]);
    await cmd.execute(ctx);
    expect(mockUsersService.updateSettings).toHaveBeenCalledWith("user1", {
      work_start_hour: 0,
      work_end_hour: 0,
    });
  });
});
