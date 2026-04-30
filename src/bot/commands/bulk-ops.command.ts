import { Injectable, OnModuleInit } from "@nestjs/common";
import { DateParser } from "../../shared/utils/date-parser";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SchedulesService } from "../../schedules/schedules.service";
import { TagsService } from "../../schedules/tags.service";
import { UsersService } from "../../users/users.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";
import { Schedule } from "../../schedules/entities/schedule.entity";

const MAX_BULK = 100;
const PREVIEW_LIMIT = 10;
const CONFIRM_FLAGS = ["--xacnhan", "--xac-nhan", "--confirm", "--yes"];

interface ParsedFlags {
  hasConfirm: boolean;
  tag: string | null;
  rest: string[];
}

function parseFlags(args: string[]): ParsedFlags {
  let hasConfirm = false;
  let tag: string | null = null;
  const rest: string[] = [];
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i];
    if (CONFIRM_FLAGS.includes(a)) {
      hasConfirm = true;
      continue;
    }
    if (a === "--tag") {
      tag = args[i + 1] ?? null;
      i += 1;
      continue;
    }
    rest.push(a);
  }
  return { hasConfirm, tag, rest };
}

function buildPreview(items: Schedule[], dateParser: DateParser): string {
  const slice = items.slice(0, PREVIEW_LIMIT);
  const lines = slice.map(
    (s) =>
      `- #${s.id} ${dateParser.formatVietnam(s.start_time)} — ${s.title}`,
  );
  if (items.length > PREVIEW_LIMIT) {
    lines.push(`- ... và ${items.length - PREVIEW_LIMIT} lịch khác.`);
  }
  return lines.join("\n");
}

@Injectable()
export class HoanThanhTatCaCommand implements BotCommand, OnModuleInit {
  readonly name = "hoan-thanh-tat-ca";
  readonly aliases = [
    "hoanthanhtatca",
    "complete-all",
    "completeall",
    "ht-tatca",
  ];
  readonly description =
    "Đánh dấu hoàn-thành hàng loạt theo từ khoá hoặc tag (cần --xacnhan)";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax =
    "hoan-thanh-tat-ca <từ khoá> [--xacnhan] | hoan-thanh-tat-ca --tag <name> [--xacnhan]";
  readonly example = "hoan-thanh-tat-ca họp --xacnhan";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly tagsService: TagsService,
    private readonly formatter: MessageFormatter,
    private readonly dateParser: DateParser,
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

    const flags = parseFlags(ctx.args);
    if (!flags.tag && flags.rest.length === 0) {
      await ctx.reply(this.usageError(ctx.prefix));
      return;
    }

    let items: Schedule[];
    let label: string;
    if (flags.tag) {
      const normalized = this.tagsService.normalize(flags.tag);
      if (!normalized) {
        await ctx.reply(`⚠️ Tên tag không hợp lệ: \`${flags.tag}\`.`);
        return;
      }
      items = await this.tagsService.findSchedulesByTag(
        user.user_id,
        normalized,
        { onlyPending: true },
      );
      label = `tag \`${normalized}\``;
    } else {
      const keyword = flags.rest.join(" ").trim();
      items = await this.schedulesService.findPendingByKeyword(
        user.user_id,
        keyword,
        MAX_BULK,
      );
      label = `từ khoá \`${keyword}\``;
    }

    if (items.length === 0) {
      await ctx.reply(
        `ℹ️ Không có lịch \`pending\` nào khớp ${label}.`,
      );
      return;
    }

    if (!flags.hasConfirm) {
      const lines = [
        `🔎 Sẽ hoàn-thành ${items.length} lịch (khớp ${label}):`,
        buildPreview(items, this.dateParser),
        ``,
        `⚠️ Đây là thao tác hàng loạt. Để xác nhận, gõ lại lệnh kèm \`--xacnhan\`:`,
        `\`${ctx.prefix}${this.name} ${ctx.rawArgs} --xacnhan\``,
      ];
      await ctx.reply(lines.join("\n"));
      return;
    }

    const ids = items.map((s) => s.id);
    const count = await this.schedulesService.bulkComplete(user.user_id, ids);
    await ctx.reply(
      `✅ Đã hoàn-thành ${count} lịch (khớp ${label}). ` +
        `Hoàn tác từng lịch bằng \`${ctx.prefix}sua-lich <ID>\` đổi status về \`pending\`.`,
    );
  }

  private usageError(prefix: string): string {
    return [
      `⚠️ Cú pháp: \`${prefix}${this.syntax}\``,
      `Ví dụ:`,
      `- \`${prefix}hoan-thanh-tat-ca họp --xacnhan\``,
      `- \`${prefix}hoan-thanh-tat-ca --tag work --xacnhan\``,
    ].join("\n");
  }
}

