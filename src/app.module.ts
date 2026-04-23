import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { databaseConfig } from './config/database.config';
import { BotModule } from './bot/bot.module';
import { UsersModule } from './users/users.module';
import { SchedulesModule } from './schedules/schedules.module';
import { SharedModule } from './shared/shared.module';
import { ReminderModule } from './reminder/reminder.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(databaseConfig),
    NestScheduleModule.forRoot(),
    SharedModule,
    UsersModule,
<<<<<<< HEAD
    ScheduleModule,
=======
    SchedulesModule,
>>>>>>> origin/develop
    BotModule,
    ReminderModule,
  ],
})
export class AppModule {}
