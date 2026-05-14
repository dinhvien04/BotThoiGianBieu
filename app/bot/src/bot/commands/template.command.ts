import { Injectable, OnModuleInit } from "@nestjs/common";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";
import { UsersService } from "../../users/users.service";
import { SchedulesService } from "../../schedules/schedules.service";
import {
  TemplatesService,
  MAX_TEMPLATE_NAME_LENGTH,
} from "../../schedules/templates.service";
import { ScheduleTemplate } from "../../schedules/entities/schedule-template.entity";
import { DateParser } from "../../shared/utils/date-parser";

const PRIORITY_BADGE: Record<string, string> = {
  low: "🟢",
  normal: "🟡",
  high: "🔴",
};

function formatTemplate(t: ScheduleTemplate): string {
  const lines: string[] = [];
  lines.push(`• \`${t.name}\` ${PRIORITY_BADGE[t.priority] ?? ""} ${t.title}`);
  const meta: string[] = [`loại: ${t.item_type}`];
  if (t.duration_minutes) meta.push(`thời lượng: ${t.duration_minutes}p`);
  if (t.default_remind_minutes)
    meta.push(`nhắc trước: ${t.default_remind_minutes}p`);
  lines.push(`  ${meta.join(" · ")}`);
  if (t.description) lines.push(`  📝 ${t.description}`);
  return lines.join("\n");
}

@Injectable()
export class TaoTemplateCommand implements BotCommand, OnModuleInit {
  readonly name = "tao-template";
  readonly aliases = ["taotemplate", "save-template"];
  readonly description = "Lưu lịch hiện có thành template để clone nhanh sau";
  readonly category = "📋 TEMPLATE";
  readonly syntax = "tao-template <tên> <ID lịch>";
  readonly example = "tao-template hop-tuan 12";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly templatesService: TemplatesService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(
        `⚠️ Bạn chưa khởi tạo. Gõ \`${ctx.prefix}batdau\` trước.`,
      );
      return;
    }

    if (ctx.args.length < 2) {
      await ctx.reply(
        `⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\`\n` +
          `Vd: \`${ctx.prefix}${this.example}\`.`,
      );
      return;
    }

    const rawName = ctx.args[0];
    const idStr = ctx.args[1];
    const name = TemplatesService.normalizeName(rawName);
    if (!TemplatesService.isValidName(name)) {
      await ctx.reply(
        `⚠️ Tên template không hợp lệ. Chỉ a-z, 0-9, \`_\`, \`-\`, tối đa ${MAX_TEMPLATE_NAME_LENGTH} ký tự.`,
      );
      return;
    }

    const id = Number(idStr);
    if (!Number.isInteger(id) || id <= 0) {
      await ctx.reply(`⚠️ ID lịch không hợp lệ: \`${idStr}\`.`);
      return;
    }

    const schedule = await this.schedulesService.findById(id, user.user_id);
    if (!schedule) {
      await ctx.reply(
        `❌ Không tìm thấy lịch #${id} của bạn.`,
      );
      return;
    }

    const exists = await this.templatesService.existsByName(user.user_id, name);
    if (exists) {
      await ctx.reply(
        `⚠️ Bạn đã có template tên \`${name}\` rồi. Dùng \`${ctx.prefix}xoa-template ${name}\` trước nếu muốn ghi đè.`,
      );
      return;
    }

    const t = await this.templatesService.createFromSchedule(
      user.user_id,
      name,
      schedule,
    );

    const lines = [
      `✅ Đã lưu template \`${t.name}\` từ lịch #${id}.`,
      ``,
      formatTemplate(t),
      ``,
      `💡 Tạo lịch mới từ template: \`${ctx.prefix}tu-template ${t.name} <DD-MM-YYYY HH:mm>\``,
    ];
    await ctx.reply(lines.join("\n"));
  }
}

