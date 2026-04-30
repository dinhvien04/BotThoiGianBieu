import { randomUUID } from "crypto";
import { Injectable, OnModuleInit, Logger } from "@nestjs/common";
import { ButtonBuilder, EButtonMessageStyle } from "mezon-sdk";
import { BotService } from "../bot.service";
import { CommandRegistry } from "./command-registry";
import { BotCommand, CommandContext } from "./command.types";
import { InteractionRegistry } from "../interactions/interaction-registry";
import {
  ButtonInteractionContext,
  InteractionHandler,
} from "../interactions/interaction.types";
import { UsersService } from "../../users/users.service";
import { SchedulesService } from "../../schedules/schedules.service";
import { DateParser } from "../../shared/utils/date-parser";
import { parseIcs, IcsEvent } from "../../shared/utils/ics-parser";

const INTERACTION_ID = "import-ics";
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_EVENTS = 100;
const PENDING_TTL_MS = 10 * 60 * 1000;

interface IcsAttachment {
  filename?: string;
  filetype?: string;
  size?: number;
  url?: string;
}

interface PendingImport {
  userId: string;
  channelId: string;
  createdAt: number;
  events: IcsEvent[];
  truncated: boolean;
}

@Injectable()
export class ImportIcsCommand
  implements BotCommand, InteractionHandler, OnModuleInit
{
  private readonly logger = new Logger(ImportIcsCommand.name);
  readonly name = "import-ics";
  readonly aliases = ["importics", "ics-import"];
  readonly description = "Nhập lịch từ file .ics (Google/Apple Calendar)";
  readonly category = "✏️ QUẢN LÝ LỊCH";
  readonly syntax = "import-ics [url_file_ics]";
  readonly example = "import-ics";
  readonly interactionId = INTERACTION_ID;

  private readonly pending = new Map<string, PendingImport>();

  constructor(
    private readonly commandRegistry: CommandRegistry,
    private readonly interactionRegistry: InteractionRegistry,
    private readonly botService: BotService,
    private readonly usersService: UsersService,
    private readonly schedulesService: SchedulesService,
    private readonly dateParser: DateParser,
  ) {}

  onModuleInit(): void {
    this.commandRegistry.register(this);
    this.interactionRegistry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const user = await this.usersService.findByUserId(ctx.message.sender_id);
    if (!user) {
      await ctx.reply(
        `⚠️ Bạn chưa khởi tạo. Gõ \`${ctx.prefix}batdau\` trước khi import lịch.`,
      );
      return;
    }

    const source = this.resolveSource(ctx);
    if (!source) {
      await ctx.reply(this.formatUsage(ctx.prefix));
      return;
    }

    if (source.size && source.size > MAX_FILE_BYTES) {
      await ctx.reply(`❌ File quá lớn. Giới hạn 5MB.`);
      return;
    }

    let text: string;
    try {
      text = await this.downloadText(source.url);
    } catch (err) {
      await ctx.reply(
        `❌ Không tải được file .ics: ${err instanceof Error ? err.message : "lỗi không xác định"}.`,
      );
      return;
    }

    const result = parseIcs(text);
    if (result.events.length === 0) {
      const errLines =
        result.errors.length > 0
          ? "\n\n" +
            result.errors
              .slice(0, 5)
              .map((e) => `• Sự kiện #${e.index}: ${e.message}`)
              .join("\n")
          : "";
      await ctx.reply(
        `⚠️ File .ics không có VEVENT hợp lệ nào để nhập.${errLines}`,
      );
      return;
    }

    const truncated = result.events.length > MAX_EVENTS;
    const events = truncated
      ? result.events.slice(0, MAX_EVENTS)
      : result.events;

    const token = randomUUID();
    this.cleanupPending();
    this.pending.set(token, {
      userId: ctx.message.sender_id,
      channelId: ctx.message.channel_id,
      createdAt: Date.now(),
      events,
      truncated,
    });

    const buttons = new ButtonBuilder()
      .addButton(
        `${INTERACTION_ID}:confirm:${token}`,
        "✅ Nhập lịch",
        EButtonMessageStyle.SUCCESS,
      )
      .addButton(
        `${INTERACTION_ID}:cancel:${token}`,
        "❌ Hủy",
        EButtonMessageStyle.DANGER,
      )
      .build();

    await this.botService.sendInteractive(
      ctx.message.channel_id,
      {
        title: "📥 PREVIEW IMPORT .ICS",
        description: this.formatPreview(events, result.errors, truncated),
      },
      buttons,
    );
  }

  async handleButton(ctx: ButtonInteractionContext): Promise<void> {
    const [actionType, token] = ctx.action.split(":");
    if (!token) return;

    const pending = this.pending.get(token);
    if (!pending) {
      await ctx.send(
        `⚠️ Phiên import đã hết hạn hoặc đã được xử lý. Gõ \`*import-ics\` lại.`,
      );
      return;
    }

    if (pending.userId !== ctx.clickerId) {
      await ctx.ephemeralSend(
        `⚠️ Chỉ người tạo phiên import mới được bấm nút này.`,
      );
      return;
    }

    if (actionType === "cancel") {
      this.pending.delete(token);
      await this.closeForm(ctx);
      await ctx.send(`❌ Đã hủy import .ics.`);
      return;
    }

    if (actionType !== "confirm") return;

    this.pending.delete(token);
    const user = await this.usersService.findByUserId(ctx.clickerId);
    const defaultRemindMinutes = user?.settings?.default_remind_minutes ?? 30;
    const now = new Date();
    const createdIds: number[] = [];

    for (const ev of pending.events) {
      const idealRemindAt = new Date(
        ev.start.getTime() - defaultRemindMinutes * 60 * 1000,
      );
      const remindAt = idealRemindAt.getTime() > now.getTime() ? idealRemindAt : null;
      const schedule = await this.schedulesService.create({
        user_id: pending.userId,
        item_type: "event",
        title: ev.summary,
        description: ev.description,
        start_time: ev.start,
        end_time: ev.end,
        remind_at: remindAt,
        recurrence_type: ev.recurrence?.type ?? "none",
        recurrence_interval: ev.recurrence?.interval ?? 1,
        recurrence_until: ev.recurrence?.until ?? null,
      });
      createdIds.push(schedule.id);
    }

    await this.closeForm(ctx);
    await ctx.send(
      `✅ ĐÃ IMPORT .ICS THÀNH CÔNG!\n\n` +
        `📌 Số lịch đã thêm: \`${createdIds.length}\`\n` +
        `🆔 ID: ${createdIds.map((id) => `\`#${id}\``).join(", ")}`,
    );
  }

  private resolveSource(
    ctx: CommandContext,
  ): { url: string; size?: number } | null {
    const attachment = this.findIcsAttachment(
      (ctx.message as { attachments?: IcsAttachment[] }).attachments ?? [],
    );
    if (attachment?.url) return { url: attachment.url, size: attachment.size };

    const rawUrl = ctx.rawArgs.trim();
    if (/^https?:\/\//i.test(rawUrl)) return { url: rawUrl };
    return null;
  }

  private findIcsAttachment(
    attachments: IcsAttachment[],
  ): IcsAttachment | null {
    return (
      attachments.find((a) => {
        const filename = a.filename?.toLowerCase() ?? "";
        const filetype = a.filetype?.toLowerCase() ?? "";
        return (
          filename.endsWith(".ics") ||
          filetype.includes("calendar") ||
          filetype === "text/calendar"
        );
      }) ?? null
    );
  }

  private async downloadText(url: string): Promise<string> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    const contentLength = Number(res.headers.get("content-length") ?? 0);
    if (contentLength > MAX_FILE_BYTES) {
      throw new Error("File quá lớn (>5MB)");
    }
    const buf = await res.arrayBuffer();
    if (buf.byteLength > MAX_FILE_BYTES) {
      throw new Error("File quá lớn (>5MB)");
    }
    return Buffer.from(buf).toString("utf-8");
  }

  private formatUsage(prefix: string): string {
    return [
      `📥 **Import file .ics**`,
      ``,
      `Cách dùng:`,
      `1. Đính kèm file \`.ics\` (xuất từ Google/Apple Calendar) vào message và gõ \`${prefix}import-ics\`.`,
      `2. Hoặc cung cấp URL trực tiếp: \`${prefix}import-ics https://...\`.`,
      ``,
      `Bot sẽ parse file, hiển thị preview và xác nhận trước khi tạo lịch.`,
      `Mỗi VEVENT trong file → 1 schedule loại \`event\`. Tối đa ${MAX_EVENTS} sự kiện/lần.`,
    ].join("\n");
  }

  private formatPreview(
    events: IcsEvent[],
    errors: { index: number; message: string }[],
    truncated: boolean,
  ): string {
    const lines: string[] = [];
    lines.push(`Sẽ nhập **${events.length}** sự kiện:`);
    if (truncated) {
      lines.push(
        `_⚠️ File có nhiều hơn ${MAX_EVENTS} sự kiện — chỉ nhập ${MAX_EVENTS} sự kiện đầu tiên._`,
      );
    }
    lines.push("");

    const preview = events.slice(0, 10);
    for (const ev of preview) {
      const startTxt = ev.allDay
        ? this.dateParser.formatVietnamDate(ev.start) + " (cả ngày)"
        : this.dateParser.formatVietnam(ev.start);
      const endTxt = ev.end
        ? ev.allDay
          ? ""
          : ` → ${this.dateParser.formatVietnam(ev.end)}`
        : "";
      lines.push(`#${ev.index}. **${ev.summary}**`);
      lines.push(`  ⏰ ${startTxt}${endTxt}`);
      if (ev.recurrence) {
        lines.push(`  🔁 ${this.formatRecurrence(ev.recurrence)}`);
      }
      if (ev.description) {
        const short =
          ev.description.length > 80
            ? ev.description.slice(0, 80) + "…"
            : ev.description;
        lines.push(`  📝 ${short}`);
      }
    }
    if (events.length > preview.length) {
      lines.push(`_…và ${events.length - preview.length} sự kiện nữa._`);
    }

    const warnEvents = events.filter((e) => e.warnings.length > 0);
    if (warnEvents.length > 0) {
      lines.push("");
      lines.push(`ℹ️ ${warnEvents.length} sự kiện có cảnh báo RRULE:`);
      for (const ev of warnEvents.slice(0, 5)) {
        lines.push(`  • #${ev.index}: ${ev.warnings.join("; ")}`);
      }
      if (warnEvents.length > 5) {
        lines.push(`  • …và ${warnEvents.length - 5} sự kiện nữa.`);
      }
    }

    if (errors.length > 0) {
      lines.push("");
      lines.push(`⚠️ ${errors.length} sự kiện bị bỏ qua:`);
      for (const e of errors.slice(0, 5)) {
        lines.push(`  • Sự kiện #${e.index}: ${e.message}`);
      }
      if (errors.length > 5) {
        lines.push(`  • …và ${errors.length - 5} lỗi nữa.`);
      }
    }

    return lines.join("\n");
  }

  private formatRecurrence(r: {
    type: "daily" | "weekly" | "monthly";
    interval: number;
    until: Date | null;
  }): string {
    const label =
      r.type === "daily" ? "ngày" : r.type === "weekly" ? "tuần" : "tháng";
    const head =
      r.interval === 1 ? `Lặp mỗi ${label}` : `Lặp mỗi ${r.interval} ${label}`;
    if (r.until) {
      return `${head} đến ${this.dateParser.formatVietnamDate(r.until)}`;
    }
    return head;
  }

  private cleanupPending(): void {
    const now = Date.now();
    for (const [k, v] of this.pending.entries()) {
      if (now - v.createdAt > PENDING_TTL_MS) this.pending.delete(k);
    }
  }

  private async closeForm(ctx: ButtonInteractionContext): Promise<void> {
    try {
      await ctx.deleteForm();
    } catch {
      // best-effort
    }
  }
}
