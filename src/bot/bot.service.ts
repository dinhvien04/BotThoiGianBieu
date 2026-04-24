import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { IInteractiveMessageProps, MezonClient, TypeMessage } from "mezon-sdk";

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

  constructor(private readonly config: ConfigService) { }

  get client(): MezonClient {
    if (!this._client) {
      throw new Error(
        "MezonClient chưa được khởi tạo. Gọi initialize() trước.",
      );
    }
    return this._client;
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

    // timeout=30s (default 10s) — cần tăng vì Railway (US) → Mezon (VN) có latency cao
    this._client = new MezonClient({ botId, token, timeout: 30000 });
    await this._client.login();
    this.isReady = true;
    this.logger.log("✅ MezonClient đã đăng nhập thành công");
  }

  async sendMessage(channelId: string, text: string): Promise<void> {
    await this.withRetry(async () => {
      const channel = await this.client.channels.fetch(channelId);
      await channel.send({ t: text });
    });
  }

  /**
   * Reply (quote) tin nhắn gốc. Nếu không fetch được message (vd Mezon SDK
   * cache stale, channel trả về id=0, message đã bị xóa) → fallback sang
   * `sendMessage` để vẫn gửi được nội dung.
   */
  async replyToMessage(channelId: string, messageId: string, text: string): Promise<void> {
    try {
      const channel = await this.client.channels.fetch(channelId);
      const message = await channel.messages.fetch(messageId);
      await message.reply({ t: text });
    } catch (err) {
      this.logger.warn(
        `Reply fail, fallback sang sendMessage (channel=${channelId}, msg=${messageId}): ${(err as Error).message}`,
      );
      await this.sendMessage(channelId, text);
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
  ): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    await channel.send(
      {
        t: text,
        embed: [embed],
        components: [{ components }],
      },
      undefined, // mentions
      undefined, // attachments
      false, // mention_everyone
      false, // anonymous_message
      undefined, // topic_id
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
    if (this._client) {
      try {
        this._client.closeSocket();
      } catch (err) {
        this.logger.warn(`Lỗi khi đóng MezonClient: ${(err as Error).message}`);
      }
    }
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
}
