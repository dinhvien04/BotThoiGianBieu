import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotModule } from '../bot/bot.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { UsersModule } from '../users/users.module';
import { SharedModule } from '../shared/shared.module';
import { ReminderService } from './reminder.service';
import { ReminderInteractionHandler } from './reminder-interaction.handler';

@Module({
  imports: [TypeOrmModule.forFeature([]), BotModule, SchedulesModule, UsersModule, SharedModule],
  providers: [ReminderService, ReminderInteractionHandler],
})
export class ReminderModule {}
