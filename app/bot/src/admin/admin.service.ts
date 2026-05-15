import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { User, UserRole } from "../users/entities/user.entity";
import { Schedule } from "../schedules/entities/schedule.entity";
import { ScheduleAuditLog } from "../schedules/entities/schedule-audit-log.entity";
import { SystemSetting } from "./entities/system-setting.entity";
import { Broadcast } from "./entities/broadcast.entity";

export interface AdminUserListItem {
  user_id: string;
  username: string | null;
  display_name: string | null;
  role: UserRole;
  is_locked: boolean;
  created_at: Date;
  updated_at: Date;
  schedule_count: number;
}

export interface AdminUserListResult {
  items: AdminUserListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminScheduleListItem {
  id: number;
  user_id: string;
  user_display_name: string | null;
  user_username: string | null;
  title: string;
  status: string;
  priority: string;
  start_time: Date;
  end_time: Date | null;
  created_at: Date;
}

export interface AdminScheduleListResult {
  items: AdminScheduleListItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminAuditLogItem {
  id: string;
  schedule_id: number;
  user_id: string;
  user_display_name: string | null;
  action: string;
  changes: unknown;
  created_at: Date;
}

export interface AdminAuditListResult {
  items: AdminAuditLogItem[];
  total: number;
  page: number;
  limit: number;
}

export interface AdminDashboardStats {
  total_users: number;
  total_admins: number;
  locked_users: number;
  total_schedules: number;
  schedules_pending: number;
  schedules_completed: number;
  new_users_today: number;
  new_schedules_today: number;
  signups_last_30_days: Array<{ date: string; count: number }>;
  schedules_last_30_days: Array<{ date: string; count: number }>;
}

export interface BroadcastFilter {
  role?: UserRole;
  only_unlocked?: boolean;
}

export interface BroadcastRecord {
  id: string;
  sender_user_id: string;
  message: string;
  recipient_filter: Record<string, unknown> | null;
  total_recipients: number;
  success_count: number;
  failed_count: number;
  created_at: Date;
}

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(ScheduleAuditLog)
    private readonly auditRepository: Repository<ScheduleAuditLog>,
    @InjectRepository(SystemSetting)
    private readonly settingRepository: Repository<SystemSetting>,
    @InjectRepository(Broadcast)
    private readonly broadcastRepository: Repository<Broadcast>,
  ) {}

  // ===== Dashboard =====

  async getDashboardStats(): Promise<AdminDashboardStats> {
    const [
      total_users,
      total_admins,
      locked_users,
      total_schedules,
      schedules_pending,
      schedules_completed,
    ] = await Promise.all([
      this.userRepository.count(),
      this.userRepository.count({ where: { role: "admin" } }),
      this.userRepository.count({ where: { is_locked: true } }),
      this.scheduleRepository.count(),
      this.scheduleRepository.count({ where: { status: "pending" } }),
      this.scheduleRepository.count({ where: { status: "completed" } }),
    ]);

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const new_users_today = await this.userRepository
      .createQueryBuilder("u")
      .where("u.created_at >= :today", { today: startOfToday })
      .getCount();
    const new_schedules_today = await this.scheduleRepository
      .createQueryBuilder("s")
      .where("s.created_at >= :today", { today: startOfToday })
      .getCount();

    const signups_last_30_days = await this.countByDayLast30("users", "created_at");
    const schedules_last_30_days = await this.countByDayLast30(
      "schedules",
      "created_at",
    );

    return {
      total_users,
      total_admins,
      locked_users,
      total_schedules,
      schedules_pending,
      schedules_completed,
      new_users_today,
      new_schedules_today,
      signups_last_30_days,
      schedules_last_30_days,
    };
  }

  private async countByDayLast30(
    tableName: string,
    columnName: string,
  ): Promise<Array<{ date: string; count: number }>> {
    const rows: Array<{ date: string; count: string | number }> = await this
      .userRepository.manager.query(
        `SELECT to_char(${columnName} AT TIME ZONE 'Asia/Ho_Chi_Minh', 'YYYY-MM-DD') AS date,
                COUNT(*)::int AS count
         FROM ${tableName}
         WHERE ${columnName} >= NOW() - INTERVAL '30 days'
         GROUP BY 1
         ORDER BY 1 ASC`,
      );
    return rows.map((r) => ({
      date: String(r.date),
      count: Number(r.count),
    }));
  }

