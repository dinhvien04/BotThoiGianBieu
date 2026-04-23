import { Injectable, Logger } from '@nestjs/common';
import { BotService } from '../bot.service';
import { InteractionRegistry } from './interaction-registry';
import { ButtonInteractionContext, MezonButtonClickEvent } from './interaction.types';

/** TTL (ms) để dedupe trùng click — tránh SDK dispatch event nhiều lần. */
const DEDUPE_TTL_MS = 30 * 1000;

@Injectable()
export class InteractionRouter {
  private readonly logger = new Logger(InteractionRouter.name);

  /** Key = `${message_id}:${button_id}:${sender_id}` → timestamp đã xử lý. */
  private readonly processedClicks = new Map<string, number>();

  constructor(
    private readonly botService: BotService,
    private readonly registry: InteractionRegistry,
  ) {}

  async handleButton(event: MezonButtonClickEvent): Promise<void> {
    // Dedupe — dùng user_id (người click) để tránh nhầm với sender_id (bot)
    const clickKey = `${event.message_id}:${event.button_id}:${event.user_id}`;
    const now = Date.now();
    this.cleanupExpired(now);
    if (this.processedClicks.has(clickKey)) {
      this.logger.debug(`Bỏ qua click trùng: ${clickKey}`);
      return;
    }
    this.processedClicks.set(clickKey, now);

    const match = this.registry.resolve(event.button_id);
    if (!match) {
      this.logger.debug(`Không có handler cho button_id="${event.button_id}"`);
      return;
    }

    const formData = this.parseExtraData(event.extra_data);
    const ctx: ButtonInteractionContext = {
      event,
      action: match.action,
      clickerId: event.user_id,
      channelId: event.channel_id,
      formData,
      send: (text) => this.botService.sendMessage(event.channel_id, text),
      reply: (text) => this.botService.replyToMessage(event.channel_id, event.message_id, text),
      deleteForm: () => this.botService.deleteMessage(event.channel_id, event.message_id),
    };

    try {
      this.logger.debug(`▶ ${event.button_id} từ user ${event.user_id}`);
      await match.handler.handleButton(ctx);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Lỗi xử lý button "${event.button_id}": ${msg}`,
        err instanceof Error ? err.stack : undefined,
      );
      try {
        await ctx.send(`❌ Có lỗi xảy ra: ${msg}`);
      } catch (replyErr) {
        this.logger.error(`Không thể gửi message lỗi: ${(replyErr as Error).message}`);
      }
    }
  }

  private parseExtraData(raw: string | undefined): Record<string, string> {
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        const result: Record<string, string> = {};
        for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
          result[k] = v == null ? '' : String(v);
        }
        return result;
      }
    } catch (err) {
      this.logger.warn(`Không parse được extra_data: ${(err as Error).message}`);
    }
    return {};
  }

  private cleanupExpired(now: number): void {
    for (const [key, ts] of this.processedClicks) {
      if (now - ts > DEDUPE_TTL_MS) {
        this.processedClicks.delete(key);
      }
    }
  }
}
