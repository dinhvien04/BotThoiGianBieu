import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { TagsService } from "../../schedules/tags.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

const CATEGORY = "🏷️ NHÃN";

function parsePositiveInteger(input: string): number | null {
  if (!/^\d+$/.test(input)) return null;
  const value = Number(input);
  return Number.isInteger(value) && value > 0 ? value : null;
}

@Injectable()
export class TagThemCommand implements BotCommand, OnModuleInit {
  readonly name = "tag-them";
  readonly aliases = ["tagthem", "themtag", "them-tag"];
  readonly description = "Tạo nhãn mới (hoặc no-op nếu đã có)";
  readonly category = CATEGORY;
  readonly syntax = "tag-them <name>";
  readonly example = "tag-them hoc-tap";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly tagsService: TagsService,
    private readonly formatter: MessageFormatter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(this.formatter.formatNotInitialized(ctx.prefix));
      return;
    }

    if (ctx.args.length < 1) {
      await ctx.reply(
        `⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\`\n` +
          `Tên nhãn chỉ chứa \`a-z\`, \`0-9\`, \`-\`, \`_\` (≤30 ký tự).`,
      );
      return;
    }

    const name = ctx.args[0];
    const result = await this.tagsService.create(user.user_id, name);
    if (!result) {
      await ctx.reply(
        `⚠️ Tên nhãn không hợp lệ: \`${name}\`. Chỉ chấp nhận \`a-z\`, \`0-9\`, \`-\`, \`_\` (≤30 ký tự).`,
      );
      return;
    }

    if (result.created) {
      await ctx.reply(`🏷️ Đã tạo nhãn \`#${result.tag.name}\`.`);
    } else {
      await ctx.reply(`ℹ️ Nhãn \`#${result.tag.name}\` đã tồn tại.`);
    }
  }
}

@Injectable()
export class TagXoaCommand implements BotCommand, OnModuleInit {
  readonly name = "tag-xoa";
  readonly aliases = ["tagxoa", "xoatag", "xoa-tag"];
  readonly description = "Xoá nhãn (gỡ khỏi mọi lịch)";
  readonly category = CATEGORY;
  readonly syntax = "tag-xoa <name>";
  readonly example = "tag-xoa hoc-tap";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly tagsService: TagsService,
    private readonly formatter: MessageFormatter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(this.formatter.formatNotInitialized(ctx.prefix));
      return;
    }

    if (ctx.args.length < 1) {
      await ctx.reply(`⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\``);
      return;
    }

    const name = ctx.args[0];
    const removed = await this.tagsService.deleteByName(user.user_id, name);
    if (!removed) {
      await ctx.reply(`⚠️ Không tìm thấy nhãn \`${name}\`.`);
      return;
    }
    await ctx.reply(`🗑️ Đã xoá nhãn \`#${name.toLowerCase()}\`.`);
  }
}

@Injectable()
export class TagDsCommand implements BotCommand, OnModuleInit {
  readonly name = "tag-ds";
  readonly aliases = ["tagds", "tags", "ds-tag"];
  readonly description = "Liệt kê các nhãn của bạn";
  readonly category = CATEGORY;
  readonly syntax = "tag-ds";
  readonly example = "tag-ds";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly tagsService: TagsService,
    private readonly formatter: MessageFormatter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(this.formatter.formatNotInitialized(ctx.prefix));
      return;
    }

    const tags = await this.tagsService.listForUser(user.user_id);
    if (tags.length === 0) {
      await ctx.reply(
        `📭 Bạn chưa có nhãn nào. Tạo nhãn: \`${ctx.prefix}tag-them <name>\`.`,
      );
      return;
    }

    const names = tags.map((t) => `\`#${t.name}\``).join(", ");
    await ctx.reply(`🏷️ Nhãn của bạn (${tags.length}): ${names}`);
  }
}

@Injectable()
export class TagCommand implements BotCommand, OnModuleInit {
  readonly name = "tag";
  readonly aliases = ["gantag", "gan-tag"];
  readonly description = "Gắn nhãn vào lịch (auto-tạo nhãn mới nếu chưa có)";
  readonly category = CATEGORY;
  readonly syntax = "tag <ID> <name1> [name2 ...]";
  readonly example = "tag 5 hoc-tap quan-trong";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly tagsService: TagsService,
    private readonly formatter: MessageFormatter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(this.formatter.formatNotInitialized(ctx.prefix));
      return;
    }

    if (ctx.args.length < 2) {
      await ctx.reply(
        `⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\`\n` +
          `Ví dụ: \`${ctx.prefix}tag 5 hoc-tap quan-trong\``,
      );
      return;
    }

    const scheduleId = parsePositiveInteger(ctx.args[0]);
    if (!scheduleId) {
      await ctx.reply(`⚠️ ID không hợp lệ: \`${ctx.args[0]}\`.`);
      return;
    }

    const tagNames = ctx.args.slice(1);
    const result = await this.tagsService.attachTags(
      user.user_id,
      scheduleId,
      tagNames,
    );
    if (!result) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${scheduleId} của bạn.`);
      return;
    }

    const lines = [
      `🏷️ Lịch #${scheduleId} hiện có nhãn: ${
        result.tags.map((t) => `\`#${t.name}\``).join(", ") || "(không có)"
      }`,
    ];
    if (result.invalid.length > 0) {
      lines.push(
        `⚠️ Bỏ qua nhãn không hợp lệ: ${result.invalid
          .map((n) => `\`${n}\``)
          .join(", ")} (chỉ \`a-z\`, \`0-9\`, \`-\`, \`_\`).`,
      );
    }
    await ctx.reply(lines.join("\n"));
  }
}

@Injectable()
export class UntagCommand implements BotCommand, OnModuleInit {
  readonly name = "untag";
  readonly aliases = ["bo-tag", "botag", "go-tag"];
  readonly description = "Gỡ nhãn khỏi lịch";
  readonly category = CATEGORY;
  readonly syntax = "untag <ID> <name>";
  readonly example = "untag 5 hoc-tap";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly tagsService: TagsService,
    private readonly formatter: MessageFormatter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(this.formatter.formatNotInitialized(ctx.prefix));
      return;
    }

    if (ctx.args.length < 2) {
      await ctx.reply(`⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\``);
      return;
    }

    const scheduleId = parsePositiveInteger(ctx.args[0]);
    if (!scheduleId) {
      await ctx.reply(`⚠️ ID không hợp lệ: \`${ctx.args[0]}\`.`);
      return;
    }

    const tagName = ctx.args[1];
    const result = await this.tagsService.detachTag(
      user.user_id,
      scheduleId,
      tagName,
    );
    if (!result) {
      await ctx.reply(
        `⚠️ Không tìm thấy lịch #${scheduleId} của bạn hoặc nhãn không hợp lệ.`,
      );
      return;
    }

    if (result.removed) {
      await ctx.reply(`🗑️ Đã gỡ nhãn \`#${result.tagName}\` khỏi lịch #${scheduleId}.`);
    } else {
      await ctx.reply(
        `ℹ️ Lịch #${scheduleId} không có nhãn \`#${result.tagName}\`, không gỡ gì.`,
      );
    }
  }
}
