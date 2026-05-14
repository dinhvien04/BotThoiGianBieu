import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { ScheduleTemplate } from './entities/schedule-template.entity';
import { ScheduleAuditLog } from './entities/schedule-audit-log.entity';
import { Tag } from './entities/tag.entity';
import { User } from '../users/entities/user.entity';
import { UserSettings } from '../users/entities/user-settings.entity';
import { SchedulesService } from './schedules.service';
import { TagsService } from './tags.service';
import { SharesService } from './shares.service';
import { UndoService } from './undo.service';
import { TemplatesService } from './templates.service';
import { AuditService } from './audit.service';
import { BackupService } from './backup.service';
import { StreakService } from './streak.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Schedule,
      ScheduleTemplate,
      ScheduleAuditLog,
      Tag,
      User,
      UserSettings,
    ]),
  ],
  providers: [
    SchedulesService,
    TagsService,
    SharesService,
    UndoService,
    TemplatesService,
    AuditService,
    BackupService,
    StreakService,
  ],
  exports: [
    SchedulesService,
    TagsService,
    SharesService,
    UndoService,
    TemplatesService,
    AuditService,
    BackupService,
    StreakService,
  ],
})
export class SchedulesModule {}
