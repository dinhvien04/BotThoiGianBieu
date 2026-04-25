import { randomUUID } from 'crypto';
import { Injectable, OnModuleInit } from '@nestjs/common';
import {
  ButtonBuilder,
  EButtonMessageStyle,
} from 'mezon-sdk';
import * as XLSX from 'xlsx';
import { BotService } from '../bot.service';
import { CommandRegistry } from './command-registry';
import { BotCommand, CommandContext } from './command.types';
import { InteractionRegistry } from '../interactions/interaction-registry';
import {
  ButtonInteractionContext,
  InteractionHandler,
} from '../interactions/interaction.types';
import { UsersService } from '../../users/users.service';
import { SchedulesService } from '../../schedules/schedules.service';
import { DateParser } from '../../shared/utils/date-parser';
import { ScheduleItemType } from '../../schedules/entities/schedule.entity';
import {
  findItemTypeOption,
  isValidItemType,
} from '../../schedules/schedules.constants';

const INTERACTION_ID = 'them-lich-excel';
const MAX_ROWS = 100;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const PENDING_TTL_MS = 10 * 60 * 1000;

interface ExcelAttachment {
  filename?: string;
  filetype?: string;
  size?: number;
  url?: string;
}

interface ParsedExcelRow {
  rowNumber: number;
  title: string;
  description: string | null;
  itemType: ScheduleItemType;
  startTime: Date;
  endTime: Date;
  remindMinutes: number | null;
}

interface RowError {
  rowNumber: number;
  message: string;
}

interface DateTimeCellResult {
  value: string;
  missing?: 'date' | 'time';
}

interface PendingImport {
  userId: string;
  channelId: string;
  createdAt: number;
  rows: ParsedExcelRow[];
}