@Injectable()
export class XoaTheoTagCommand implements BotCommand, OnModuleInit {
  readonly name = "xoa-theo-tag";
  readonly aliases = ["xoatheotag", "delete-by-tag", "deletebytag"];
  readonly description = "Xoá hàng loạt mọi lịch có tag (cần --xacnhan)";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "xoa-theo-tag <name> [--xacnhan]";
  readonly example = "xoa-theo-tag old --xacnhan";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly tagsService: TagsService,
    private readonly formatter: MessageFormatter,
    private readonly dateParser: DateParser,
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

    const flags = parseFlags(ctx.args);
    const tagName = flags.tag ?? flags.rest[0];
    if (!tagName) {
      await ctx.reply(
        `⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\``,
      );
      return;
    }
    const normalized = this.tagsService.normalize(tagName);
    if (!normalized) {
      await ctx.reply(`⚠️ Tên tag không hợp lệ: \`${tagName}\`.`);
      return;
    }

    const items = await this.tagsService.findSchedulesByTag(
      user.user_id,
      normalized,
    );
    if (items.length === 0) {
      await ctx.reply(`ℹ️ Không có lịch nào có tag \`${normalized}\`.`);
      return;
    }

    if (items.length > MAX_BULK) {
      await ctx.reply(
        `⚠️ Tag \`${normalized}\` có ${items.length} lịch — vượt quá giới hạn ${MAX_BULK}/lần. ` +
          `Hãy chia nhỏ hoặc dùng \`${ctx.prefix}lich-tag ${normalized}\` để xem & xoá tay.`,
      );
      return;
    }

    if (!flags.hasConfirm) {
      const lines = [
        `🔎 Sẽ XOÁ ${items.length} lịch có tag \`${normalized}\` (mọi status, không thể hoàn tác sau ${10} phút):`,
        buildPreview(items, this.dateParser),
        ``,
        `⚠️ Để xác nhận, gõ lại lệnh kèm \`--xacnhan\`:`,
        `\`${ctx.prefix}${this.name} ${normalized} --xacnhan\``,
      ];
      await ctx.reply(lines.join("\n"));
      return;
    }

    const ids = items.map((s) => s.id);
    const count = await this.schedulesService.bulkDelete(user.user_id, ids);
    await ctx.reply(
      `🗑️ Đã xoá ${count} lịch có tag \`${normalized}\`. ` +
        `Tag bản thân vẫn còn (xoá riêng bằng \`${ctx.prefix}tag-xoa ${normalized}\`).`,
    );
  }
}

@Injectable()
export class XoaCompletedTruocCommand implements BotCommand, OnModuleInit {
  readonly name = "xoa-completed-truoc";
  readonly aliases = [
    "xoacompletedtruoc",
    "delete-completed-before",
    "dcb",
  ];
  readonly description =
    "Xoá hàng loạt lịch đã hoàn-thành có ngày trước mốc (cần --xacnhan)";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "xoa-completed-truoc <DD-MM-YYYY> [--xacnhan]";
  readonly example = "xoa-completed-truoc 1-1-2026 --xacnhan";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly formatter: MessageFormatter,
    private readonly dateParser: DateParser,
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

    const flags = parseFlags(ctx.args);
    const dateStr = flags.rest[0];
    if (!dateStr) {
      await ctx.reply(`⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\``);
      return;
    }

    const before = this.dateParser.parseVietnamLocal(dateStr);
    if (!before) {
      await ctx.reply(
        `⚠️ Không nhận diện được ngày: \`${dateStr}\`. Dùng \`DD-MM-YYYY\`.`,
      );
      return;
    }

    const items = await this.schedulesService.findCompletedBefore(
      user.user_id,
      before,
      MAX_BULK,
    );
    if (items.length === 0) {
      await ctx.reply(
        `ℹ️ Không có lịch \`completed\` nào trước ${this.dateParser.formatVietnamDate(before)}.`,
      );
      return;
    }

    if (!flags.hasConfirm) {
      const lines = [
        `🔎 Sẽ XOÁ ${items.length} lịch \`completed\` trước ${this.dateParser.formatVietnamDate(before)}:`,
        buildPreview(items, this.dateParser),
        ``,
        `⚠️ Để xác nhận, gõ lại lệnh kèm \`--xacnhan\`:`,
        `\`${ctx.prefix}${this.name} ${dateStr} --xacnhan\``,
      ];
      await ctx.reply(lines.join("\n"));
      return;
    }

    const ids = items.map((s) => s.id);
    const count = await this.schedulesService.bulkDelete(user.user_id, ids);
    await ctx.reply(
      `🗑️ Đã xoá ${count} lịch \`completed\` trước ${this.dateParser.formatVietnamDate(before)}.`,
    );
  }
}
