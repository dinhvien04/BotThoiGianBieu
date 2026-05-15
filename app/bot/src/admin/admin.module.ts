import { Module, forwardRef } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AuthModule } from "../auth/auth.module";
import { BotModule } from "../bot/bot.module";
import { Schedule } from "../schedules/entities/schedule.entity";
import { ScheduleAuditLog } from "../schedules/entities/schedule-audit-log.entity";
import { User } from "../users/entities/user.entity";
import { UsersModule } from "../users/users.module";
import { AdminBootstrapService } from "./admin-bootstrap.service";
import { AdminController } from "./admin.controller";
import { AdminGuard } from "./admin.guard";
import { AdminService } from "./admin.service";
import { BroadcastService } from "./broadcast.service";
import { Broadcast } from "./entities/broadcast.entity";
import { SystemSetting } from "./entities/system-setting.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      Schedule,
      ScheduleAuditLog,
      SystemSetting,
      Broadcast,
    ]),
    AuthModule,
    UsersModule,
    forwardRef(() => BotModule),
  ],
  controllers: [AdminController],
  providers: [
    AdminService,
    AdminGuard,
    BroadcastService,
    AdminBootstrapService,
  ],
  exports: [AdminService, BroadcastService, AdminGuard],
})
export class AdminModule {}
