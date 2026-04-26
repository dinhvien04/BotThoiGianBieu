import { Test, TestingModule } from "@nestjs/testing";
import {
  TagCommand,
  TagDsCommand,
  TagThemCommand,
  TagXoaCommand,
  UntagCommand,
} from "../../src/bot/commands/tag.command";
import { CommandRegistry } from "../../src/bot/commands/command-registry";
import { UsersService } from "../../src/users/users.service";
import { TagsService } from "../../src/schedules/tags.service";
import { MessageFormatter } from "../../src/shared/utils/message-formatter";
import { CommandContext } from "../../src/bot/commands/command.types";
import { User } from "../../src/users/entities/user.entity";
import { Tag } from "../../src/schedules/entities/tag.entity";

const mockUser: User = { user_id: "user123" } as any;

const buildContext = (args: string[]): CommandContext =>
  ({
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
  }) as any;

describe("Tag commands", () => {
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockTagsService: jest.Mocked<TagsService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  beforeEach(() => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockTagsService = {
      normalize: jest.fn((s: string) => {
        const t = (s ?? "").trim().toLowerCase();
        return /^[a-z0-9_-]+$/.test(t) && t.length <= 30 ? t : null;
      }),
      listForUser: jest.fn(),
      findByName: jest.fn(),
      findOrCreate: jest.fn(),
      create: jest.fn(),
      deleteByName: jest.fn(),
      attachTags: jest.fn(),
      detachTag: jest.fn(),
      findSchedulesByTag: jest.fn(),
      findTagsForSchedule: jest.fn(),
    } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(() => "NOT_INIT"),
    } as any;
  });

  afterEach(() => jest.clearAllMocks());

  async function buildModule<T>(provider: any): Promise<T> {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        provider,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: TagsService, useValue: mockTagsService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();
    return module.get<T>(provider);
  }

  describe("TagThemCommand", () => {
    let cmd: TagThemCommand;
    beforeEach(async () => {
      cmd = await buildModule<TagThemCommand>(TagThemCommand);
    });

    it("registers itself", () => {
      cmd.onModuleInit();
      expect(mockRegistry.register).toHaveBeenCalledWith(cmd);
    });

    it("rejects when user not initialised", async () => {
      mockUsersService.findByUserId.mockResolvedValue(null);
      const ctx = buildContext(["work"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith("NOT_INIT");
    });

    it("rejects missing name", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext([]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Cú pháp"),
      );
    });

    it("creates new tag", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.create.mockResolvedValue({
        tag: { id: 1, name: "work" } as Tag,
        created: true,
      });
      const ctx = buildContext(["work"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith("🏷️ Đã tạo nhãn `#work`.");
    });

    it("reports already-exists when create returns existing", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.create.mockResolvedValue({
        tag: { id: 1, name: "work" } as Tag,
        created: false,
      });
      const ctx = buildContext(["WORK"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith("ℹ️ Nhãn `#work` đã tồn tại.");
    });

    it("rejects invalid name (returns null)", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.create.mockResolvedValue(null);
      const ctx = buildContext(["bad name!"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("không hợp lệ"),
      );
    });
  });

  describe("TagXoaCommand", () => {
    let cmd: TagXoaCommand;
    beforeEach(async () => {
      cmd = await buildModule<TagXoaCommand>(TagXoaCommand);
    });

    it("deletes tag and confirms", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.deleteByName.mockResolvedValue(true);
      const ctx = buildContext(["work"]);
      await cmd.execute(ctx);
      expect(mockTagsService.deleteByName).toHaveBeenCalledWith(
        "user123",
        "work",
      );
      expect(ctx.reply).toHaveBeenCalledWith("🗑️ Đã xoá nhãn `#work`.");
    });

    it("reports not-found", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.deleteByName.mockResolvedValue(false);
      const ctx = buildContext(["ghost"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Không tìm thấy"),
      );
    });
  });

  describe("TagDsCommand", () => {
    let cmd: TagDsCommand;
    beforeEach(async () => {
      cmd = await buildModule<TagDsCommand>(TagDsCommand);
    });

    it("lists user tags", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.listForUser.mockResolvedValue([
        { id: 1, name: "work" } as Tag,
        { id: 2, name: "study" } as Tag,
      ]);
      const ctx = buildContext([]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("`#work`"),
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("`#study`"),
      );
    });

    it("shows empty hint when no tags", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.listForUser.mockResolvedValue([]);
      const ctx = buildContext([]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("chưa có nhãn"),
      );
    });
  });

  describe("TagCommand (attach)", () => {
    let cmd: TagCommand;
    beforeEach(async () => {
      cmd = await buildModule<TagCommand>(TagCommand);
    });

    it("rejects bad ID", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(["abc", "work"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("ID không hợp lệ"),
      );
    });

    it("rejects when schedule not found", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.attachTags.mockResolvedValue(null);
      const ctx = buildContext(["5", "work"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Không tìm thấy lịch #5"),
      );
    });

    it("attaches tags + reports success", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.attachTags.mockResolvedValue({
        tags: [
          { id: 1, name: "work" } as Tag,
          { id: 2, name: "important" } as Tag,
        ],
        invalid: [],
      });
      const ctx = buildContext(["5", "work", "important"]);
      await cmd.execute(ctx);
      expect(mockTagsService.attachTags).toHaveBeenCalledWith(
        "user123",
        5,
        ["work", "important"],
      );
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("`#work`, `#important`"),
      );
    });

    it("reports invalid names alongside attach", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.attachTags.mockResolvedValue({
        tags: [{ id: 1, name: "work" } as Tag],
        invalid: ["bad name"],
      });
      const ctx = buildContext(["5", "work", "bad name"]);
      await cmd.execute(ctx);
      const reply = (ctx.reply as jest.Mock).mock.calls[0][0];
      expect(reply).toContain("Bỏ qua nhãn không hợp lệ");
      expect(reply).toContain("`bad name`");
    });
  });

  describe("UntagCommand", () => {
    let cmd: UntagCommand;
    beforeEach(async () => {
      cmd = await buildModule<UntagCommand>(UntagCommand);
    });

    it("removes tag from schedule", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.detachTag.mockResolvedValue({
        removed: true,
        tagName: "work",
      });
      const ctx = buildContext(["5", "work"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        "🗑️ Đã gỡ nhãn `#work` khỏi lịch #5.",
      );
    });

    it("reports tag not attached", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.detachTag.mockResolvedValue({
        removed: false,
        tagName: "work",
      });
      const ctx = buildContext(["5", "work"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("không có nhãn"),
      );
    });

    it("reports schedule not found", async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockTagsService.detachTag.mockResolvedValue(null);
      const ctx = buildContext(["5", "work"]);
      await cmd.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining("Không tìm thấy"),
      );
    });
  });
});
