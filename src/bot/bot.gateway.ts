import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { BotService } from './bot.service';
import { CommandRouter } from './commands/command-router';
import { MezonChannelMessage } from './commands/command.types';

@Injectable()
export class BotGateway implements OnModuleInit {
  private readonly logger = new Logger(BotGateway.name);

  constructor(
    private readonly botService: BotService,
    private readonly commandRouter: CommandRouter,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.botService.initialize();

    this.botService.client.onChannelMessage(async (event: unknown) => {
      const message = event as MezonChannelMessage;
      // Bot không phản hồi chính message của nó (tránh vòng lặp). Nếu SDK có self-flag ta có thể check ở đây.
      try {
        await this.commandRouter.handle(message);
      } catch (err) {
        this.logger.error(`Lỗi không bắt được khi xử lý message: ${(err as Error).message}`);
      }
    });

    this.logger.log(`🎧 Bot đang lắng nghe lệnh (prefix: "${this.commandRouter.getPrefix()}")`);
  }
}
