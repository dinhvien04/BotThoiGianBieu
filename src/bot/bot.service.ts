import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiMessageMention,
  IInteractiveMessageProps,
  MezonClient,
  TypeMessage,
} from "mezon-sdk";
import { DefaultSocket } from "mezon-sdk/dist/cjs/socket";

export interface ChannelSendTarget {
  channelId: string;
  clanId?: string;
  mode?: number;
  isPublic?: boolean;
  topicId?: string;
  replyTo?: {
    messageId: string;
    senderId: string;
    username?: string;
    displayName?: string;
    clanNick?: string;
    avatar?: string;
    clanAvatar?: string;
    content?: unknown;
  };
}

/**
 * Wrapper mỏng quanh `MezonClient`:
 * - Khởi tạo & login
 * - Cung cấp các helper gửi message / reply / DM
 * - Expose `client` để `BotGateway` đăng ký event listener
 */
@Injectable()
export class BotService implements OnModuleDestroy {
  private readonly logger = new Logger(BotService.name);
  private _client: MezonClient | null = null;
  private isReady = false;

  constructor(private readonly config: ConfigService) {}

  get client(): MezonClient {
    if (!this._client) {
      throw new Error(
        "MezonClient chưa được khởi tạo. Gọi initialize() trước.",
      );
    }
    return this._client;
  }

  isConnected(): boolean {
    return this.isReady && this._client !== null;
  }

  async initialize(): Promise<void> {
    if (this.isReady) {
      return;
    }

    const token = this.config.get<string>("APPLICATION_TOKEN");
    const botId = this.config.get<string>("APPLICATION_ID");
    if (!token) {
      throw new Error("Thiếu biến môi trường APPLICATION_TOKEN");
    }
    if (!botId) {
      throw new Error("Thiếu biến môi trường APPLICATION_ID (Bot ID)");
    }

    this.closeClient(this._client);
    this._client = null;
    this.isReady = false;

    const timeout = this.resolveTimeoutMs();
    this.configureSocketTimeout();
    const client = new MezonClient({ botId, token, timeout });

    try {
      await client.login();
      this._client = client;
      this.isReady = true;
      this.logger.log("✅ MezonClient đã đăng nhập thành công");
    } catch (err) {
      this.closeClient(client);
      throw err;
    }
  }

  async sendMessage(channel: string | ChannelSendTarget, text: string): Promise<void> {
    const target = this.normalizeTarget(channel);
    await this.withRetry(async () => {
      if (this.canSendDirect(target)) {
        await this.sendSocketMessage(target, text);
        return;
      }

      const fetchedChannel = await this.client.channels.fetch(target.channelId);
      await fetchedChannel.send({ t: text });
    });
  }

  /**
   * Reply (quote) tin nhắn gốc. Nếu không fetch được message (vd Mezon SDK
   * cache stale, channel trả về id=0, message đã bị xóa) → fallback sang
   * `sendMessage` để vẫn gửi được nội dung.
   */
  async replyToMessage(
    channelId: string,
    messageId: string,
    text: string,
    target?: ChannelSendTarget,
  ): Promise<void> {
    const sendTarget = target
      ? {
          ...target,
          channelId,
        }
      : undefined;

    if (sendTarget && this.canSendDirect(sendTarget)) {
      await this.withRetry(() => this.sendSocketMessage(sendTarget, text));
      return;
    }

    try {
      const channel = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      await message.reply({ t: text });
    } catch (err) {
      this.logger.warn(
        `Reply fail, fallback sang sendMessage (channel=${channelId}, msg=${messageId}): ${(err as Error).message}`,
      );
      await this.sendMessage(target ?? channelId, text);
    }
  }

