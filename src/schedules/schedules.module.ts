import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { ScheduleTemplate } from './entities/schedule-template.entity';
import { Tag } from './entities/tag.entity';
import { User } from '../users/entities/user.entity';
import { SchedulesService } from './schedules.service';
import { TagsService } from './tags.service';
import { SharesService } from './shares.service';
import { UndoService } from './undo.service';
import { TemplatesService } from './templates.service';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, ScheduleTemplate, Tag, User])],
  providers: [
    SchedulesService,
    TagsService,
    SharesService,
    UndoService,
    TemplatesService,
  ],
  exports: [
    SchedulesService,
    TagsService,
    SharesService,
    UndoService,
    TemplatesService,
  ],
})
export class SchedulesModule {}
