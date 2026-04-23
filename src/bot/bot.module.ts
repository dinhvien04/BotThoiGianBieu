import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { UsersModule } from '../users/users.module';
import { BotService } from './bot.service';
import { BotGateway } from './bot.gateway';
import { CommandRouter } from './commands/command-router';
import { CommandRegistry } from './commands/command-registry';
import { HelpCommand } from './commands/help.command';
import { BatDauCommand } from './commands/bat-dau.command';

@Module({
  imports: [SharedModule, UsersModule],
  providers: [
    BotService,
    CommandRegistry,
    CommandRouter,
    BotGateway,
    HelpCommand,
    BatDauCommand,
  ],
  exports: [BotService],
})
export class BotModule {}
