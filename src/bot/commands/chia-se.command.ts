import { Injectable, OnModuleInit } from "@nestjs/common";
import { MessageFormatter } from "../../shared/utils/message-formatter";
import { SharesService } from "../../schedules/shares.service";
import { UsersService } from "../../users/users.service";
import { formatDateShort, formatTime } from "../../shared/utils/date-utils";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";

const CATEGORY = "👥 CHIA SẺ";

function parsePositiveInteger(input: string): number | null {
  if (!/^\d+$/.test(input)) return null;
  const v = Number(input);
  return Number.isInteger(v) && v > 0 ? v : null;
}

/**
 * Loại bỏ tiền tố `@` (nếu user copy mention dạng `@123456`).
 */
function normalizeUserId(input: string): string {
  return input.replace(/^@+/, "").trim();
}

@Injectable()
export class ChiaSeCommand implements BotCommand, OnModuleInit {
  readonly name = "chia-se";
  readonly aliases = ["chiase", "share"];
  readonly description = "Chia sẻ lịch (view-only) cho user khác";
  readonly category = CATEGORY;
  readonly syntax = "chia-se <ID> <user_id>";
  readonly example = "chia-se 5 1234567890";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly sharesService: SharesService,
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
          `Vd: \`${ctx.prefix}${this.example}\`\n` +
          `Người được chia sẻ phải đã từng dùng bot (gõ \`${ctx.prefix}batdau\`).`,
      );
      return;
    }

    const scheduleId = parsePositiveInteger(ctx.args[0]);
    if (!scheduleId) {
      await ctx.reply(`⚠️ ID lịch không hợp lệ: \`${ctx.args[0]}\`.`);
      return;
    }

    const targetId = normalizeUserId(ctx.args[1]);
    if (!targetId) {
      await ctx.reply(`⚠️ user_id không hợp lệ: \`${ctx.args[1]}\`.`);
      return;
    }
    if (targetId === user.user_id) {
      await ctx.reply("⚠️ Không thể chia sẻ lịch cho chính mình.");
      return;
    }

    const result = await this.sharesService.share(
      scheduleId,
      user.user_id,
      targetId,
    );
    if (!result) {
      await ctx.reply(
        `⚠️ Không thể chia sẻ. Có thể do: lịch #${scheduleId} không phải của bạn, ` +
          `hoặc user \`${targetId}\` chưa từng dùng bot (cần \`${ctx.prefix}batdau\`).`,
      );
      return;
    }

    if (result.added) {
      await ctx.reply(
        `👥 Đã chia sẻ lịch #${scheduleId} cho \`${targetId}\`. ` +
          `Tổng: ${result.sharedWith.length} người.`,
      );
    } else {
      await ctx.reply(
        `ℹ️ Lịch #${scheduleId} đã được chia sẻ cho \`${targetId}\` từ trước.`,
      );
    }
  }
}

@Injectable()
export class BoChiaSeCommand implements BotCommand, OnModuleInit {
  readonly name = "bo-chia-se";
  readonly aliases = ["bochiase", "unshare"];
  readonly description = "Gỡ chia sẻ lịch khỏi 1 user";
  readonly category = CATEGORY;
  readonly syntax = "bo-chia-se <ID> <user_id>";
  readonly example = "bo-chia-se 5 1234567890";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly sharesService: SharesService,
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
      await ctx.reply(`⚠️ ID lịch không hợp lệ: \`${ctx.args[0]}\`.`);
      return;
    }

    const targetId = normalizeUserId(ctx.args[1]);
    const result = await this.sharesService.unshare(
      scheduleId,
      user.user_id,
      targetId,
    );
    if (!result) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${scheduleId} của bạn.`);
      return;
    }

    if (result.removed) {
      await ctx.reply(
        `🗑️ Đã gỡ chia sẻ lịch #${scheduleId} với \`${targetId}\`. ` +
          `Còn lại: ${result.sharedWith.length} người.`,
      );
    } else {
      await ctx.reply(
        `ℹ️ Lịch #${scheduleId} chưa từng được chia sẻ cho \`${targetId}\`.`,
      );
    }
  }
}

