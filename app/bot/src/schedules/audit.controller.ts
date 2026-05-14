import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { SessionGuard, AuthenticatedRequest } from "../auth/session.guard";
import { AuditService } from "./audit.service";
import { SchedulesService } from "./schedules.service";

@Controller("api/audit")
@UseGuards(SessionGuard)
export class AuditController {
  constructor(
    private readonly auditService: AuditService,
    private readonly schedulesService: SchedulesService,
  ) {}

  @Get(":scheduleId")
  async getAuditLog(
    @Req() req: AuthenticatedRequest,
    @Param("scheduleId", ParseIntPipe) scheduleId: number,
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const schedule = await this.schedulesService.findById(
      scheduleId,
      req.session.sub,
    );
    if (!schedule) {
      return { success: false, error: "Schedule not found" };
    }

    const pageNum = Math.max(1, parseInt(page ?? "1", 10) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(limit ?? "10", 10) || 10));
    const offset = (pageNum - 1) * pageSize;

    const result = await this.auditService.findBySchedule(
      scheduleId,
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
}
