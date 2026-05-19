import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { SessionGuard, AuthenticatedRequest } from '../auth/session.guard';
import { SchedulesService, CreateScheduleInput, UpdateSchedulePatch } from './schedules.service';
import { SCHEDULE_PRIORITIES, SchedulePriority } from './entities/schedule.entity';
import { StreakService } from './streak.service';
import {
  BulkScheduleIdsDto,
  CreateScheduleDto,
  UpdateScheduleDto,
  USER_SCHEDULE_LIST_STATUSES,
} from './dto/schedule.dto';

function parsePositiveInteger(value: string | undefined, fallback: number, max: number): number {
  const parsed = parseInt(value ?? '', 10);
  return Math.min(max, Math.max(1, Number.isFinite(parsed) ? parsed : fallback));
}

function parseOptionalDate(value: string | undefined, field: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(`${field} must be a valid ISO date`);
  }
  return date;
}

function parsePriority(priority?: string): SchedulePriority | undefined {
  if (!priority) return undefined;
  if (!(SCHEDULE_PRIORITIES as readonly string[]).includes(priority)) {
    throw new BadRequestException(`priority must be one of: ${SCHEDULE_PRIORITIES.join(', ')}`);
  }
  return priority as SchedulePriority;
}

function parseListStatus(status?: string): 'all' | 'pending' | 'completed' | 'cancelled' | 'overdue' | undefined {
  if (!status) return undefined;
  if (!(USER_SCHEDULE_LIST_STATUSES as readonly string[]).includes(status)) {
    throw new BadRequestException(
      `status must be one of: ${USER_SCHEDULE_LIST_STATUSES.join(', ')}`,
    );
  }
  return status as 'all' | 'pending' | 'completed' | 'cancelled' | 'overdue';
}

