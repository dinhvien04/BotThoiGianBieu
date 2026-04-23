import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { UsersModule } from '../users/users.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { BotService } from './bot.service';
import { BotGateway } from './bot.gateway';
import { CommandRouter } from './commands/command-router';
import { CommandRegistry } from './commands/command-registry';
import { HelpCommand } from './commands/help.command';
import { BatDauCommand } from './commands/bat-dau.command';
import { ThemLichCommand } from './commands/them-lich.command';
import { SuaLichCommand } from './commands/sua-lich.command';
import { InteractionRegistry } from './interactions/interaction-registry';
import { InteractionRouter } from './interactions/interaction-router';

@Module({
  imports: [SharedModule, UsersModule, SchedulesModule, ScheduleModule],
  providers: [
    BotService,
    CommandRegistry,
    CommandRouter,
    InteractionRegistry,
    InteractionRouter,
    BotGateway,
    HelpCommand,
    BatDauCommand,
    LichHomNayCommand,
    LichNgayCommand,
    LichTuanCommand,
    LichTuanTruocCommand,
    LichTuanSauCommand,
    ThemLichCommand,
    SuaLichCommand,
  ],
  exports: [BotService, InteractionRegistry],
})
export class BotModule {}
