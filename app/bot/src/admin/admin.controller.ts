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
  Put,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import { AdminGuard } from "./admin.guard";
import { AdminService, BroadcastFilter } from "./admin.service";
import { BroadcastService } from "./broadcast.service";
import { USER_ROLES, UserRole } from "../users/entities/user.entity";
import type { AuthenticatedRequest } from "../auth/session.guard";

const SCHEDULE_STATUSES = ["pending", "completed", "cancelled"] as const;

function parseInteger(value: string | undefined, fallback: number): number {
  const n = parseInt(value ?? "", 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

function parseBool(value: string | undefined): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

@Controller("api/admin")
@UseGuards(AdminGuard)
export class AdminController {
  constructor(
    private readonly adminService: AdminService,
    private readonly broadcastService: BroadcastService,
  ) {}

  // ===== Self-check =====

  @Get("me")
  me(@Req() req: AuthenticatedRequest) {
    return {
      success: true,
      user: {
        user_id: req.session.sub,
        username: req.session.username,
        display_name: req.session.displayName,
      },
    };
  }

  // ===== Stats =====

  @Get("stats")
  async stats() {
    const stats = await this.adminService.getDashboardStats();
    return { success: true, stats };
  }

  // ===== Users =====

  @Get("users")
  async listUsers(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("role") role?: string,
    @Query("locked") locked?: string,
  ) {
    let roleFilter: UserRole | undefined;
    if (role) {
      if (!USER_ROLES.includes(role as UserRole)) {
        throw new BadRequestException(`Invalid role: ${role}`);
      }
      roleFilter = role as UserRole;
    }
    const result = await this.adminService.listUsers({
      page: parseInteger(page, 1),
      limit: parseInteger(limit, 20),
      search: search?.trim() || undefined,
      role: roleFilter,
      locked: parseBool(locked),
    });
    return { success: true, ...result };
  }

  @Get("users/:userId")
  async getUser(@Param("userId") userId: string) {
    const detail = await this.adminService.getUserDetail(userId);
    return { success: true, ...detail };
  }

  @Patch("users/:userId/role")
  async setRole(
    @Param("userId") userId: string,
    @Body() body: { role?: string },
    @Req() req: AuthenticatedRequest,
  ) {
    const role = body?.role;
    if (!role || !USER_ROLES.includes(role as UserRole)) {
      throw new BadRequestException(
        `role phải là một trong: ${USER_ROLES.join(", ")}`,
      );
    }
    if (userId === req.session.sub && role !== "admin") {
      throw new BadRequestException("Không thể tự gỡ quyền admin của chính bạn");
    }
    const user = await this.adminService.setRole(userId, role as UserRole);
    return { success: true, user };
  }

  @Patch("users/:userId/lock")
  async setLocked(
    @Param("userId") userId: string,
    @Body() body: { locked?: boolean },
    @Req() req: AuthenticatedRequest,
  ) {
    if (typeof body?.locked !== "boolean") {
      throw new BadRequestException("locked phải là boolean");
    }
    if (userId === req.session.sub && body.locked) {
      throw new BadRequestException("Không thể tự khoá tài khoản của chính bạn");
    }
    const user = await this.adminService.setLocked(userId, body.locked);
    return { success: true, user };
  }

  @Delete("users/:userId")
  async deleteUser(
    @Param("userId") userId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    if (userId === req.session.sub) {
      throw new BadRequestException("Không thể tự xoá tài khoản của chính bạn");
    }
    await this.adminService.deleteUser(userId);
    return { success: true };
  }

  // ===== Schedules =====

  @Get("schedules")
  async listSchedules(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("search") search?: string,
    @Query("status") status?: string,
    @Query("user_id") userId?: string,
  ) {
    if (status && !(SCHEDULE_STATUSES as readonly string[]).includes(status)) {
      throw new BadRequestException(
        `status phải là một trong: ${SCHEDULE_STATUSES.join(", ")}`,
      );
    }
    const result = await this.adminService.listSchedules({
      page: parseInteger(page, 1),
      limit: parseInteger(limit, 20),
      search: search?.trim() || undefined,
      status,
      user_id: userId?.trim() || undefined,
    });
    return { success: true, ...result };
  }

  @Delete("schedules/:id")
  async deleteSchedule(@Param("id", ParseIntPipe) id: number) {
    await this.adminService.deleteSchedule(id);
    return { success: true };
  }

  // ===== Audit =====

  @Get("audit")
  async listAudit(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
    @Query("user_id") userId?: string,
    @Query("action") action?: string,
    @Query("schedule_id") scheduleId?: string,
  ) {
    const result = await this.adminService.listAuditLogs({
      page: parseInteger(page, 1),
      limit: parseInteger(limit, 20),
      user_id: userId?.trim() || undefined,
      action: action?.trim() || undefined,
      schedule_id: scheduleId
        ? parseInteger(scheduleId, Number.NaN)
        : undefined,
    });
    return { success: true, ...result };
  }

  // ===== Broadcast =====

  @Post("broadcasts")
  async sendBroadcast(
    @Body()
    body: {
      message?: string;
      filter?: { role?: string; only_unlocked?: boolean };
    },
    @Req() req: AuthenticatedRequest,
  ) {
    const message = (body?.message ?? "").trim();
    if (!message) {
      throw new BadRequestException("message không được rỗng");
    }
    const filter: BroadcastFilter = {};
    if (body?.filter?.role) {
      if (!USER_ROLES.includes(body.filter.role as UserRole)) {
        throw new BadRequestException("filter.role không hợp lệ");
      }
      filter.role = body.filter.role as UserRole;
    }
    if (typeof body?.filter?.only_unlocked === "boolean") {
      filter.only_unlocked = body.filter.only_unlocked;
    }
    const result = await this.broadcastService.sendBroadcast({
      senderUserId: req.session.sub,
      message,
      filter,
    });
    return { success: true, result };
  }

  @Get("broadcasts")
  async listBroadcasts(
    @Query("page") page?: string,
    @Query("limit") limit?: string,
  ) {
    const result = await this.adminService.listBroadcasts({
      page: parseInteger(page, 1),
      limit: parseInteger(limit, 20),
    });
    return { success: true, ...result };
  }

  // ===== Settings =====

  @Get("settings")
  async getSettings() {
    const settings = await this.adminService.getAllSettings();
    return { success: true, settings };
  }

  @Put("settings/:key")
  async setSetting(
    @Param("key") key: string,
    @Body() body: { value?: unknown },
    @Req() req: AuthenticatedRequest,
  ) {
    const value = body?.value;
    if (value === undefined) {
      throw new BadRequestException("value không được undefined");
    }
    const setting = await this.adminService.setSetting(
      key,
      value,
      req.session.sub,
    );
    return { success: true, setting };
  }
}
