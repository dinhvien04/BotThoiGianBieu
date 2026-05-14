/**
 * Payload tối thiểu mà Mezon SDK trả về trong sự kiện `onChannelMessage`.
 * Chỉ khai báo các field bot dùng; tránh phụ thuộc kiểu chính xác của SDK.
 */
export interface MezonChannelMessage {
  message_id: string;
  channel_id: string;
  clan_id?: string;
  mode?: number;
  is_public?: boolean;
  topic_id?: string;
  sender_id: string;
  username?: string;
  display_name?: string;
  clan_nick?: string;
  avatar?: string;
  clan_avatar?: string;
  content?: { t?: string };
  attachments?: Array<{
    filename?: string;
    filetype?: string;
    size?: number;
    url?: string;
  }>;
}

export interface CommandContext {
  message: MezonChannelMessage;
  /** Toàn bộ raw text sau khi đã bỏ prefix + tên lệnh (đã trim). */
  rawArgs: string;
  /** Raw text được tách theo whitespace. */
  args: string[];
  /** Prefix bot đang dùng (vd: "*"). */
  prefix: string;
  /** Trả lời (reply) trong channel hiện tại — có quote tin nhắn gốc. */
  reply(text: string): Promise<void>;
  /** Gửi message mới vào channel hiện tại (không quote). */
  send(text: string): Promise<void>;
  /** Gửi DM tới sender. */
  sendDM(text: string): Promise<void>;
  /** Gửi ephemeral — chỉ sender thấy, người khác trong channel không thấy. */
  ephemeralReply(text: string): Promise<void>;
}

export interface BotCommand {
  /** Tên chính, không kèm prefix. Vd: "bat-dau". */
  readonly name: string;
  /** Tên thay thế (alias) — không kèm prefix. */
  readonly aliases?: string[];
  /** Mô tả ngắn (1 dòng). */
  readonly description: string;
  /** Nhóm hiển thị trong help. */
  readonly category: string;
  /** Cú pháp đầy đủ (không kèm prefix). Vd: "nhac <ID> <số_phút>". */
  readonly syntax: string;
  /** Ví dụ sử dụng (không kèm prefix). Optional. */
  readonly example?: string;
  /** Có ẩn khỏi `*help` không. */
  readonly hidden?: boolean;

  execute(ctx: CommandContext): Promise<void>;
}
