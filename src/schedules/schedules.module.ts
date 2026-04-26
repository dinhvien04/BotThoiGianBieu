import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { Tag } from './entities/tag.entity';
import { SchedulesService } from './schedules.service';
import { TagsService } from './tags.service';
import { UndoService } from './undo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule, Tag])],
  providers: [SchedulesService, TagsService, UndoService],
  exports: [SchedulesService, TagsService, UndoService],
})
export class SchedulesModule {}
