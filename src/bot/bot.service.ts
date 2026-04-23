import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MezonClient } from 'mezon-sdk';

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
      throw new Error('MezonClient chưa được khởi tạo. Gọi initialize() trước.');
    }
    return this._client;
  }

  async initialize(): Promise<void> {
    if (this.isReady) {
      return;
    }

    const token = this.config.get<string>('APPLICATION_TOKEN');
    const botId = this.config.get<string>('APPLICATION_ID');
    if (!token) {
      throw new Error('Thiếu biến môi trường APPLICATION_TOKEN');
    }
    if (!botId) {
      throw new Error('Thiếu biến môi trường APPLICATION_ID (Bot ID)');
    }

    this._client = new MezonClient({ botId, token });
    await this._client.login();
    this.isReady = true;
    this.logger.log('✅ MezonClient đã đăng nhập thành công');
  }

  async sendMessage(channelId: string, text: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    await channel.send({ t: text });
  }

  async replyToMessage(channelId: string, messageId: string, text: string): Promise<void> {
    const channel = await this.client.channels.fetch(channelId);
    const message = await channel.messages.fetch(messageId);
    await message.reply({ t: text });
  }

  async sendDirectMessage(userId: string, text: string): Promise<void> {
    const user = await this.client.users.fetch(userId);
    await user.sendDM({ t: text });
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
}
