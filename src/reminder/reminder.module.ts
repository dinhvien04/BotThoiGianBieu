import { Module } from '@nestjs/common';
import { BotModule } from '../bot/bot.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { UsersModule } from '../users/users.module';
import { SharedModule } from '../shared/shared.module';
import { ReminderService } from './reminder.service';
import { ReminderInteractionHandler } from './reminder-interaction.handler';

@Module({
  imports: [BotModule, SchedulesModule, UsersModule, SharedModule],
  providers: [ReminderService, ReminderInteractionHandler],
})
export class ReminderModule {}
