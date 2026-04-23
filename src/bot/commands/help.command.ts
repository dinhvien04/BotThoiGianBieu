import { Injectable, OnModuleInit } from '@nestjs/common';
import { MessageFormatter, HelpRenderEntry } from '../../shared/utils/message-formatter';
import { CommandRegistry } from './command-registry';
import { BotCommand, CommandContext } from './command.types';
import { CATEGORY_ORDER, COMMAND_CATALOG } from './command-catalog';

@Injectable()
export class HelpCommand implements BotCommand, OnModuleInit {
  readonly name = 'help';
  readonly aliases = ['huong-dan', 'trogiup'];
  readonly description = 'Xem hướng dẫn';
  readonly category = '❓ Hỗ trợ';
  readonly syntax = 'help';

  constructor(
    private readonly registry: CommandRegistry,
    private readonly formatter: MessageFormatter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const entries: HelpRenderEntry[] = COMMAND_CATALOG.map((c) => ({
      syntax: c.syntax,
      description: c.description,
      category: c.category,
      implemented: this.registry.resolve(c.name) !== undefined,
    }));

    const message = this.formatter.formatHelp(entries, CATEGORY_ORDER, ctx.prefix);
    await ctx.reply(message);
  }
}