@Injectable()
export class LichChiaSeCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-chia-se";
  readonly aliases = ["lichchiase", "shared"];
  readonly description = "Liệt kê lịch người khác chia sẻ cho bạn";
  readonly category = CATEGORY;
  readonly syntax = "lich-chia-se";
  readonly example = "lich-chia-se";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly sharesService: SharesService,
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

    const schedules = await this.sharesService.findSchedulesSharedWith(
      user.user_id,
    );
    await ctx.reply(
      this.formatter.formatScheduleDigest(
        schedules,
        "Lịch được chia sẻ với bạn",
        {
          emptyMessage:
            `Không có lịch nào được chia sẻ với bạn.\n` +
            `💡 Người khác có thể chia sẻ bằng \`${ctx.prefix}chia-se <ID> ${user.user_id}\`.`,
          footer:
            schedules.length > 0
              ? `💡 Tổng: ${schedules.length} lịch (view-only — chỉ chủ lịch sửa được).`
              : undefined,
        },
      ),
    );
  }
}

@Injectable()
export class ChiaSeAiCommand implements BotCommand, OnModuleInit {
  readonly name = "chia-se-ai";
  readonly aliases = ["chiaseai", "share-list"];
  readonly description = "Liệt kê những người được chia sẻ 1 lịch";
  readonly category = CATEGORY;
  readonly syntax = "chia-se-ai <ID>";
  readonly example = "chia-se-ai 5";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly sharesService: SharesService,
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

    const scheduleId = parsePositiveInteger(ctx.args[0]);
    if (!scheduleId) {
      await ctx.reply(`⚠️ ID không hợp lệ: \`${ctx.args[0]}\`.`);
      return;
    }

    const users = await this.sharesService.listSharedUsers(
      scheduleId,
      user.user_id,
    );
    if (users.length === 0) {
      await ctx.reply(
        `📭 Lịch #${scheduleId} chưa được chia sẻ cho ai.\n` +
          `💡 Chia sẻ: \`${ctx.prefix}chia-se ${scheduleId} <user_id>\`.`,
      );
      return;
    }

    const editors = await this.sharesService.listEditors(
      scheduleId,
      user.user_id,
    );
    const editorIds = new Set(editors.map((u) => u.user_id));
    const lines = users.map((u) => {
      const label = u.display_name || u.username || u.user_id;
      const role = editorIds.has(u.user_id) ? " ✏️ (edit)" : "";
      return `• ${label} (\`${u.user_id}\`)${role}`;
    });
    await ctx.reply(
      `👥 Lịch #${scheduleId} được chia sẻ cho ${users.length} người:\n` +
        lines.join("\n"),
    );
  }
}

@Injectable()
export class ChiaSeEditCommand implements BotCommand, OnModuleInit {
  readonly name = "chia-se-edit";
  readonly aliases = ["chiaseedit", "share-edit"];
  readonly description =
    "Cấp quyền EDIT lịch cho user khác (cần đã chia sẻ trước)";
  readonly category = CATEGORY;
  readonly syntax = "chia-se-edit <ID> <user_id>";
  readonly example = "chia-se-edit 5 1234567890";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly sharesService: SharesService,
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
          `Vd: \`${ctx.prefix}${this.example}\``,
      );
      return;
    }

    const scheduleId = parsePositiveInteger(ctx.args[0]);
    if (!scheduleId) {
      await ctx.reply(`⚠️ ID lịch không hợp lệ: \`${ctx.args[0]}\`.`);
      return;
    }

    const targetId = normalizeUserId(ctx.args[1]);
    if (!targetId) {
      await ctx.reply(`⚠️ user_id không hợp lệ: \`${ctx.args[1]}\`.`);
      return;
    }
    if (targetId === user.user_id) {
      await ctx.reply("⚠️ Không thể cấp quyền edit cho chính mình.");
      return;
    }

    const result = await this.sharesService.grantEdit(
      scheduleId,
      user.user_id,
      targetId,
    );
    if (!result) {
      await ctx.reply(
        `⚠️ Không thể cấp quyền. Kiểm tra: lịch #${scheduleId} có phải của bạn? ` +
          `User \`${targetId}\` đã dùng bot chưa (\`${ctx.prefix}batdau\`)?`,
      );
      return;
    }

    if (result.added) {
      await ctx.reply(
        `✏️ Đã cấp quyền EDIT lịch #${scheduleId} cho \`${targetId}\`. ` +
          `Tổng editor: ${result.editors.length} người.\n` +
          `💡 Họ giờ có thể \`${ctx.prefix}sua-lich ${scheduleId}\` và \`${ctx.prefix}hoan-thanh ${scheduleId}\`.`,
      );
    } else {
      await ctx.reply(
        `ℹ️ User \`${targetId}\` đã có quyền edit lịch #${scheduleId} từ trước.`,
      );
    }
  }
}