@Controller('api/schedules')
@UseGuards(SessionGuard)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly streakService: StreakService,
  ) {}

  @Post()
  async create(@Req() req: AuthenticatedRequest, @Body() body: CreateScheduleDto) {
    const input: CreateScheduleInput = {
      user_id: req.session.sub,
      title: body.title,
      description: body.description ?? null,
      item_type: body.item_type ?? 'task',
      start_time: new Date(body.start_time),
      end_time: body.end_time ? new Date(body.end_time) : null,
      priority: body.priority ?? 'normal',
      remind_at: body.remind_at ? new Date(body.remind_at) : null,
      recurrence_type: body.recurrence_type ?? 'none',
      recurrence_interval: body.recurrence_interval ?? 1,
      recurrence_until: body.recurrence_until ? new Date(body.recurrence_until) : null,
    };

    const schedule = await this.schedulesService.create(input);
    return { success: true, schedule };
  }

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const userId = req.session.sub;
    const pageNum = parsePositiveInteger(page, 1, Number.MAX_SAFE_INTEGER);
    const pageSize = parsePositiveInteger(limit, 10, 50);
    const offset = (pageNum - 1) * pageSize;
    const statusFilter = parseListStatus(status);
    const priorityFilter = parsePriority(priority);

    if (search) {
      const result = await this.schedulesService.search(userId, search, pageSize, offset);
      return {
        success: true,
        items: result.items,
        total: result.total,
        page: pageNum,
        limit: pageSize,
      };
    }

    if (start || end) {
      const startDate = parseOptionalDate(start, 'start');
      const endDate = parseOptionalDate(end, 'end');
      if (!startDate || !endDate) {
        throw new BadRequestException('start and end are required together');
      }
      const items = await this.schedulesService.findByDateRange(userId, startDate, endDate);
      return { success: true, items, total: items.length };
    }

    if (statusFilter === 'pending') {
      const result = await this.schedulesService.findAllPending(
        userId,
        pageSize,
        offset,
        priorityFilter,
      );
      return {
        success: true,
        items: result.items,
        total: result.total,
        page: pageNum,
        limit: pageSize,
      };
    }

    if (statusFilter === 'completed' || statusFilter === 'cancelled' || statusFilter === 'all') {
      const result = await this.schedulesService.findAllForUser(
        userId,
        pageSize,
        offset,
        statusFilter === 'all' ? undefined : statusFilter,
        priorityFilter,
      );
      return {
        success: true,
        items: result.items,
        total: result.total,
        page: pageNum,
        limit: pageSize,
      };
    }

    if (statusFilter === 'overdue') {
      const result = await this.schedulesService.findOverdue(
        userId,
        new Date(),
        pageSize,
        offset,
        priorityFilter,
      );
      return {
        success: true,
        items: result.items,
        total: result.total,
        page: pageNum,
        limit: pageSize,
      };
    }

    const result = await this.schedulesService.findAllPending(
      userId,
      pageSize,
      offset,
      priorityFilter,
    );
    return {
      success: true,
      items: result.items,
      total: result.total,
      page: pageNum,
      limit: pageSize,
    };
  }

  @Get('upcoming')
  async upcoming(
    @Req() req: AuthenticatedRequest,
    @Query('limit') limit?: string,
    @Query('priority') priority?: string,
  ) {
    const priorityFilter = parsePriority(priority);
    const items = await this.schedulesService.findUpcoming(
      req.session.sub,
      new Date(),
      parsePositiveInteger(limit, 5, 20),
      priorityFilter,
    );
    return { success: true, items };
  }

  @Get('statistics')
  async statistics(
    @Req() req: AuthenticatedRequest,
    @Query('start') start?: string,
    @Query('end') end?: string,
  ) {
    const startDate = parseOptionalDate(start, 'start');
    const endDate = parseOptionalDate(end, 'end');
    const stats = await this.schedulesService.getStatistics(req.session.sub, startDate, endDate);
    return { success: true, ...stats };
  }

  @Get(':id')
  async findOne(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    const schedule = await this.schedulesService.findById(id, req.session.sub);
    if (!schedule) {
      return { success: false, error: 'Schedule not found' };
    }
    return { success: true, schedule };
  }

  @Patch(':id')
  async update(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateScheduleDto,
  ) {
    const existing = await this.schedulesService.findById(id, req.session.sub);
    if (!existing) {
      return { success: false, error: 'Schedule not found' };
    }

    const patch: UpdateSchedulePatch = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.item_type !== undefined) patch.item_type = body.item_type;
    if (body.start_time !== undefined) patch.start_time = new Date(body.start_time);
    if (body.end_time !== undefined)
      patch.end_time = body.end_time ? new Date(body.end_time) : null;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.status !== undefined) patch.status = body.status;
    if (body.remind_at !== undefined) {
      patch.remind_at = body.remind_at ? new Date(body.remind_at) : null;
      patch.acknowledged_at = body.remind_at ? null : new Date();
      patch.is_reminded = !body.remind_at;
    }
    if (body.recurrence_type !== undefined) patch.recurrence_type = body.recurrence_type;
    if (body.recurrence_interval !== undefined)
      patch.recurrence_interval = body.recurrence_interval;
    if (body.recurrence_until !== undefined)
      patch.recurrence_until = body.recurrence_until ? new Date(body.recurrence_until) : null;
    if (body.end_time !== undefined) {
      patch.end_notified_at = body.end_time ? null : new Date();
    }

    const schedule = await this.schedulesService.update(id, patch);
    return { success: true, schedule };
  }

  @Patch(':id/complete')
  async complete(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    const existing = await this.schedulesService.findById(id, req.session.sub);
    if (!existing) {
      return { success: false, error: 'Schedule not found' };
    }
    await this.schedulesService.markCompleted(id);
    return { success: true };
  }

  @Delete(':id')
  async remove(@Req() req: AuthenticatedRequest, @Param('id', ParseIntPipe) id: number) {
    const existing = await this.schedulesService.findById(id, req.session.sub);
    if (!existing) {
      return { success: false, error: 'Schedule not found' };
    }
    await this.schedulesService.delete(id);
    return { success: true };
  }

  @Post('bulk/complete')
  async bulkComplete(@Req() req: AuthenticatedRequest, @Body() body: BulkScheduleIdsDto) {
    const count = await this.schedulesService.bulkComplete(req.session.sub, body.ids);
    return { success: true, count };
  }

  @Post('bulk/delete')
  async bulkDelete(@Req() req: AuthenticatedRequest, @Body() body: BulkScheduleIdsDto) {
    const count = await this.schedulesService.bulkDelete(req.session.sub, body.ids);
    return { success: true, count };
  }

  @Get('streak/current')
  async streak(@Req() req: AuthenticatedRequest) {
    const stats = await this.streakService.computeStreak(req.session.sub);
    return { success: true, ...stats };
  }
}
