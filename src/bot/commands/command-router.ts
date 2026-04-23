import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BotService } from '../bot.service';
import { CommandRegistry } from './command-registry';
import { CommandContext, MezonChannelMessage } from './command.types';

@Injectable()
export class CommandRouter {
  private readonly logger = new Logger(CommandRouter.name);
  private readonly prefix: string;

  constructor(
    private readonly botService: BotService,
    private readonly config: ConfigService,
    private readonly registry: CommandRegistry,
  ) {
    this.prefix = this.config.get<string>('BOT_PREFIX', '*');
  }

  getPrefix(): string {
    return this.prefix;
  }

  async handle(message: MezonChannelMessage): Promise<void> {
    const text = message.content?.t?.trim();
    if (!text || !text.startsWith(this.prefix)) {
      return;
    }

    const withoutPrefix = text.slice(this.prefix.length).trim();
    if (!withoutPrefix) {
      return;
    }

    const [head, ...rest] = withoutPrefix.split(/\s+/);
    const command = this.registry.resolve(head);
    if (!command) {
      return;
    }

    const rawArgs = withoutPrefix.slice(head.length).trim();
    const ctx = this.buildContext(message, rest, rawArgs);

    try {
      this.logger.debug(`▶ ${command.name} từ ${message.sender_id}`);
      await command.execute(ctx);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      this.logger.error(
        `Lỗi khi xử lý lệnh "${command.name}": ${errorMessage}`,
        err instanceof Error ? err.stack : undefined,
      );
      try {
        await ctx.reply(`❌ Có lỗi xảy ra: ${errorMessage}`);
      } catch (replyErr) {
        this.logger.error(`Không thể gửi message lỗi: ${(replyErr as Error).message}`);
      }
    }
  }

  private buildContext(message: MezonChannelMessage, args: string[], rawArgs: string): CommandContext {
    return {
      message,
      args,
      rawArgs,
      prefix: this.prefix,
      reply: (text) => this.botService.replyToMessage(message.channel_id, message.message_id, text),
      send: (text) => this.botService.sendMessage(message.channel_id, text),
      sendDM: (text) => this.botService.sendDirectMessage(message.sender_id, text),
    };
  }
}