  // ===== Users =====

  async listUsers(opts: {
    page: number;
    limit: number;
    search?: string;
    role?: UserRole;
    locked?: boolean;
  }): Promise<AdminUserListResult> {
    const qb = this.userRepository
      .createQueryBuilder("u")
      .leftJoin("schedules", "s", "s.user_id = u.user_id")
      .select("u.user_id", "user_id")
      .addSelect("u.username", "username")
      .addSelect("u.display_name", "display_name")
      .addSelect("u.role", "role")
      .addSelect("u.is_locked", "is_locked")
      .addSelect("u.created_at", "created_at")
      .addSelect("u.updated_at", "updated_at")
      .addSelect("COUNT(s.id)", "schedule_count")
      .groupBy("u.user_id")
      .orderBy("u.created_at", "DESC");

    if (opts.search) {
      const term = `%${opts.search}%`;
      qb.andWhere(
        new Brackets((sub) => {
          sub
            .where("u.user_id ILIKE :term", { term })
            .orWhere("u.username ILIKE :term", { term })
            .orWhere("u.display_name ILIKE :term", { term });
        }),
      );
    }
    if (opts.role) {
      qb.andWhere("u.role = :role", { role: opts.role });
    }
    if (typeof opts.locked === "boolean") {
      qb.andWhere("u.is_locked = :locked", { locked: opts.locked });
    }

    const limit = Math.min(100, Math.max(1, opts.limit));
    const page = Math.max(1, opts.page);
    qb.offset((page - 1) * limit).limit(limit);

    const rows = await qb.getRawMany<{
      user_id: string;
      username: string | null;
      display_name: string | null;
      role: UserRole;
      is_locked: boolean;
      created_at: Date;
      updated_at: Date;
      schedule_count: string | number;
    }>();

    const countQb = this.userRepository.createQueryBuilder("u");
    if (opts.search) {
      const term = `%${opts.search}%`;
      countQb.andWhere(
        new Brackets((sub) => {
          sub
            .where("u.user_id ILIKE :term", { term })
            .orWhere("u.username ILIKE :term", { term })
            .orWhere("u.display_name ILIKE :term", { term });
        }),
      );
    }
    if (opts.role) {
      countQb.andWhere("u.role = :role", { role: opts.role });
    }
    if (typeof opts.locked === "boolean") {
      countQb.andWhere("u.is_locked = :locked", { locked: opts.locked });
    }
    const total = await countQb.getCount();

    return {
      items: rows.map((r) => ({
        user_id: r.user_id,
        username: r.username,
        display_name: r.display_name,
        role: r.role,
        is_locked: Boolean(r.is_locked),
        created_at: r.created_at,
        updated_at: r.updated_at,
        schedule_count: Number(r.schedule_count),
      })),
      total,
      page,
      limit,
    };
  }

  async getUserDetail(userId: string): Promise<{
    user: User;
    schedule_count: number;
    pending_count: number;
    completed_count: number;
  }> {
    const user = await this.userRepository.findOne({
      where: { user_id: userId },
      relations: ["settings"],
    });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    const [schedule_count, pending_count, completed_count] = await Promise.all([
      this.scheduleRepository.count({ where: { user_id: userId } }),
      this.scheduleRepository.count({ where: { user_id: userId, status: "pending" } }),
      this.scheduleRepository.count({
        where: { user_id: userId, status: "completed" },
      }),
    ]);
    return { user, schedule_count, pending_count, completed_count };
  }

  async setRole(userId: string, role: UserRole): Promise<User> {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    user.role = role;
    await this.userRepository.save(user);
    this.logger.log(`User ${userId} role -> ${role}`);
    return user;
  }

  async setLocked(userId: string, locked: boolean): Promise<User> {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    user.is_locked = locked;
    await this.userRepository.save(user);
    this.logger.log(`User ${userId} locked -> ${locked}`);
    return user;
  }