  async deleteMessage(channelId: string, messageId: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId);
    await message.delete();
  }

  async sendDirectMessage(userId: string, text: string): Promise<void> {
    const user = await this.client.users.fetch(userId);
    await user.sendDM({ t: text });
  }

  // ================== EPHEMERAL ==================

  async sendEphemeral(channelId: string, receiverId: string, text: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    await channel.sendEphemeral(receiverId, { t: text });
  }

  async sendEphemeralInteractive(
    channelId: string,
    receiverId: string,
    embed: IInteractiveMessageProps,
    components: unknown[],
    text?: string,
  ): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    await channel.sendEphemeral(receiverId, {
      t: text,
      embed: [embed],
      components: [{ components }],
    });
  }

  async deleteEphemeralMessage(
    channelId: string,
    receiverId: string,
    messageId: string,
  ): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    await channel.deleteEphemeral(receiverId, messageId);
  }

  /**
   * Gửi message có embed interactive + các button (action row).
   * `components` là mảng các button do `ButtonBuilder.build()` trả về;
   * sẽ tự wrap vào 1 action row.
   */
  async sendInteractive(
    channelId: string,
    embed: IInteractiveMessageProps,
    components: unknown[],
    text?: string,
  ): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    await channel.send({
      t: text,
      embed: [embed],
      components: [{ components }],
    });
  }

  /**
   * Gửi message kiểu BUZZ (rung/notify mạnh) kèm embed + button.
   * Dùng cho reminder: `code = TypeMessage.MessageBuzz (8)`.
   */
  async sendBuzzInteractive(
    channelId: string,
    embed: IInteractiveMessageProps,
    components: unknown[],
    text?: string,
    mentions?: ApiMessageMention[],
  ): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    await channel.send(
      {
        t: text,
        embed: [embed],
        components: [{ components }],
      },
      mentions,
      undefined,
      false,
      false,
      undefined,
      TypeMessage.MessageBuzz,
    );
  }

  /** Gửi DM tới user có embed + button (dùng khi user bật notify_via_dm). */
  async sendDmInteractive(
    userId: string,
    embed: IInteractiveMessageProps,
    components: unknown[],
    text?: string,
    buzz = false,
  ): Promise<void> {
    const user = await this.client.users.fetch(userId);
    await user.sendDM(
      {
        t: text,
        embed: [embed],
        components: [{ components }],
      },
      buzz ? TypeMessage.MessageBuzz : undefined,
    );
  }

  onModuleDestroy(): void {
    this.closeClient(this._client);
    this._client = null;
    this.isReady = false;
  }

  /**
   * Retry tối đa `maxRetries` lần với delay tăng dần.
   * Dùng cho các API call qua Mezon SDK dễ bị timeout khi Railway ↔ Mezon.
   */
  private async withRetry<T>(
    fn: () => Promise<T>,
    maxRetries = 2,
    delayMs = 1000,
  ): Promise<T> {
    let lastErr: unknown;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (err) {
        lastErr = err;
        if (attempt < maxRetries) {
          const wait = delayMs * (attempt + 1);
          this.logger.warn(
            `Attempt ${attempt + 1} fail, retry sau ${wait}ms: ${err instanceof Error ? err.message : String(err)}`,
          );
          await new Promise((r) => setTimeout(r, wait));
        }
      }
    }
    throw lastErr;
  }

  private normalizeTarget(channel: string | ChannelSendTarget): ChannelSendTarget {
    return typeof channel === "string" ? { channelId: channel } : channel;
  }

  private canSendDirect(
    target: ChannelSendTarget,
  ): target is ChannelSendTarget & { clanId: string; mode: number; isPublic: boolean } {
    return (
      Boolean(target.clanId) &&
      typeof target.mode === "number" &&
      typeof target.isPublic === "boolean"
    );
  }

  private async sendSocketMessage(
    target: ChannelSendTarget & { clanId: string; mode: number; isPublic: boolean },
    text: string,
  ): Promise<void> {
    const socketManager = (this.client as unknown as {
      socketManager?: {
        writeChatMessage(data: unknown): Promise<unknown>;
      };
    }).socketManager;

    if (!socketManager) {
      throw new Error("Mezon socket manager chưa sẵn sàng.");
    }

    await socketManager.writeChatMessage({
      clan_id: target.clanId,
      channel_id: target.channelId,
      mode: target.mode,
      is_public: target.isPublic,
      content: { t: text },
      mentions: [],
      attachments: [],
      references: target.replyTo ? [this.buildReplyReference(target.replyTo)] : [],
      topic_id: target.topicId,
    });
  }

  private buildReplyReference(
    replyTo: NonNullable<ChannelSendTarget["replyTo"]>,
  ): Record<string, unknown> {
    return {
      message_id: "0",
      message_ref_id: replyTo.messageId,
      ref_type: 0,
      message_sender_id: replyTo.senderId,
      message_sender_username: replyTo.username,
      message_sender_avatar: replyTo.avatar,
      message_sender_clan_nick: replyTo.clanNick,
      message_sender_display_name: replyTo.displayName,
      content: JSON.stringify(replyTo.content ?? {}),
      has_attachment: false,
    };
  }

  private resolveTimeoutMs(): number {
    const raw = this.config.get<string>("MEZON_TIMEOUT_MS");
    const parsed = raw ? Number(raw) : 30000;
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 30000;
  }

  private configureSocketTimeout(): void {
    const raw = this.config.get<string>("MEZON_SOCKET_TIMEOUT_MS");
    const parsed = raw ? Number(raw) : 20000;
    const timeout = Number.isFinite(parsed) && parsed > 0 ? parsed : 20000;
    const socketDefaults = DefaultSocket as unknown as {
      DefaultSendTimeoutMs: number;
      DefaultHeartbeatTimeoutMs: number;
    };

    socketDefaults.DefaultSendTimeoutMs = timeout;
    socketDefaults.DefaultHeartbeatTimeoutMs = timeout;
  }

  private closeClient(client: MezonClient | null): void {
    if (!client) return;
    try {
      client.closeSocket();
    } catch (err) {
      this.logger.warn(`Lỗi khi đóng MezonClient: ${(err as Error).message}`);
    }
  }
}
