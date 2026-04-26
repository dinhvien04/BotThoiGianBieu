import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { Tag } from './entities/tag.entity';
import { User } from '../users/entities/user.entity';
import { SchedulesService } from './schedules.service';
import { TagsService } from './tags.service';
import { SharesService } from './shares.service';
import { UndoService } from './undo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, Tag, User])],
  providers: [SchedulesService, TagsService, SharesService, UndoService],
  exports: [SchedulesService, TagsService, SharesService, UndoService],
})
export class SchedulesModule {}