  /**
   * Xoá user + cascade dữ liệu liên quan. Vì một số bảng (`schedule_audit_logs`)
   * không có FK, ta xoá thủ công trước khi xoá user.
   */
  async deleteUser(userId: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { user_id: userId } });
    if (!user) {
      throw new NotFoundException("User not found");
    }
    await this.userRepository.manager.transaction(async (m) => {
      await m.query(`DELETE FROM schedule_audit_logs WHERE user_id = $1`, [userId]);
      await m.query(`DELETE FROM schedules WHERE user_id = $1`, [userId]);
      await m.query(`DELETE FROM user_settings WHERE user_id = $1`, [userId]);
      await m.delete(User, { user_id: userId });
    });
    this.logger.log(`User ${userId} deleted by admin`);
  }

  // ===== Schedules =====

  async listSchedules(opts: {
    page: number;
    limit: number;
    search?: string;
    status?: string;
    user_id?: string;
  }): Promise<AdminScheduleListResult> {
    const qb = this.scheduleRepository
      .createQueryBuilder("s")
      .leftJoin("users", "u", "u.user_id = s.user_id")
      .select("s.id", "id")
      .addSelect("s.user_id", "user_id")
      .addSelect("u.display_name", "user_display_name")
      .addSelect("u.username", "user_username")
      .addSelect("s.title", "title")
      .addSelect("s.status", "status")
      .addSelect("s.priority", "priority")
      .addSelect("s.start_time", "start_time")
      .addSelect("s.end_time", "end_time")
      .addSelect("s.created_at", "created_at")
      .orderBy("s.created_at", "DESC");

    if (opts.search) {
      qb.andWhere("s.title ILIKE :term", { term: `%${opts.search}%` });
    }
    if (opts.status) {
      qb.andWhere("s.status = :status", { status: opts.status });
    }
    if (opts.user_id) {
      qb.andWhere("s.user_id = :uid", { uid: opts.user_id });
    }

    const limit = Math.min(100, Math.max(1, opts.limit));
    const page = Math.max(1, opts.page);

    const total = await qb.clone().select("COUNT(*)", "cnt").getRawOne<{
      cnt: string | number;
    }>();
    qb.offset((page - 1) * limit).limit(limit);
    const rows = await qb.getRawMany<{
      id: number;
      user_id: string;
      user_display_name: string | null;
      user_username: string | null;
      title: string;
      status: string;
      priority: string;
      start_time: Date;
      end_time: Date | null;
      created_at: Date;
    }>();

    return {
      items: rows.map((r) => ({
        id: Number(r.id),
        user_id: r.user_id,
        user_display_name: r.user_display_name,
        user_username: r.user_username,
        title: r.title,
        status: r.status,
        priority: r.priority,
        start_time: r.start_time,
        end_time: r.end_time,
        created_at: r.created_at,
      })),
      total: Number(total?.cnt ?? 0),
      page,
      limit,
    };
  }

  async deleteSchedule(scheduleId: number): Promise<void> {
    const found = await this.scheduleRepository.findOne({
      where: { id: scheduleId },
    });
    if (!found) {
      throw new NotFoundException("Schedule not found");
    }
    await this.scheduleRepository.delete({ id: scheduleId });
    this.logger.log(`Schedule ${scheduleId} deleted by admin`);
  }

  // ===== Audit log =====

  async listAuditLogs(opts: {
    page: number;
    limit: number;
    user_id?: string;
    action?: string;
    schedule_id?: number;
  }): Promise<AdminAuditListResult> {
    const qb = this.auditRepository
      .createQueryBuilder("a")
      .leftJoin("users", "u", "u.user_id = a.user_id")
      .select("a.id", "id")
      .addSelect("a.schedule_id", "schedule_id")
      .addSelect("a.user_id", "user_id")
      .addSelect("u.display_name", "user_display_name")
      .addSelect("a.action", "action")
      .addSelect("a.changes", "changes")
      .addSelect("a.created_at", "created_at")
      .orderBy("a.created_at", "DESC");

    if (opts.user_id) {
      qb.andWhere("a.user_id = :uid", { uid: opts.user_id });
    }
    if (opts.action) {
      qb.andWhere("a.action = :action", { action: opts.action });
    }
    if (typeof opts.schedule_id === "number" && Number.isFinite(opts.schedule_id)) {
      qb.andWhere("a.schedule_id = :sid", { sid: opts.schedule_id });
    }

    const limit = Math.min(100, Math.max(1, opts.limit));
    const page = Math.max(1, opts.page);

    const totalRow = await qb
      .clone()
      .select("COUNT(*)", "cnt")
      .getRawOne<{ cnt: string | number }>();
    qb.offset((page - 1) * limit).limit(limit);
    const rows = await qb.getRawMany<{
      id: string;
      schedule_id: number;
      user_id: string;
      user_display_name: string | null;
      action: string;
      changes: unknown;
      created_at: Date;
    }>();

    return {
      items: rows.map((r) => ({
        id: String(r.id),
        schedule_id: Number(r.schedule_id),
        user_id: r.user_id,
        user_display_name: r.user_display_name,
        action: r.action,
        changes: r.changes,
        created_at: r.created_at,
      })),
      total: Number(totalRow?.cnt ?? 0),
      page,
      limit,
    };
  }

  // ===== Settings =====

  async getAllSettings(): Promise<Record<string, unknown>> {
    const rows = await this.settingRepository.find();
    const result: Record<string, unknown> = {};
    for (const row of rows) {
      result[row.key] = row.value;
    }
    return result;
  }

  async getSetting<T = unknown>(key: string): Promise<T | null> {
    const row = await this.settingRepository.findOne({ where: { key } });
    return row ? (row.value as T) : null;
  }

  async setSetting(
    key: string,
    value: unknown,
    updatedBy: string,
  ): Promise<SystemSetting> {
    const existing = await this.settingRepository.findOne({ where: { key } });
    if (existing) {
      existing.value = value;
      existing.updated_by = updatedBy;
      await this.settingRepository.save(existing);
      return existing;
    }
    const created = this.settingRepository.create({
      key,
      value,
      updated_by: updatedBy,
    });
    return this.settingRepository.save(created);
  }

  // ===== Broadcast =====

  /**
   * Trả về danh sách user thoả filter (mặc định = tất cả user chưa khoá).
   * Dùng cho broadcast.
   */
  async findBroadcastRecipients(filter: BroadcastFilter): Promise<User[]> {
    const where: Record<string, unknown> = {};
    if (filter.role) {
      where.role = filter.role;
    }
    if (filter.only_unlocked !== false) {
      where.is_locked = false;
    }
    return this.userRepository.find({ where });
  }

  async recordBroadcast(input: {
    sender_user_id: string;
    message: string;
    recipient_filter: BroadcastFilter | null;
    total: number;
    success: number;
    failed: number;
  }): Promise<Broadcast> {
    const broadcast = this.broadcastRepository.create({
      sender_user_id: input.sender_user_id,
      message: input.message,
      recipient_filter: input.recipient_filter
        ? (input.recipient_filter as unknown as Record<string, unknown>)
        : null,
      total_recipients: input.total,
      success_count: input.success,
      failed_count: input.failed,
    });
    return this.broadcastRepository.save(broadcast);
  }

  async listBroadcasts(opts: {
    page: number;
    limit: number;
  }): Promise<{
    items: BroadcastRecord[];
    total: number;
    page: number;
    limit: number;
  }> {
    const limit = Math.min(100, Math.max(1, opts.limit));
    const page = Math.max(1, opts.page);
    const [rows, total] = await this.broadcastRepository.findAndCount({
      order: { created_at: "DESC" },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      items: rows.map((r) => ({
        id: String(r.id),
        sender_user_id: r.sender_user_id,
        message: r.message,
        recipient_filter: r.recipient_filter,
        total_recipients: r.total_recipients,
        success_count: r.success_count,
        failed_count: r.failed_count,
        created_at: r.created_at,
      })),
      total,
      page,
      limit,
    };
  }

}
