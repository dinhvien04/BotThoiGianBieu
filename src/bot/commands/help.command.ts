import { Injectable, OnModuleInit } from '@nestjs/common';
import { MessageFormatter, CommandHelpEntry } from '../../shared/utils/message-formatter';
import { CommandRegistry } from './command-registry';
import { BotCommand, CommandContext } from './command.types';

@Injectable()
export class HelpCommand implements BotCommand, OnModuleInit {
  readonly name = 'help';
  readonly aliases = ['huong-dan', 'trogiup'];
  readonly description = 'Xem hướng dẫn sử dụng bot';
  readonly category = '❓ Hỗ trợ';
  readonly syntax = 'help';
  readonly example = 'help';

  constructor(
    private readonly registry: CommandRegistry,
    private readonly formatter: MessageFormatter,
  ) {}

  onModuleInit(): void {
    this.registry.register(this);
  }

  async execute(ctx: CommandContext): Promise<void> {
    const commands = this.registry
      .getAll()
      .filter((c) => !c.hidden)
      .sort((a, b) => a.category.localeCompare(b.category, 'vi'));

    const entries: CommandHelpEntry[] = commands.map((c) => ({
      name: c.name,
      syntax: c.syntax,
      description: c.description,
      category: c.category,
      example: c.example,
    }));

    const message = this.formatter.formatHelp(entries, ctx.prefix);
    await ctx.reply(message);
  }
}
