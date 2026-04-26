import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Schedule } from './entities/schedule.entity';
import { SchedulesService } from './schedules.service';
import { UndoService } from './undo.service';

@Module({
  imports: [TypeOrmModule.forFeature([Schedule])],
  providers: [SchedulesService, UndoService],
  exports: [SchedulesService, UndoService],
})
export class SchedulesModule {}
