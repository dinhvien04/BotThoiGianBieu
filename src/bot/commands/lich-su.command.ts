import { Injectable, OnModuleInit } from "@nestjs/common";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";
import { UsersService } from "../../users/users.service";
import { SchedulesService } from "../../schedules/schedules.service";
import { AuditService } from "../../schedules/audit.service";
import {
  AuditAction,
  ScheduleAuditLog,
} from "../../schedules/entities/schedule-audit-log.entity";
import { DateParser } from "../../shared/utils/date-parser";

const PAGE_SIZE = 10;

const ACTION_LABEL: Record<AuditAction, string> = {
  create: "🆕 Tạo lịch",
  update: "✏️ Cập nhật",
  complete: "✅ Hoàn thành",
  cancel: "🚫 Huỷ",
  delete: "🗑️ Xoá",
  restore: "♻️ Khôi phục",
  "share-add": "👥 Thêm người chia sẻ",
  "share-remove": "👤 Bỏ chia sẻ",
  "tag-add": "🏷️ Gắn tag",
  "tag-remove": "🏷️ Gỡ tag",
};

const FIELD_LABEL: Record<string, string> = {
  title: "tiêu đề",
  description: "mô tả",
  start_time: "giờ bắt đầu",
  end_time: "giờ kết thúc",
  remind_at: "giờ nhắc",
  status: "trạng thái",
  priority: "ưu tiên",
  item_type: "loại",
  recurrence_type: "kiểu lặp",
  recurrence_interval: "khoảng lặp",
  recurrence_until: "lặp đến",
};

function isIsoDateString(v: unknown): boolean {
  return (
    typeof v === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v)
  );
}

function formatVal(
  raw: unknown,
  dateParser: DateParser,
  field: string,
): string {
  if (raw === null || raw === undefined) return "(trống)";
  if (raw instanceof Date) return dateParser.formatVietnam(raw);
  if (typeof raw === "string" && isIsoDateString(raw)) {
    const d = new Date(raw);
    if (!Number.isNaN(d.getTime())) return dateParser.formatVietnam(d);
  }
  if (
    field.endsWith("_time") ||
    field.endsWith("_at") ||
    field === "recurrence_until"
  ) {
    if (typeof raw === "string" || typeof raw === "number") {
      const d = new Date(raw);
      if (!Number.isNaN(d.getTime())) return dateParser.formatVietnam(d);
    }
  }
  if (typeof raw === "boolean") return raw ? "true" : "false";
  return String(raw);
}

function formatChanges(
  log: ScheduleAuditLog,
  dateParser: DateParser,
): string[] {
  if (!log.changes) return [];
  const lines: string[] = [];
  for (const [field, change] of Object.entries(log.changes)) {
    const label = FIELD_LABEL[field] ?? field;
    const from = formatVal(change.from, dateParser, field);
    const to = formatVal(change.to, dateParser, field);
    lines.push(`    • ${label}: \`${from}\` → \`${to}\``);
  }
  return lines;
}

@Injectable()
export class LichSuCommand implements BotCommand, OnModuleInit {
  readonly name = "lich-su";
  readonly aliases = ["lichsu", "history", "audit"];
  readonly description = "Xem lịch sử thay đổi của một lịch";
  readonly category = "📅 XEM LỊCH";
  readonly syntax = "lich-su <ID> [trang]";
  readonly example = "lich-su 12";

  constructor(
    private readonly registry: CommandRegistry,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly auditService: AuditService,
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

    if (ctx.args.length === 0) {
      await ctx.reply(
        `⚠️ Cú pháp: \`${ctx.prefix}${this.syntax}\`\n` +
          `Vd: \`${ctx.prefix}${this.example}\``,
      );
      return;
    }

    const id = Number(ctx.args[0]);
    if (!Number.isInteger(id) || id <= 0) {
      await ctx.reply(`⚠️ ID không hợp lệ: \`${ctx.args[0]}\`.`);
      return;
    }

    const schedule = await this.schedulesService.findById(id, user.user_id);
    if (!schedule) {
      await ctx.reply(`❌ Không tìm thấy lịch #${id} của bạn.`);
      return;
    }

    let page = 1;
    if (ctx.args.length >= 2) {
      const p = Number(ctx.args[1]);
      if (!Number.isInteger(p) || p <= 0) {
        await ctx.reply(`⚠️ Trang không hợp lệ: \`${ctx.args[1]}\`.`);
        return;
      }
      page = p;
    }

    const offset = (page - 1) * PAGE_SIZE;
    const { items, total } = await this.auditService.findBySchedule(
      id,
      PAGE_SIZE,
      offset,
    );

    if (total === 0) {
      await ctx.reply(
        `📜 Lịch #${id} (\`${schedule.title}\`) chưa có lịch sử thay đổi.\n` +
          `_Audit log chỉ ghi từ khi tính năng được bật — các lịch tạo trước đó sẽ không có dữ liệu._`,
      );
      return;
    }

    const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) {
      await ctx.reply(
        `⚠️ Trang ${page} vượt quá tổng số trang (${totalPages}).`,
      );
      return;
    }

    const lines = [
      `📜 **Lịch sử lịch #${id}** — \`${schedule.title}\``,
      `Tổng ${total} sự kiện · Trang ${page}/${totalPages}`,
      ``,
    ];

    for (const log of items) {
      lines.push(
        `**${ACTION_LABEL[log.action] ?? log.action}** · ${this.dateParser.formatVietnam(
          log.created_at,
        )}`,
      );
      const changeLines = formatChanges(log, this.dateParser);
      if (changeLines.length > 0) {
        lines.push(...changeLines);
      }
    }

    if (totalPages > 1) {
      lines.push("");
      const hint: string[] = [];
      if (page < totalPages)
        hint.push(`\`${ctx.prefix}lich-su ${id} ${page + 1}\` →`);
      if (page > 1) hint.push(`← \`${ctx.prefix}lich-su ${id} ${page - 1}\``);
      lines.push(hint.join(" · "));
    }

    await ctx.reply(lines.join("\n"));
  }
}
