import { Test, TestingModule } from "@nestjs/testing";
import {
  BoChiaSeCommand,
  BoChiaSeEditCommand,
  ChiaSeAiCommand,
  ChiaSeCommand,
  ChiaSeEditCommand,
  LichChiaSeCommand,
} from "src/bot/commands/chia-se.command";
import { CommandRegistry } from "src/bot/commands/command-registry";
import { UsersService } from "src/users/users.service";
import { SharesService } from "src/schedules/shares.service";
import { MessageFormatter } from "src/shared/utils/message-formatter";
import { CommandContext } from "src/bot/commands/command.types";
import { User } from "src/users/entities/user.entity";

const ownerUser: User = { user_id: "owner1" } as any;

const buildContext = (args: string[]): CommandContext =>
  ({
    message: {
      message_id: "msg",
      channel_id: "ch",
      sender_id: "owner1",
    } as any,
    rawArgs: args.join(" "),
    prefix: "*",
    args,
    reply: jest.fn(),
    send: jest.fn(),
    sendDM: jest.fn(),
    ephemeralReply: jest.fn(),
  }) as any;

describe("Chia-se commands", () => {
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSharesService: jest.Mocked<SharesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  beforeEach(() => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSharesService = {
      share: jest.fn(),
      unshare: jest.fn(),
      listSharedUsers: jest.fn(),
      findSchedulesSharedWith: jest.fn(),
      getParticipantUserIds: jest.fn(),
      grantEdit: jest.fn(),
      revokeEdit: jest.fn(),
      canEdit: jest.fn(),
      listEditors: jest.fn().mockResolvedValue([]),
    } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
      formatScheduleDigest: jest.fn(
        (schedules, title) => `DIGEST(${title}, ${schedules.length})`,
      ),
    } as any;
  });

  afterEach(() => jest.clearAllMocks());

  async function build<T>(provider: any): Promise<T> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        provider,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SharesService, useValue: mockSharesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();
    return module.get<T>(provider);
  }

  describe("ChiaSeCommand", () => {
    let cmd: ChiaSeCommand;
    beforeEach(async () => {
      cmd = await build<ChiaSeCommand>(ChiaSeCommand);
    });

    it("registers itself", () => {
      cmd.onModuleInit();
      expect(mockRegistry.register).toHaveBeenCalledWith(cmd);
    });

    it("rejects when user not initialised", async () => {
      mockUsersService.findByUserId.mockResolvedValue(null);
      const ctx = buildContext(["5", "user2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
    });

    it("rejects missing args", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      const ctx = buildContext(["5"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Cú pháp"),
      );
    });

    it("rejects bad ID", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      const ctx = buildContext(["abc", "user2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("ID lịch không hợp lệ"),
      );
    });

    it("rejects sharing to self", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      const ctx = buildContext(["5", "owner1"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("chính mình"),
      );
    });

    it("strips @ prefix from user_id and shares", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.share.mockResolvedValue({
        added: true,
        sharedWith: [{ user_id: "user2" } as User],
      });
      const ctx = buildContext(["5", "@user2"]);
      await cmd.execute(ctx);
      expect(mockSharesService.share).toHaveBeenCalledWith(
        5,
        "owner1",
        "user2",
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Đã chia sẻ"),
      );
    });

    it("reports already-shared", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.share.mockResolvedValue({
        added: false,
        sharedWith: [{ user_id: "user2" } as User],
      });
      const ctx = buildContext(["5", "user2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("đã được chia sẻ"),
      );
    });

    it("reports not-found", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.share.mockResolvedValue(null);
      const ctx = buildContext(["5", "user2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Không thể chia sẻ"),
      );
    });
  });

  describe("BoChiaSeCommand", () => {
    let cmd: BoChiaSeCommand;
    beforeEach(async () => {
      cmd = await build<BoChiaSeCommand>(BoChiaSeCommand);
    });

    it("removes share", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.unshare.mockResolvedValue({
        removed: true,
        sharedWith: [],
      });
      const ctx = buildContext(["5", "user2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Đã gỡ chia sẻ"),
      );
    });

    it("reports not-shared", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.unshare.mockResolvedValue({
        removed: false,
        sharedWith: [],
      });
      const ctx = buildContext(["5", "user2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("chưa từng được chia sẻ"),
      );
    });

    it("reports schedule not found", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.unshare.mockResolvedValue(null);
      const ctx = buildContext(["5", "user2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Không tìm thấy lịch"),
      );
    });
  });

  describe("LichChiaSeCommand", () => {
    let cmd: LichChiaSeCommand;
    beforeEach(async () => {
      cmd = await build<LichChiaSeCommand>(LichChiaSeCommand);
    });

    it("lists shared schedules", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.findSchedulesSharedWith.mockResolvedValue([
        { id: 5 } as any,
      ]);
      const ctx = buildContext([]);
      await cmd.execute(ctx);
      expect(mockSharesService.findSchedulesSharedWith).toHaveBeenCalledWith(
        "owner1",
      );
      expect(mockFormatter.formatScheduleDigest).toHaveBeenCalled();
    });
  });

  describe("ChiaSeAiCommand", () => {
    let cmd: ChiaSeAiCommand;
    beforeEach(async () => {
      cmd = await build<ChiaSeAiCommand>(ChiaSeAiCommand);
    });

    it("rejects bad args", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      const ctx = buildContext([]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Cú pháp"),
      );
    });

    it("reports empty share list", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.listSharedUsers.mockResolvedValue([]);
      const ctx = buildContext(["5"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("chưa được chia sẻ"),
      );
    });

    it("lists users", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.listSharedUsers.mockResolvedValue([
        { user_id: "u2", username: "alice" } as User,
        { user_id: "u3", display_name: "Bob" } as User,
      ]);
      const ctx = buildContext(["5"]);
      await cmd.execute(ctx);
      const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
      expect(reply).toContain("alice");
      expect(reply).toContain("Bob");
      expect(reply).toContain("`u2`");
    });

    it("annotates editors with ✏️", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.listSharedUsers.mockResolvedValue([
        { user_id: "u2", username: "alice" } as User,
        { user_id: "u3", username: "bob" } as User,
      ]);
      mockSharesService.listEditors.mockResolvedValue([
        { user_id: "u2" } as User,
      ]);
      const ctx = buildContext(["5"]);
      await cmd.execute(ctx);
      const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
      expect(reply).toMatch(/alice.*✏️/);
      expect(reply).not.toMatch(/bob.*✏️/);
    });
  });

  describe("ChiaSeEditCommand", () => {
    let cmd: ChiaSeEditCommand;
    beforeEach(async () => {
      cmd = await build<ChiaSeEditCommand>(ChiaSeEditCommand);
    });

    it("rejects when user not initialised", async () => {
      mockUsersService.findByUserId.mockResolvedValue(null);
      const ctx = buildContext(["5", "u2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
    });

    it("rejects missing args", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      const ctx = buildContext(["5"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Cú pháp"),
      );
    });

    it("rejects granting to self", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      const ctx = buildContext(["5", "owner1"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("chính mình"),
      );
    });

    it("strips @ and grants edit", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.grantEdit.mockResolvedValue({
        added: true,
        editors: [{ user_id: "u2" } as User],
      });
      const ctx = buildContext(["5", "@u2"]);
      await cmd.execute(ctx);
      expect(mockSharesService.grantEdit).toHaveBeenCalledWith(
        5,
        "owner1",
        "u2",
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Đã cấp quyền EDIT"),
      );
    });

    it("reports already-granted", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.grantEdit.mockResolvedValue({
        added: false,
        editors: [{ user_id: "u2" } as User],
      });
      const ctx = buildContext(["5", "u2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("đã có quyền edit"),
      );
    });

    it("reports not-found / not-owner", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.grantEdit.mockResolvedValue(null);
      const ctx = buildContext(["5", "u2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Không thể cấp quyền"),
      );
    });
  });

  describe("BoChiaSeEditCommand", () => {
    let cmd: BoChiaSeEditCommand;
    beforeEach(async () => {
      cmd = await build<BoChiaSeEditCommand>(BoChiaSeEditCommand);
    });

    it("rejects missing args", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      const ctx = buildContext(["5"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Cú pháp"),
      );
    });

    it("revokes edit", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.revokeEdit.mockResolvedValue({
        removed: true,
        editors: [],
      });
      const ctx = buildContext(["5", "u2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Đã gỡ quyền edit"),
      );
    });

    it("reports user-not-editor", async () => {
      mockUsersService.findByUserId.mockResolvedValue(ownerUser);
      mockSharesService.revokeEdit.mockResolvedValue({
        removed: false,
        editors: [],
      });
      const ctx = buildContext(["5", "u2"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("chưa có quyền edit"),
      );
    });
  });
});
