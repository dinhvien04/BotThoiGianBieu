import {
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
} from "@nestjs/common";
import { SessionGuard, AuthenticatedRequest } from "../auth/session.guard";
import { SchedulesService, CreateScheduleInput } from "./schedules.service";
import { SchedulePriority } from "./entities/schedule.entity";
import { StreakService } from "./streak.service";

@Controller("api/schedules")
@UseGuards(SessionGuard)
export class SchedulesController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly streakService: StreakService,
  ) {}

  @Post()
  async create(
    @Req() req: AuthenticatedRequest,
    @Body()
    body: {
      title: string;
      description?: string;
      item_type?: string;
      start_time: string;
      end_time?: string;
      priority?: string;
      remind_at?: string;
      recurrence_type?: string;
      recurrence_interval?: number;
      recurrence_until?: string;
    },
  ) {
    try {
      const input: CreateScheduleInput = {
      user_id: req.session.sub,
      title: body.title,
      description: body.description ?? null,
      item_type: (body.item_type as CreateScheduleInput["item_type"]) ?? "task",
      start_time: new Date(body.start_time),
      end_time: body.end_time ? new Date(body.end_time) : null,
      priority:
        (body.priority as CreateScheduleInput["priority"]) ?? "normal",
      remind_at: body.remind_at ? new Date(body.remind_at) : null,
      recurrence_type:
        (body.recurrence_type as CreateScheduleInput["recurrence_type"]) ??
        "none",
      recurrence_interval: body.recurrence_interval ?? 1,
      recurrence_until: body.recurrence_until
        ? new Date(body.recurrence_until)
        : null,
    };
      const schedule = await this.schedulesService.create(input);
      return { success: true, schedule };
    } catch (e: any) {
      require('fs').writeFileSync('backend-error.txt', e.stack || e.message);
      throw e;
    }
  }

  @Get()
  async list(
    @Req() req: AuthenticatedRequest,
    @Query("status") status?: string,
    @Query("priority") priority?: string,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("start") start?: string,
    @Query("end") end?: string,
  ) {
    try {
      const userId = req.session.sub;
      const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit ?? "10", 10) || 10));
    const offset = (pageNum - 1) * pageSize;

    if (search) {
      const result = await this.schedulesService.search(
        userId,
        search,
        pageSize,
        offset,
      );
      return {
        success: true,
        items: result.items,
        total: result.total,
        page: pageNum,
        limit: pageSize,
      };
    }

    if (start && end) {
      const items = await this.schedulesService.findByDateRange(
        userId,
        new Date(start),
        new Date(end),
      );
      return { success: true, items, total: items.length };
    }

    if (status === "pending") {
      const result = await this.schedulesService.findAllPending(
        userId,
        pageSize,
        offset,
        priority as SchedulePriority | undefined,
      );
      return {
        success: true,
        items: result.items,
        total: result.total,
        page: pageNum,
        limit: pageSize,
      };
    }

    if (status === "overdue") {
      const result = await this.schedulesService.findOverdue(
        userId,
        new Date(),
        pageSize,
        offset,
        priority as SchedulePriority | undefined,
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
        priority as SchedulePriority | undefined,
      );
      return {
        success: true,
        items: result.items,
        total: result.total,
        page: pageNum,
        limit: pageSize,
      };
    } catch (e: any) {
      require('fs').writeFileSync('backend-error.txt', e.stack || e.message);
      throw e;
    }
  }

  @Get("upcoming")
  async upcoming(
    @Req() req: AuthenticatedRequest,
    @Query("limit") limit?: string,
    @Query("priority") priority?: string,
  ) {
    const items = await this.schedulesService.findUpcoming(
      req.session.sub,
      new Date(),
      Math.min(20, parseInt(limit ?? "5", 10) || 5),
      priority as SchedulePriority | undefined,
    );
    return { success: true, items };
  }

  @Get("statistics")
  async statistics(
    @Req() req: AuthenticatedRequest,
    @Query("start") start?: string,
    @Query("end") end?: string,
  ) {
    const stats = await this.schedulesService.getStatistics(
      req.session.sub,
      start ? new Date(start) : null,
      end ? new Date(end) : null,
    );
    return { success: true, ...stats };
  }

  @Get(":id")
  async findOne(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const schedule = await this.schedulesService.findById(
      id,
      req.session.sub,
    );
    if (!schedule) {
      return { success: false, error: "Schedule not found" };
    }
    return { success: true, schedule };
  }

  @Patch(":id")
  async update(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
    @Body()
    body: {
      title?: string;
      description?: string | null;
      item_type?: string;
      start_time?: string;
      end_time?: string | null;
      priority?: string;
      status?: string;
      remind_at?: string | null;
      recurrence_type?: string;
      recurrence_interval?: number;
      recurrence_until?: string | null;
    },
  ) {
    const existing = await this.schedulesService.findById(
      id,
      req.session.sub,
    );
    if (!existing) {
      return { success: false, error: "Schedule not found" };
    }

    const patch: Record<string, unknown> = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.description !== undefined) patch.description = body.description;
    if (body.item_type !== undefined) patch.item_type = body.item_type;
    if (body.start_time !== undefined)
      patch.start_time = new Date(body.start_time);
    if (body.end_time !== undefined)
      patch.end_time = body.end_time ? new Date(body.end_time) : null;
    if (body.priority !== undefined) patch.priority = body.priority;
    if (body.status !== undefined) patch.status = body.status;
    if (body.remind_at !== undefined)
      patch.remind_at = body.remind_at ? new Date(body.remind_at) : null;
    if (body.recurrence_type !== undefined)
      patch.recurrence_type = body.recurrence_type;
    if (body.recurrence_interval !== undefined)
      patch.recurrence_interval = body.recurrence_interval;
    if (body.recurrence_until !== undefined)
      patch.recurrence_until = body.recurrence_until
        ? new Date(body.recurrence_until)
        : null;

    const schedule = await this.schedulesService.update(id, patch);
    return { success: true, schedule };
  }

  @Patch(":id/complete")
  async complete(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const existing = await this.schedulesService.findById(
      id,
      req.session.sub,
    );
    if (!existing) {
      return { success: false, error: "Schedule not found" };
    }
    await this.schedulesService.markCompleted(id);
    return { success: true };
  }

  @Delete(":id")
  async remove(
    @Req() req: AuthenticatedRequest,
    @Param("id", ParseIntPipe) id: number,
  ) {
    const existing = await this.schedulesService.findById(
      id,
      req.session.sub,
    );
    if (!existing) {
      return { success: false, error: "Schedule not found" };
    }
    await this.schedulesService.delete(id);
    return { success: true };
  }

  @Post("bulk/complete")
  async bulkComplete(
    @Req() req: AuthenticatedRequest,
    @Body() body: { ids: number[] },
  ) {
    const count = await this.schedulesService.bulkComplete(
      req.session.sub,
      body.ids ?? [],
    );
    return { success: true, count };
  }

  @Post("bulk/delete")
  async bulkDelete(
    @Req() req: AuthenticatedRequest,
    @Body() body: { ids: number[] },
  ) {
    const count = await this.schedulesService.bulkDelete(
      req.session.sub,
      body.ids ?? [],
    );
    return { success: true, count };
  }

  @Get("streak/current")
  async streak(@Req() req: AuthenticatedRequest) {
    const stats = await this.streakService.computeStreak(req.session.sub);
    return { success: true, ...stats };
  }
}
