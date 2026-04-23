import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ScheduleModule as NestScheduleModule } from "@nestjs/schedule";
import { databaseConfig } from "./config/database.config";
import { BotModule } from "./bot/bot.module";
import { ScheduleModule } from "./schedules/schedule.module";
import { UsersModule } from "./users/users.module";
import { SharedModule } from "./shared/shared.module";

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRootAsync(databaseConfig),
    NestScheduleModule.forRoot(),
    SharedModule,
    UsersModule,
    ScheduleModule,
    BotModule,
  ],
})
export class AppModule {}
