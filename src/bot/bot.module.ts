import { Module } from "@nestjs/common";
import { SharedModule } from "../shared/shared.module";
import { UsersModule } from "../users/users.module";
import { SchedulesModule } from "../schedules/schedules.module";
import { ScheduleModule } from "../schedules/schedule.module";
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
import { ChiTietCommand } from "./commands/chi-tiet.command";
import { HoanThanhCommand } from "./commands/hoan-thanh.command";
import { NhacCommand, TatNhacCommand } from "./commands/nhac.command";
import { ThemLichCommand } from "./commands/them-lich.command";
import { SuaLichCommand } from "./commands/sua-lich.command";
import { InteractionRegistry } from "./interactions/interaction-registry";
import { InteractionRouter } from "./interactions/interaction-router";

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
    ChiTietCommand,
    HoanThanhCommand,
    NhacCommand,
    TatNhacCommand,
    ThemLichCommand,
    SuaLichCommand,
  ],
  exports: [BotService, InteractionRegistry],
})
export class BotModule {}
