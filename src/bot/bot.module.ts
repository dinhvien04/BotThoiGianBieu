import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { ScheduleModule } from "../schedules/schedule.module";
import { UsersModule } from "../users/users.module";
import { BotService } from "./bot.service";
import { BotGateway } from "./bot.gateway";
import { CommandRouter } from "./commands/command-router";
import { CommandRegistry } from "./commands/command-registry";
import { HelpCommand } from "./commands/help.command";
import { BatDauCommand } from "./commands/bat-dau.command";
import { LichHomNayCommand } from "./commands/lich-hom-nay.command";
import { LichNgayCommand } from "./commands/lich-ngay.command";
import {
  LichTuanCommand,
  LichTuanSauCommand,
  LichTuanTruocCommand,
} from "./commands/lich-tuan.command";

@Module({
  imports: [SharedModule, UsersModule, ScheduleModule],
  providers: [
    BotService,
    CommandRegistry,
    CommandRouter,
    BotGateway,
    HelpCommand,
    BatDauCommand,
    LichHomNayCommand,
    LichNgayCommand,
    LichTuanCommand,
    LichTuanTruocCommand,
    LichTuanSauCommand,
  ],
  exports: [BotService],
})
export class BotModule {}
