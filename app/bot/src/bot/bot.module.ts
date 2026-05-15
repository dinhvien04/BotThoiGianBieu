import { Module, forwardRef } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { UsersModule } from '../users/users.module';
import { SchedulesModule } from '../schedules/schedules.module';
import { AdminModule } from '../admin/admin.module';
import { AdminStatsCommand } from './commands/admin/admin-stats.command';
import { AdminBroadcastCommand } from './commands/admin/admin-broadcast.command';
import {
  SetAdminCommand,
  RemoveAdminCommand,
} from './commands/admin/set-admin.command';
import {
  LockUserCommand,
  UnlockUserCommand,
} from './commands/admin/lock-user.command';
import { BotService } from './bot.service';
import { BotGateway } from './bot.gateway';
import { CommandRouter } from './commands/command-router';
import { CommandRegistry } from './commands/command-registry';
import { HelpCommand } from './commands/help.command';
import { BatDauCommand } from './commands/bat-dau.command';
import { LichHomNayCommand } from './commands/lich-hom-nay.command';
import { LichNgayCommand } from './commands/lich-ngay.command';
import {
  LichTuanCommand,
  LichTuanSauCommand,
  LichTuanTruocCommand,
} from './commands/lich-tuan.command';
import { ThemLichCommand } from './commands/them-lich.command';
import { ThemLichExcelCommand } from './commands/them-lich-excel.command';
import { MauLichExcelCommand } from './commands/mau-lich-excel.command';
import { SuaLichCommand } from './commands/sua-lich.command';
import { XoaLichCommand } from './commands/xoa-lich.command';
import { HoanThanhCommand } from './commands/hoan-thanh.command';
import { CaiDatCommand } from './commands/cai-dat.command';
import { ChiTietCommand } from './commands/chi-tiet.command';
import { NhacCommand, TatNhacCommand } from './commands/nhac.command';
import { NhacSauCommand } from './commands/nhac-sau.command';
import { LichLapCommand } from './commands/lich-lap.command';
import { BoLapCommand } from './commands/bo-lap.command';
import { CopyLichCommand } from './commands/copy-lich.command';
import { NhanhCommand } from './commands/nhanh.command';
import { GhiChuCommand } from './commands/ghi-chu.command';
import {
  HoanThanhTatCaCommand,
  XoaTheoTagCommand,
  XoaCompletedTruocCommand,
} from './commands/bulk-ops.command';
import {
  GhimCommand,
  BoGhimCommand,
  LichAnCommand,
  HienCommand,
} from './commands/pin-hide.command';
import { LichThangCommand } from './commands/lich-thang.command';
import { HoanTacCommand } from './commands/hoan-tac.command';
import { ExportIcsCommand } from './commands/export-ics.command';
import { ImportIcsCommand } from './commands/import-ics.command';
import { BackupCommand } from './commands/backup.command';
import { TimKiemCommand } from './commands/tim-kiem.command';
import { SapToiCommand } from './commands/sap-toi.command';
import { DanhSachCommand } from './commands/danh-sach.command';
import { LichTreCommand } from './commands/lich-tre.command';
import { StreakCommand } from './commands/streak.command';
import { LichSuCommand } from './commands/lich-su.command';
import { GioLamCommand } from './commands/gio-lam.command';
import { TimezoneCommand } from './commands/timezone.command';
import {
  TaoTemplateCommand,
  TuTemplateCommand,
  DsTemplateCommand,
  XoaTemplateCommand,
} from './commands/template.command';
import { ThongKeCommand } from './commands/thong-ke.command';
import {
  TagThemCommand,
  TagXoaCommand,
  TagDsCommand,
  TagCommand,
  UntagCommand,
} from './commands/tag.command';
import { LichTagCommand } from './commands/lich-tag.command';
import {
  ChiaSeCommand,
  BoChiaSeCommand,
  LichChiaSeCommand,
  ChiaSeAiCommand,
  ChiaSeEditCommand,
  BoChiaSeEditCommand,
} from './commands/chia-se.command';
import { InteractionRegistry } from './interactions/interaction-registry';
import { InteractionRouter } from './interactions/interaction-router';
import { LocalConsoleGateway } from './local-console.gateway';

@Module({
  imports: [
    SharedModule,
    UsersModule,
    SchedulesModule,
    forwardRef(() => AdminModule),
  ],
  providers: [
    BotService,
    CommandRegistry,
    CommandRouter,
    InteractionRegistry,
    InteractionRouter,
    BotGateway,
    LocalConsoleGateway,
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
    NhacSauCommand,
    LichLapCommand,
    BoLapCommand,
    CopyLichCommand,
    NhanhCommand,
    GhiChuCommand,
    HoanThanhTatCaCommand,
    XoaTheoTagCommand,
    XoaCompletedTruocCommand,
    GhimCommand,
    BoGhimCommand,
    LichAnCommand,
    HienCommand,
    LichThangCommand,
    HoanTacCommand,
    ExportIcsCommand,
    ImportIcsCommand,
    BackupCommand,
    TimKiemCommand,
    SapToiCommand,
    DanhSachCommand,
    LichTreCommand,
    StreakCommand,
    LichSuCommand,
    GioLamCommand,
    TimezoneCommand,
    TaoTemplateCommand,
    TuTemplateCommand,
    DsTemplateCommand,
    XoaTemplateCommand,
    ThongKeCommand,
    TagThemCommand,
    TagXoaCommand,
    TagDsCommand,
    TagCommand,
    UntagCommand,
    LichTagCommand,
    ChiaSeCommand,
    BoChiaSeCommand,
    LichChiaSeCommand,
    ChiaSeAiCommand,
    ChiaSeEditCommand,
    BoChiaSeEditCommand,
    ThemLichCommand,
    ThemLichExcelCommand,
    MauLichExcelCommand,
    SuaLichCommand,
    XoaLichCommand,
    CaiDatCommand,
    // Admin commands
    AdminStatsCommand,
    AdminBroadcastCommand,
    SetAdminCommand,
    RemoveAdminCommand,
    LockUserCommand,
    UnlockUserCommand,
  ],
  exports: [BotService, InteractionRegistry],
})
export class BotModule {}