@Injectable()
export class ThemLichExcelCommand implements BotCommand, InteractionHandler, OnModuleInit {
  readonly name = 'them-lich-excel';
  readonly aliases = ['import-lich-excel'];
  readonly description = 'Thêm nhiều lịch từ file Excel';
  readonly category = '✏️ QUẢN LÝ LỊCH';
  readonly syntax = 'them-lich-excel [url_file_xlsx]';
  readonly example = 'them-lich-excel';
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
        `⚠️ Bạn chưa khởi tạo tài khoản.\n` +
          `Vui lòng dùng lệnh \`${ctx.prefix}batdau\` trước khi import lịch.`,
      );
      return;
    }

    const source = this.resolveSource(ctx);
    if (!source) {
      await ctx.reply(this.formatUsage(ctx.prefix));
      return;
    }

    if (source.size && source.size > MAX_FILE_BYTES) {
      await ctx.reply(`❌ File quá lớn. Giới hạn hiện tại là 5MB.`);
      return;
    }

    const buffer = await this.downloadFile(source.url);
    const result = this.parseWorkbook(buffer, user.settings?.default_remind_minutes ?? 30);
    if (result.rows.length === 0) {
      await ctx.reply(this.formatPreview(result.rows, result.errors, null));
      return;
    }

    const token = randomUUID();
    this.cleanupPending();
    this.pending.set(token, {
      userId: ctx.message.sender_id,
      channelId: ctx.message.channel_id,
      createdAt: Date.now(),
      rows: result.rows,
    });

    const buttons = new ButtonBuilder()
      .addButton(`${INTERACTION_ID}:confirm:${token}`, '✅ Nhập lịch', EButtonMessageStyle.SUCCESS)
      .addButton(`${INTERACTION_ID}:cancel:${token}`, '❌ Hủy', EButtonMessageStyle.DANGER)
      .build();

    await this.botService.sendInteractive(
      ctx.message.channel_id,
      {
        title: '📥 PREVIEW IMPORT EXCEL',
        description: this.formatPreview(result.rows, result.errors, token),
      },
      buttons,
    );
  }

  async handleButton(ctx: ButtonInteractionContext): Promise<void> {
    const [actionType, token] = ctx.action.split(':');
    if (!token) return;

    const pending = this.pending.get(token);
    if (!pending) {
      await ctx.send(`⚠️ Phiên import đã hết hạn hoặc đã được xử lý. Vui lòng gửi lại \`*them-lich-excel\`.`);
      return;
    }

    if (pending.userId !== ctx.clickerId) {
      await ctx.ephemeralSend(`⚠️ Chỉ người tạo phiên import mới được bấm nút này.`);
      return;
    }

    if (actionType === 'cancel') {
      this.pending.delete(token);
      await this.closeForm(ctx);
      await ctx.send(`❌ Đã hủy import Excel.`);
      return;
    }

    if (actionType !== 'confirm') return;

    this.pending.delete(token);
    const user = await this.usersService.findByUserId(ctx.clickerId);
    const defaultRemindMinutes = user?.settings?.default_remind_minutes ?? 30;
    const createdIds: number[] = [];

    for (const row of pending.rows) {
      const remindMinutes = row.remindMinutes ?? defaultRemindMinutes;
      const idealRemindAt = new Date(row.startTime.getTime() - remindMinutes * 60 * 1000);
      const remindAt = idealRemindAt.getTime() > Date.now() ? idealRemindAt : new Date();
      const schedule = await this.schedulesService.create({
        user_id: pending.userId,
        item_type: row.itemType,
        title: row.title,
        description: row.description,
        start_time: row.startTime,
        end_time: row.endTime,
        remind_at: remindAt,
      });
      createdIds.push(schedule.id);
    }

    await this.closeForm(ctx);
    await ctx.send(
      `✅ ĐÃ IMPORT EXCEL THÀNH CÔNG!\n\n` +
        `📌 Số lịch đã thêm: \`${createdIds.length}\`\n` +
        `🆔 ID: ${createdIds.map((id) => `\`#${id}\``).join(', ')}`,
    );
  }

  private resolveSource(ctx: CommandContext): { url: string; size?: number } | null {
    const attachment = this.findExcelAttachment(ctx.message.attachments ?? []);
    if (attachment?.url) return { url: attachment.url, size: attachment.size };

    const rawUrl = ctx.rawArgs.trim();
    if (/^https?:\/\//i.test(rawUrl)) return { url: rawUrl };
    return null;
  }

  private findExcelAttachment(attachments: ExcelAttachment[]): ExcelAttachment | null {
    return attachments.find((a) => {
      const filename = a.filename?.toLowerCase() ?? '';
      const filetype = a.filetype?.toLowerCase() ?? '';
      return filename.endsWith('.xlsx') || filetype.includes('spreadsheet') || filetype.includes('excel');
    }) ?? null;
  }

  private async downloadFile(url: string): Promise<Buffer> {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Không tải được file Excel (${res.status}).`);
    }
    const contentLength = Number(res.headers.get('content-length') ?? 0);
    if (contentLength > MAX_FILE_BYTES) {
      throw new Error('File quá lớn. Giới hạn hiện tại là 5MB.');
    }
    const arrayBuffer = await res.arrayBuffer();
    if (arrayBuffer.byteLength > MAX_FILE_BYTES) {
      throw new Error('File quá lớn. Giới hạn hiện tại là 5MB.');
    }
    return Buffer.from(arrayBuffer);
  }

  private parseWorkbook(
    buffer: Buffer,
    defaultRemindMinutes: number,
  ): { rows: ParsedExcelRow[]; errors: RowError[] } {
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { rows: [], errors: [{ rowNumber: 0, message: 'File không có sheet nào.' }] };

    const sheet = workbook.Sheets[sheetName];
    const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
      defval: '',
      raw: false,
    });
    const rows: ParsedExcelRow[] = [];
    const errors: RowError[] = [];

    rawRows.slice(0, MAX_ROWS).forEach((raw, index) => {
      const rowNumber = index + 2;
      const parsed = this.parseRow(raw, rowNumber, defaultRemindMinutes);
      if ('message' in parsed) errors.push(parsed);
      else rows.push(parsed);
    });

    if (rawRows.length > MAX_ROWS) {
      errors.push({
        rowNumber: MAX_ROWS + 2,
        message: `File có ${rawRows.length} dòng, bot chỉ đọc ${MAX_ROWS} dòng đầu.`,
      });
    }

    return { rows, errors };
  }

  private parseRow(
    raw: Record<string, unknown>,
    rowNumber: number,
    defaultRemindMinutes: number,
  ): ParsedExcelRow | RowError {
    const row = this.normalizeRow(raw);
    const title = this.getCell(row, ['tieu_de', 'title', 'ten_lich', 'noi_dung']);
    if (!title) return { rowNumber, message: 'Thiếu tiêu đề.' };

    const itemTypeRaw = this.getCell(row, ['loai', 'item_type', 'type']) || 'task';
    const itemType = this.parseItemType(itemTypeRaw);
    if (!itemType) return { rowNumber, message: `Loại lịch không hợp lệ: ${itemTypeRaw}.` };

    const startInput = this.getDateTimeCell(row, {
      combinedKeys: ['bat_dau', 'start', 'start_at', 'start_datetime'],
      dateKeys: ['ngay_bat_dau', 'start_date', 'date_start'],
      timeKeys: ['gio_bat_dau', 'start_time', 'time_start'],
    });
    if (startInput.missing) {
      return {
        rowNumber,
        message: startInput.missing === 'date' ? 'Thiếu ngày bắt đầu.' : 'Thiếu giờ bắt đầu.',
      };
    }
    const startRaw = startInput.value;
    const startTime = this.dateParser.parseVietnamLocal(startRaw);
    if (!startTime)
      return {
        rowNumber,
        message: `Giờ bắt đầu không hợp lệ: ${startRaw || '(trống)'}.`,
      };
    if (startTime.getTime() <= Date.now()) {
      return { rowNumber, message: 'Giờ bắt đầu phải ở tương lai.' };
    }

    const endInput = this.getDateTimeCell(row, {
      combinedKeys: ['ket_thuc', 'end', 'end_at', 'end_datetime'],
      dateKeys: ['ngay_ket_thuc', 'end_date', 'date_end'],
      timeKeys: ['gio_ket_thuc', 'end_time', 'time_end'],
    });
    if (endInput.missing) {
      return {
        rowNumber,
        message: endInput.missing === 'date' ? 'Thiếu ngày kết thúc.' : 'Thiếu giờ kết thúc.',
      };
    }
    const endRaw = endInput.value;
    const endTime = this.dateParser.parseVietnamLocal(endRaw);
    if (!endTime)
      return {
        rowNumber,
        message: `Giờ kết thúc không hợp lệ: ${endRaw || '(trống)'}.`,
      };
    if (endTime.getTime() <= startTime.getTime()) {
      return { rowNumber, message: 'Giờ kết thúc phải sau giờ bắt đầu.' };
    }

    const remindRaw = this.getCell(row, ['nhac_truoc_phut', 'remind_minutes', 'nhac']);
    const remindMinutes = remindRaw ? Number(remindRaw) : defaultRemindMinutes;
    if (!Number.isInteger(remindMinutes) || remindMinutes < 0 || remindMinutes > 60 * 24 * 30) {
      return { rowNumber, message: `Số phút nhắc không hợp lệ: ${remindRaw}.` };
    }

    return {
      rowNumber,
      title,
      description: this.getCell(row, ['mo_ta', 'description', 'ghi_chu']) || null,
      itemType,
      startTime,
      endTime,
      remindMinutes: remindRaw ? remindMinutes : null,
    };
  }

  private normalizeRow(raw: Record<string, unknown>): Record<string, string> {
    const result: Record<string, string> = {};
    for (const [key, value] of Object.entries(raw)) {
      result[this.normalizeKey(key)] = String(value ?? '').trim();
    }
    return result;
  }

  private normalizeKey(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
  }

  private getCell(row: Record<string, string>, keys: string[]): string {
    for (const key of keys) {
      const value = row[this.normalizeKey(key)];
      if (value) return value;
    }
    return '';
  }

  private getDateTimeCell(
    row: Record<string, string>,
    options: {
      combinedKeys: string[];
      dateKeys: string[];
      timeKeys: string[];
    },
  ): DateTimeCellResult {
    const date = this.getCell(row, options.dateKeys);
    const time = this.getCell(row, options.timeKeys);

    if (date || time) {
      if (date && time) return { value: `${date} ${time}` };
      if (time && this.looksLikeDateTime(time)) return { value: time };
      return { value: date || time, missing: date ? 'time' : 'date' };
    }

    return { value: this.getCell(row, options.combinedKeys) };
  }

  private looksLikeDateTime(value: string): boolean {
    return (
      /^\d{4}-\d{1,2}-\d{1,2}[T ]\d{1,2}:\d{1,2}(?::\d{1,2})?$/.test(value) ||
      /^\d{1,2}[-/]\d{1,2}[-/]\d{4}\s+\d{1,2}:\d{1,2}$/.test(value)
    );
  }

  private parseItemType(raw: string): ScheduleItemType | null {
    const value = this.normalizeKey(raw);
    const aliases: Record<string, ScheduleItemType> = {
      task: 'task',
      cong_viec: 'task',
      viec: 'task',
      meeting: 'meeting',
      hop: 'meeting',
      event: 'event',
      su_kien: 'event',
      reminder: 'reminder',
      nhac: 'reminder',
      nhac_nho: 'reminder',
    };
    const mapped = aliases[value] ?? raw;
    return isValidItemType(mapped) ? mapped : null;
  }

  private formatPreview(rows: ParsedExcelRow[], errors: RowError[], token: string | null): string {
    const lines: string[] = [
      `Đọc được \`${rows.length + errors.length}\` dòng.`,
      `✅ Hợp lệ: \`${rows.length}\``,
      `⚠️ Lỗi/bỏ qua: \`${errors.length}\``,
    ];

    if (rows.length > 0) {
      lines.push('', 'Một vài dòng sẽ nhập:');
      for (const row of rows.slice(0, 5)) {
        const typeLabel = findItemTypeOption(row.itemType)?.label ?? row.itemType;
        lines.push(
          `• Dòng ${row.rowNumber}: ${row.title} | ${typeLabel} | ` +
            `${this.dateParser.formatVietnam(row.startTime)} - ${this.dateParser.formatVietnam(row.endTime)}`,
        );
      }
      if (rows.length > 5) lines.push(`• ... và ${rows.length - 5} dòng nữa`);
    }

    if (errors.length > 0) {
      lines.push('', 'Lỗi đầu tiên:');
      for (const error of errors.slice(0, 5)) {
        const prefix = error.rowNumber > 0 ? `Dòng ${error.rowNumber}` : 'File';
        lines.push(`• ${prefix}: ${error.message}`);
      }
      if (errors.length > 5) lines.push(`• ... và ${errors.length - 5} lỗi nữa`);
    }

    if (token && rows.length > 0) {
      lines.push('', `Bấm **Nhập lịch** để thêm ${rows.length} dòng hợp lệ. Các dòng lỗi sẽ bị bỏ qua.`);
    }

    return lines.join('\n');
  }

  private formatUsage(prefix: string): string {
    return (
      `⚠️ Gửi kèm file \`.xlsx\` rồi gõ \`${prefix}them-lich-excel\`, hoặc dùng:\n` +
      `\`${prefix}them-lich-excel <url_file_xlsx>\`\n\n` +
      `Cột hỗ trợ:\n` +
      `\`tieu_de | mo_ta | loai | ngay_bat_dau | gio_bat_dau | ngay_ket_thuc | gio_ket_thuc | nhac_truoc_phut\`\n\n` +
      `File cũ có \`bat_dau\` và \`ket_thuc\` dạng \`25/04/2026 09:00\` vẫn dùng được.\n` +
      `Loại lịch: \`task\`, \`meeting\`, \`event\`, \`reminder\`.`
    );
  }

  private cleanupPending(): void {
    const now = Date.now();
    for (const [token, pending] of this.pending) {
      if (now - pending.createdAt > PENDING_TTL_MS) {
        this.pending.delete(token);
      }
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