@Injectable()
export class BoChiaSeEditCommand implements BotCommand, OnModuleInit {
  readonly name = "bo-chia-se-edit";
  readonly aliases = ["bochiaseedit", "unshare-edit"];
  readonly description = "Gỡ quyền edit lịch khỏi 1 user";
  readonly category = CATEGORY;
  readonly syntax = "bo-chia-se-edit <ID> <user_id>";
  readonly example = "bo-chia-se-edit 5 1234567890";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly sharesService: SharesService,
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
      await ctx.reply(`⚠️ ID lịch không hợp lệ: \`${ctx.args[0]}\`.`);
      return;
    }

    const targetId = normalizeUserId(ctx.args[1]);
    const result = await this.sharesService.revokeEdit(
      scheduleId,
      user.user_id,
      targetId,
    );
    if (!result) {
      await ctx.reply(`⚠️ Không tìm thấy lịch #${scheduleId} của bạn.`);
      return;
    }

    if (result.removed) {
      await ctx.reply(
        `🗑️ Đã gỡ quyền edit lịch #${scheduleId} với \`${targetId}\`. ` +
          `Còn lại: ${result.editors.length} editor.`,
      );
    } else {
      await ctx.reply(
        `ℹ️ User \`${targetId}\` chưa có quyền edit lịch #${scheduleId}.`,
      );
    }
  }
}

@Injectable()
export class LichShareCuaToiCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-share-cua-toi";
  readonly aliases = ["lichsharecuatoi", "my-shared", "shared-by-me"];
  readonly description =
    "Liệt kê các lịch của bạn đã chia sẻ cho người khác (kèm editor / viewer)";
  readonly category = CATEGORY;
  readonly syntax = "lich-share-cua-toi";
  readonly example = "lich-share-cua-toi";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly sharesService: SharesService,
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

    const schedules = await this.sharesService.findSchedulesIShared(
      user.user_id,
    );
    if (schedules.length === 0) {
      await ctx.reply(
        `📭 Bạn chưa chia sẻ lịch nào.\n` +
          `💡 Chia sẻ: \`${ctx.prefix}chia-se <ID> <user_id>\` ` +
          `hoặc cấp quyền edit: \`${ctx.prefix}chia-se-edit <ID> <user_id>\`.`,
      );
      return;
    }

    const header = `【 LỊCH BẠN ĐÃ CHIA SẺ 】`;
    const separator = "━━━━━━━━━━━━━━━━━━━━";

    const items = schedules.map((schedule) => {
      const when = `${formatDateShort(schedule.start_time)} ${formatTime(schedule.start_time)}`;
      const editors = schedule.editors ?? [];
      const editorIds = new Set(editors.map((u) => u.user_id));
      const viewers = (schedule.sharedWith ?? []).filter(
        (u) => !editorIds.has(u.user_id),
      );

      const lines = [`➤ \`#${schedule.id}\` 『 ${when} 』 **${schedule.title}**`];
      if (editors.length > 0) {
        const list = editors
          .map((u) => `${u.display_name || u.username || u.user_id} (\`${u.user_id}\`)`)
          .join(", ");
        lines.push(`   ✏️ Edit (${editors.length}): ${list}`);
      }
      if (viewers.length > 0) {
        const list = viewers
          .map((u) => `${u.display_name || u.username || u.user_id} (\`${u.user_id}\`)`)
          .join(", ");
        lines.push(`   👁️ View (${viewers.length}): ${list}`);
      }
      return lines.join("\n");
    });

    const totalEditors = schedules.reduce(
      (sum, s) => sum + (s.editors?.length ?? 0),
      0,
    );
    const totalViewers = schedules.reduce(
      (sum, s) =>
        sum +
        (s.sharedWith ?? []).filter(
          (u) => !(s.editors ?? []).some((e) => e.user_id === u.user_id),
        ).length,
      0,
    );
    const footer =
      `💡 Tổng: ${schedules.length} lịch — ${totalEditors} editor, ${totalViewers} viewer.\n` +
      `Gỡ: \`${ctx.prefix}bo-chia-se <ID> <user_id>\` / \`${ctx.prefix}bo-chia-se-edit <ID> <user_id>\`.`;

    await ctx.reply(
      [header, separator, items.join("\n\n"), footer].join("\n\n"),
    );
  }
}
