import { Transform, Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import {
  RECURRENCE_TYPES,
  RecurrenceType,
  SCHEDULE_ITEM_TYPES,
  SCHEDULE_PRIORITIES,
  SCHEDULE_STATUSES,
  ScheduleItemType,
  SchedulePriority,
  ScheduleStatus,
} from '../entities/schedule.entity';

export const USER_SCHEDULE_LIST_STATUSES = ['all', 'pending', 'completed', 'cancelled', 'overdue'] as const;
export type UserScheduleListStatus = (typeof USER_SCHEDULE_LIST_STATUSES)[number];

export class CreateScheduleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title!: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string;

  @IsOptional()
  @IsIn(SCHEDULE_ITEM_TYPES)
  item_type?: ScheduleItemType;

  @IsISO8601({ strict: true })
  start_time!: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  end_time?: string;

  @IsOptional()
  @IsIn(SCHEDULE_PRIORITIES)
  priority?: SchedulePriority;

  @IsOptional()
  @IsIn(SCHEDULE_STATUSES)
  status?: ScheduleStatus;

  @IsOptional()
  @IsISO8601({ strict: true })
  remind_at?: string;

  @IsOptional()
  @IsIn(RECURRENCE_TYPES)
  recurrence_type?: RecurrenceType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  recurrence_interval?: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  recurrence_until?: string;
}

export class UpdateScheduleDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  description?: string | null;

  @IsOptional()
  @IsIn(SCHEDULE_ITEM_TYPES)
  item_type?: ScheduleItemType;

  @IsOptional()
  @IsISO8601({ strict: true })
  start_time?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  end_time?: string | null;

  @IsOptional()
  @IsIn(SCHEDULE_PRIORITIES)
  priority?: SchedulePriority;

  @IsOptional()
  @IsIn(SCHEDULE_STATUSES)
  status?: ScheduleStatus;

  @IsOptional()
  @IsISO8601({ strict: true })
  remind_at?: string | null;

  @IsOptional()
  @IsIn(RECURRENCE_TYPES)
  recurrence_type?: RecurrenceType;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  recurrence_interval?: number;

  @IsOptional()
  @IsISO8601({ strict: true })
  recurrence_until?: string | null;
}

export class BulkScheduleIdsDto {
  @Transform(({ value }) => (Array.isArray(value) ? value.map((item) => Number(item)) : value))
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @IsInt({ each: true })
  ids!: number[];
}