@Injectable()
export class TuTemplateCommand implements BotCommand, OnModuleInit {
  readonly name = "tu-template";
  readonly aliases = ["tutemplate", "from-template"];
  readonly description = "Tạo lịch mới từ template";
  readonly category = "📋 TEMPLATE";
  readonly syntax = "tu-template <tên> <DD-MM-YYYY HH:mm>";
  readonly example = "tu-template hop-tuan 28-04-2026 09:00";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly templatesService: TemplatesService,
    private readonly dateParser: DateParser,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(
        `⚠️ Bạn chưa khởi tạo. Gõ \`${ctx.prefix}batdau\` trước.`,
      );
      return;
    }

    if (ctx.args.length < 2) {
      await ctx.reply(
        `⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\`\n` +
          `Vd: \`${ctx.prefix}${this.example}\`.`,
      );
      return;
    }

    const rawName = ctx.args[0];
    const datetimeRaw = ctx.args.slice(1).join(" ");

    const t = await this.templatesService.findByName(user.user_id, rawName);
    if (!t) {
      await ctx.reply(
        `❌ Không tìm thấy template \`${rawName}\`. Xem danh sách: \`${ctx.prefix}ds-template\`.`,
      );
      return;
    }

    const start = this.dateParser.parseVietnamLocal(datetimeRaw);
    if (!start) {
      await ctx.reply(
        `⚠️ Thời gian không hợp lệ: \`${datetimeRaw}\`. Định dạng: \`DD-MM-YYYY HH:mm\`.`,
      );
      return;
    }

    const endTime = t.duration_minutes
      ? new Date(start.getTime() + t.duration_minutes * 60_000)
      : null;
    const remindMinutes =
      t.default_remind_minutes ??
      user.settings?.default_remind_minutes ??
      null;
    const remindAt =
      remindMinutes && remindMinutes > 0
        ? new Date(start.getTime() - remindMinutes * 60_000)
        : null;

    const schedule = await this.schedulesService.create({
      user_id: user.user_id,
      item_type: t.item_type,
      title: t.title,
      description: t.description,
      start_time: start,
      end_time: endTime,
      remind_at: remindAt,
      priority: t.priority,
    });

    const lines = [
      `✅ Đã tạo lịch #${schedule.id} từ template \`${t.name}\`.`,
      ``,
      `${PRIORITY_BADGE[schedule.priority] ?? ""} **${schedule.title}**`,
      `⏰ Bắt đầu: ${this.dateParser.formatVietnam(start)}`,
    ];
    if (endTime) lines.push(`🏁 Kết thúc: ${this.dateParser.formatVietnam(endTime)}`);
    if (remindAt)
      lines.push(`🔔 Nhắc lúc: ${this.dateParser.formatVietnam(remindAt)}`);
    if (schedule.description) lines.push(`📝 ${schedule.description}`);

    await ctx.reply(lines.join("\n"));
  }
}

@Injectable()
export class DsTemplateCommand implements BotCommand, OnModuleInit {
  readonly name = "ds-template";
  readonly aliases = ["dstemplate", "list-template", "templates"];
  readonly description = "Liệt kê các template đã lưu";
  readonly category = "📋 TEMPLATE";
  readonly syntax = "ds-template";
  readonly example = "ds-template";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly templatesService: TemplatesService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(
        `⚠️ Bạn chưa khởi tạo. Gõ \`${ctx.prefix}batdau\` trước.`,
      );
      return;
    }

    const list = await this.templatesService.listForUser(user.user_id);
    if (list.length === 0) {
      await ctx.reply(
        `📋 Bạn chưa có template nào.\n` +
          `Tạo: \`${ctx.prefix}tao-template <tên> <ID lịch>\`.`,
      );
      return;
    }

    const lines = [
      `📋 **Templates của bạn (${list.length})**`,
      ``,
      ...list.map(formatTemplate),
      ``,
      `💡 Dùng: \`${ctx.prefix}tu-template <tên> <DD-MM-YYYY HH:mm>\`.`,
    ];
    await ctx.reply(lines.join("\n"));
  }
}

@Injectable()
export class XoaTemplateCommand implements BotCommand, OnModuleInit {
  readonly name = "xoa-template";
  readonly aliases = ["xoatemplate", "delete-template"];
  readonly description = "Xoá template";
  readonly category = "📋 TEMPLATE";
  readonly syntax = "xoa-template <tên>";
  readonly example = "xoa-template hop-tuan";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly templatesService: TemplatesService,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(
        `⚠️ Bạn chưa khởi tạo. Gõ \`${ctx.prefix}batdau\` trước.`,
      );
      return;
    }

    if (ctx.args.length === 0) {
      await ctx.reply(`⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\`.`);
      return;
    }

    const rawName = ctx.args[0];
    const ok = await this.templatesService.deleteByName(user.user_id, rawName);
    if (!ok) {
      await ctx.reply(
        `❌ Không tìm thấy template \`${rawName}\`. Xem: \`${ctx.prefix}ds-template\`.`,
      );
      return;
    }
    await ctx.reply(`🗑️ Đã xoá template \`${rawName.toLowerCase().trim()}\`.`);
  }
}
