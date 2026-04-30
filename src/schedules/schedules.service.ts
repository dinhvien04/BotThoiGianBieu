import { Injectable, Logger, Optional } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, ILike, In, IsNull, LessThan, LessThanOrEqual, MoreThanOrEqual, Repository } from 'typeorm';
import {
  RecurrenceType,
  Schedule,
  ScheduleItemType,
  SchedulePriority,
  ScheduleStatus,
} from './entities/schedule.entity';
import { computeNextOccurrence } from '../shared/utils/recurrence';
import { AuditService } from './audit.service';

export interface SearchResult {
  items: Schedule[];
  total: number;
}

export interface CreateScheduleInput {
  user_id: string;
  item_type?: ScheduleItemType;
  title: string;
  description?: string | null;
  start_time: Date;
  end_time?: Date | null;
  remind_at?: Date | null;
  priority?: SchedulePriority;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_until?: Date | null;
  recurrence_parent_id?: number | null;
}

export interface UpdateSchedulePatch {
  item_type?: ScheduleItemType;
  title?: string;
  description?: string | null;
  start_time?: Date;
  end_time?: Date | null;
  status?: ScheduleStatus;
  priority?: SchedulePriority;
  remind_at?: Date | null;
  acknowledged_at?: Date | null;
  end_notified_at?: Date | null;
  is_reminded?: boolean;
  recurrence_type?: RecurrenceType;
  recurrence_interval?: number;
  recurrence_until?: Date | null;
  recurrence_parent_id?: number | null;
}

export interface RecurrencePatch {
  type: RecurrenceType;
  interval?: number;
  until?: Date | null;
}

export interface ScheduleStatistics {
  total: number;
  byStatus: Record<ScheduleStatus, number>;
  byItemType: Record<ScheduleItemType, number>;
  byPriority: Record<SchedulePriority, number>;
  topHours: Array<{ hour: number; count: number }>;
  recurringActiveCount: number;
}

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @Optional()
    private readonly auditService: AuditService | null = null,
  ) {}

  private auditLog(
    scheduleId: number,
    userId: string,
    action:
      | 'create'
      | 'update'
      | 'complete'
      | 'cancel'
      | 'delete'
      | 'restore',
    changes?: Record<string, { from?: unknown; to?: unknown }> | null,
  ): void {
    if (!this.auditService) return;
    void this.auditService.log({
      schedule_id: scheduleId,
      user_id: userId,
      action,
      changes: changes ?? null,
    });
  }

  async create(input: CreateScheduleInput): Promise<Schedule> {
    const schedule = this.scheduleRepository.create({
      user_id: input.user_id,
      item_type: input.item_type ?? 'task',
      title: input.title,
      description: input.description ?? null,
      start_time: input.start_time,
      end_time: input.end_time ?? null,
      remind_at: input.remind_at ?? null,
      is_reminded: false,
      acknowledged_at: null,
      end_notified_at: null,
      status: 'pending',
      priority: input.priority ?? 'normal',
      recurrence_type: input.recurrence_type ?? 'none',
      recurrence_interval: input.recurrence_interval ?? 1,
      recurrence_until: input.recurrence_until ?? null,
      recurrence_parent_id: input.recurrence_parent_id ?? null,
    });

    const saved = await this.scheduleRepository.save(schedule);
    this.logger.log(`Đã tạo schedule #${saved.id} cho user ${saved.user_id}`);
    this.auditLog(saved.id, saved.user_id, 'create');
    return saved;
  }

  findById(id: number, userId?: string): Promise<Schedule | null> {
    return this.scheduleRepository.findOne({
      where: userId ? { id, user_id: userId } : { id },
    });
  }

  findByDateRange(
    userId: string,
    start: Date,
    end: Date,
    options: { includeHidden?: boolean } = {},
  ): Promise<Schedule[]> {
    const where: Record<string, unknown> = {
      user_id: userId,
      start_time: Between(start, end),
    };
    if (!options.includeHidden) where.is_hidden = false;
    return this.scheduleRepository.find({
      where,
      order: { is_pinned: 'DESC', start_time: 'ASC' },
    });
  }

  /**
   * Tìm lịch của user theo từ khoá (case-insensitive, match `title` hoặc
   * `description`). Trả về danh sách đã sắp theo `start_time` tăng dần,
   * có hỗ trợ paginate (limit/offset) và total count.
   */
  async search(
    userId: string,
    keyword: string,
    limit = 10,
    offset = 0,
    options: { includeHidden?: boolean } = {},
  ): Promise<SearchResult> {
    const pattern = `%${keyword}%`;
    const baseTitle: Record<string, unknown> = {
      user_id: userId,
      title: ILike(pattern),
    };
    const baseDesc: Record<string, unknown> = {
      user_id: userId,
      description: ILike(pattern),
    };
    if (!options.includeHidden) {
      baseTitle.is_hidden = false;
      baseDesc.is_hidden = false;
    }

    const [items, total] = await this.scheduleRepository.findAndCount({
      where: [baseTitle, baseDesc],
      order: { is_pinned: 'DESC', start_time: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });

    return { items, total };
  }

  /**
   * Các lịch `pending` có `start_time` từ `now` trở đi, sắp theo giờ bắt đầu
   * tăng dần. Dùng cho `*sap-toi` (next upcoming). Optional `priority` filter
   * cho phép `*sap-toi --uutien cao`.
   */
  findUpcoming(
    userId: string,
    now: Date,
    limit = 5,
    priority?: SchedulePriority,
    options: { includeHidden?: boolean } = {},
  ): Promise<Schedule[]> {
    const where: Record<string, unknown> = {
      user_id: userId,
      status: 'pending',
      start_time: MoreThanOrEqual(now),
    };
    if (priority) where.priority = priority;
    if (!options.includeHidden) where.is_hidden = false;
    return this.scheduleRepository.find({
      where,
      order: { is_pinned: 'DESC', start_time: 'ASC', id: 'ASC' },
      take: limit,
    });
  }

  /**
   * Lịch quá hạn — `pending` + `start_time < now`. User đã miss deadline
   * mà chưa hoàn-thành / huỷ. Sắp theo `start_time` ASC để các lịch quá
   * hạn lâu nhất hiện trên đầu. Có pagination.
   */
  async findOverdue(
    userId: string,
    now: Date,
    limit = 10,
    offset = 0,
    priority?: SchedulePriority,
    options: { includeHidden?: boolean } = {},
  ): Promise<SearchResult> {
    const where: Record<string, unknown> = {
      user_id: userId,
      status: 'pending',
      start_time: LessThan(now),
    };
    if (priority) where.priority = priority;
    if (!options.includeHidden) where.is_hidden = false;
    const [items, total] = await this.scheduleRepository.findAndCount({
      where,
      order: { is_pinned: 'DESC', start_time: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }

  /**
   * Toàn bộ lịch `pending` của user (bất kể start_time đã qua hay chưa), có
   * paginate. Dùng cho `*danh-sach`. Optional `priority` filter.
   */
  async findAllPending(
    userId: string,
    limit = 10,
    offset = 0,
    priority?: SchedulePriority,
    options: { includeHidden?: boolean } = {},
  ): Promise<SearchResult> {
    const where: Record<string, unknown> = { user_id: userId, status: 'pending' };
    if (priority) where.priority = priority;
    if (!options.includeHidden) where.is_hidden = false;
    const [items, total] = await this.scheduleRepository.findAndCount({
      where,
      order: { is_pinned: 'DESC', start_time: 'ASC', id: 'ASC' },
      take: limit,
      skip: offset,
    });

    return { items, total };
  }

  /**
   * Lấy các lịch tới giờ cần nhắc nhưng chưa được user xác nhận.
   * - `remind_at <= now`
   * - `acknowledged_at IS NULL`
   * - `status = 'pending'`
   */
  findDueReminders(now: Date): Promise<Schedule[]> {
    return this.scheduleRepository.find({
      where: {
        remind_at: LessThanOrEqual(now),
        acknowledged_at: IsNull(),
        status: 'pending',
      },
      relations: ['user', 'user.settings', 'sharedWith'],
      order: { remind_at: 'ASC' },
    });
  }

  /**
   * User bấm "Đã nhận" — đánh dấu đã xác nhận, dừng nhắc tiếp.
   * Tuỳ chọn set `markInProgress` để đánh dấu status riêng sau này.
   */
  async acknowledge(id: number, now: Date = new Date()): Promise<boolean> {
    const result = await this.scheduleRepository.update({
      id,
      acknowledged_at: IsNull(),
      status: 'pending',
    }, {
      acknowledged_at: now,
      remind_at: null,
      is_reminded: true,
    });
    return (result.affected ?? 0) > 0;
  }

  /** User bấm "Hoãn X phút" — đẩy `remind_at` về thời điểm sau X phút. */
  async snooze(id: number, minutes: number, now: Date = new Date()): Promise<Date | null> {
    const nextAt = new Date(now.getTime() + minutes * 60 * 1000);
    const result = await this.scheduleRepository.update({
      id,
      acknowledged_at: IsNull(),
      status: 'pending',
    }, {
      remind_at: nextAt,
      is_reminded: false,
    });
    return (result.affected ?? 0) > 0 ? nextAt : null;
  }

  /**
   * Bật lại reminder cho lịch với thời điểm nhắc mới.
   * Reset `acknowledged_at` để cron tiếp tục xử lý.
   */
  async setReminder(
    id: number,
    remindAt: Date,
  ): Promise<void> {
    await this.scheduleRepository.update(id, {
      remind_at: remindAt,
      acknowledged_at: null,
      is_reminded: false,
    });
  }

  /**
   * Tắt reminder start cho lịch.
   * Đánh dấu `acknowledged_at` để cron bỏ qua schedule này.
   */
  async disableReminder(id: number): Promise<void> {
    await this.scheduleRepository.update(id, {
      remind_at: null,
      acknowledged_at: new Date(),
      is_reminded: true,
    });
  }

  /**
   * Sau khi gửi reminder xong — đẩy `remind_at` về future để tránh spam,
   * đồng thời nếu user ignore thì cron sẽ nhắc lại sau `repeatMinutes` phút.
   */
  async rescheduleAfterPing(id: number, repeatMinutes: number, now: Date = new Date()): Promise<void> {
    const nextAt = new Date(now.getTime() + repeatMinutes * 60 * 1000);
    await this.scheduleRepository.update(id, {
      remind_at: nextAt,
      is_reminded: true,
    });
  }

  /**
   * Lấy các lịch tới giờ kết thúc nhưng chưa được notify:
   * - `end_time <= now`
   * - `end_notified_at IS NULL`
   * - `status = 'pending'`
   */
  findDueEndNotifications(now: Date): Promise<Schedule[]> {
    return this.scheduleRepository.find({
      where: {
        end_time: LessThanOrEqual(now),
        end_notified_at: IsNull(),
        status: 'pending',
      },
      relations: ['user', 'user.settings', 'sharedWith'],
      order: { end_time: 'ASC' },
    });
  }

  /** Đánh dấu đã gửi notification kết thúc (chỉ gửi 1 lần). */
  async markEndNotified(id: number, now: Date = new Date()): Promise<void> {
    await this.scheduleRepository.update(id, { end_notified_at: now });
  }

  /**
   * Liệt kê các lịch `pending` của user khớp keyword (title hoặc description).
   * Dùng cho bulk operations. Sắp `start_time` ASC. Tối đa `limit` rows.
   */
  async findPendingByKeyword(
    userId: string,
    keyword: string,
    limit = 100,
  ): Promise<Schedule[]> {
    const pattern = `%${keyword}%`;
    return this.scheduleRepository.find({
      where: [
        { user_id: userId, status: 'pending', title: ILike(pattern) },
        { user_id: userId, status: 'pending', description: ILike(pattern) },
      ],
      order: { start_time: 'ASC', id: 'ASC' },
      take: limit,
    });
  }

  /**
   * Liệt kê các lịch `completed` có `start_time` < `before` của user.
   * Dùng cho `*xoa-completed-truoc`. Sắp `start_time` ASC.
   */
  async findCompletedBefore(
    userId: string,
    before: Date,
    limit = 100,
  ): Promise<Schedule[]> {
    return this.scheduleRepository.find({
      where: {
        user_id: userId,
        status: 'completed',
        start_time: LessThan(before),
      },
      order: { start_time: 'ASC', id: 'ASC' },
      take: limit,
    });
  }

  /**
   * Bulk mark completed cho danh sách scheduleIds (chỉ những lịch thuộc
   * `userId` và `status='pending'` mới bị thay đổi). Trả số rows thực sự
   * đổi. Có audit log per-row qua `markCompleted`.
   */
  async bulkComplete(
    userId: string,
    ids: number[],
    now: Date = new Date(),
  ): Promise<number> {
    if (ids.length === 0) return 0;
    const targets = await this.scheduleRepository.find({
      where: {
        user_id: userId,
        status: 'pending',
        id: In(ids),
      },
    });
    let count = 0;
    for (const s of targets) {
      await this.markCompleted(s.id, now);
      count += 1;
    }
    return count;
  }

  /**
   * Bulk delete cho danh sách scheduleIds (chỉ thuộc `userId`). Trả số rows
   * đã xoá. Có audit log per-row qua `delete`.
   */
  async bulkDelete(userId: string, ids: number[]): Promise<number> {
    if (ids.length === 0) return 0;
    const targets = await this.scheduleRepository.find({
      where: {
        user_id: userId,
        id: In(ids),
      },
    });
    let count = 0;
    for (const s of targets) {
      await this.delete(s.id);
      count += 1;
    }
    return count;
  }

  /**
   * Mark schedule = completed. Đồng thời tắt mọi reminder pending
   * (start ack + end notification).
   */
  async markCompleted(id: number, now: Date = new Date()): Promise<void> {
    const before = await this.findById(id);
    await this.scheduleRepository.update(id, {
      status: 'completed',
      remind_at: null,
      acknowledged_at: now,
      end_notified_at: now,
    });
    if (before) {
      this.auditLog(id, before.user_id, 'complete');
    }
  }

  /** Đặt cờ `is_pinned`. Trả schedule sau update hoặc null nếu không thuộc user. */
  async setPinned(
    userId: string,
    id: number,
    pinned: boolean,
  ): Promise<Schedule | null> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id, user_id: userId },
    });
    if (!schedule) return null;
    if (schedule.is_pinned !== pinned) {
      await this.scheduleRepository.update(id, { is_pinned: pinned });
      schedule.is_pinned = pinned;
    }
    return schedule;
  }

  /** Đặt cờ `is_hidden`. Trả schedule sau update hoặc null nếu không thuộc user. */
  async setHidden(
    userId: string,
    id: number,
    hidden: boolean,
  ): Promise<Schedule | null> {
    const schedule = await this.scheduleRepository.findOne({
      where: { id, user_id: userId },
    });
    if (!schedule) return null;
    if (schedule.is_hidden !== hidden) {
      await this.scheduleRepository.update(id, { is_hidden: hidden });
      schedule.is_hidden = hidden;
    }
    return schedule;
  }

  async updateStatus(id: number, status: Schedule['status']): Promise<void> {
    const before = await this.findById(id);
    await this.scheduleRepository.update(id, { status });
    if (before && before.status !== status) {
      const action =
        status === 'completed'
          ? 'complete'
          : status === 'cancelled'
            ? 'cancel'
            : 'update';
      this.auditLog(id, before.user_id, action, {
        status: { from: before.status, to: status },
      });
    }
  }

  /** Patch các field của schedule. Trả về record sau update. */
  async update(id: number, patch: UpdateSchedulePatch): Promise<Schedule | null> {
    if (Object.keys(patch).length === 0) return this.findById(id);
    const before = await this.findById(id);
    await this.scheduleRepository.update(id, patch);
    const after = await this.findById(id);
    if (before && after) {
      const changes = AuditService.diff(
        before as unknown as Record<string, unknown>,
        after as unknown as Record<string, unknown>,
      );
      if (changes) {
        this.auditLog(id, before.user_id, 'update', changes);
      }
    }
    return after;
  }

  async delete(id: number): Promise<void> {
    const before = await this.findById(id);
    await this.scheduleRepository.delete(id);
    if (before) {
      this.auditLog(id, before.user_id, 'delete');
    }
  }

  /**
   * Insert lại 1 schedule từ snapshot (giữ nguyên `id`). Dùng cho `*hoan-tac`
   * sau khi user xoá nhầm. Nếu id đã tồn tại (vd: undo race), throw.
   */
  async restoreFromSnapshot(snapshot: Schedule): Promise<Schedule> {
    const entity = this.scheduleRepository.create({
      ...snapshot,
    });
    await this.scheduleRepository.insert(entity);
    this.logger.log(
      `Đã khôi phục schedule #${snapshot.id} cho user ${snapshot.user_id}`,
    );
    this.auditLog(snapshot.id, snapshot.user_id, 'restore');
    return entity;
  }

  /**
   * Tổng hợp thống kê lịch của user trong khoảng `[start, end]` (theo
   * `start_time`). Truyền cả `start` và `end` = null để tính trên toàn bộ
   * lịch của user (all-time). Hot hours = top 3 khung giờ (0-23) bận nhất.
   */
  async getStatistics(
    userId: string,
    start: Date | null,
    end: Date | null,
    now: Date = new Date(),
  ): Promise<ScheduleStatistics> {
    const where: Record<string, unknown> = { user_id: userId };
    if (start && end) {
      where.start_time = Between(start, end);
    } else if (start) {
      where.start_time = MoreThanOrEqual(start);
    } else if (end) {
      where.start_time = LessThanOrEqual(end);
    }

    const items = await this.scheduleRepository.find({ where });

    const byStatus: Record<ScheduleStatus, number> = {
      pending: 0,
      completed: 0,
      cancelled: 0,
    };
    const byItemType: Record<ScheduleItemType, number> = {
      task: 0,
      meeting: 0,
      event: 0,
      reminder: 0,
    };
    const byPriority: Record<SchedulePriority, number> = {
      low: 0,
      normal: 0,
      high: 0,
    };
    const hourCounts = new Map<number, number>();

    for (const item of items) {
      byStatus[item.status] = (byStatus[item.status] ?? 0) + 1;
      byItemType[item.item_type] = (byItemType[item.item_type] ?? 0) + 1;
      const p = item.priority ?? 'normal';
      byPriority[p] = (byPriority[p] ?? 0) + 1;
      const hour = item.start_time.getHours();
      hourCounts.set(hour, (hourCounts.get(hour) ?? 0) + 1);
    }

    const topHours = Array.from(hourCounts.entries())
      .map(([hour, count]) => ({ hour, count }))
      .sort((a, b) => b.count - a.count || a.hour - b.hour)
      .slice(0, 3);

    const activeRecurring = await this.scheduleRepository.find({
      where: { user_id: userId, status: 'pending' },
    });
    const recurringActiveCount = activeRecurring.filter(
      (s) =>
        s.recurrence_type !== 'none' &&
        (!s.recurrence_until || s.recurrence_until.getTime() >= now.getTime()),
    ).length;

    return {
      total: items.length,
      byStatus,
      byItemType,
      byPriority,
      topHours,
      recurringActiveCount,
    };
  }

  /**
   * Bật lặp cho một lịch: ghi `recurrence_type`, `recurrence_interval` và
   * `recurrence_until` (tuỳ chọn). Không tự sinh instance kế tiếp ngay —
   * việc đó xảy ra khi lịch hiện tại được hoàn thành.
   */
  async setRecurrence(id: number, patch: RecurrencePatch): Promise<Schedule | null> {
    await this.scheduleRepository.update(id, {
      recurrence_type: patch.type,
      recurrence_interval: patch.interval ?? 1,
      recurrence_until: patch.until ?? null,
    });
    return this.findById(id);
  }

  /**
   * Tắt lặp cho một lịch: đặt `recurrence_type='none'`. Giữ nguyên các field
   * khác và cả `recurrence_parent_id` (để truy vết series cũ nếu cần).
   */
  async clearRecurrence(id: number): Promise<Schedule | null> {
    await this.scheduleRepository.update(id, {
      recurrence_type: 'none',
      recurrence_interval: 1,
      recurrence_until: null,
    });
    return this.findById(id);
  }

  /**
   * Nếu schedule có lặp, tạo row kế tiếp với `start_time` đẩy theo rule.
   * Trả về lịch mới được tạo, hoặc `null` nếu không cần (type='none', đã
   * hết recurrence_until, hoặc input thiếu dữ liệu).
   */
  async spawnNextIfRecurring(
    source: Schedule,
    now: Date = new Date(),
  ): Promise<Schedule | null> {
    if (!source || source.recurrence_type === 'none') return null;

    const nextStart = computeNextOccurrence(
      source.start_time,
      source.recurrence_type,
      source.recurrence_interval,
    );
    if (!nextStart) return null;

    // Nếu chuỗi đã hết hạn → dừng
    if (source.recurrence_until && nextStart.getTime() > source.recurrence_until.getTime()) {
      this.logger.log(
        `↪️ Series #${source.recurrence_parent_id ?? source.id} đã hết hạn, không sinh instance mới.`,
      );
      return null;
    }

    // Delta cũ giữa start → end và start → remind để shift theo cùng offset
    const nextEnd = source.end_time
      ? new Date(nextStart.getTime() + (source.end_time.getTime() - source.start_time.getTime()))
      : null;

    // remind_at của instance mới: nếu instance cũ có remind trước start_time X phút
    // thì instance mới cũng remind trước X phút. Nếu remind_at đã loạn/ở quá khứ
    // so với next_start, fallback = null (user có thể đặt lại bằng *nhac).
    const remindOffset =
      source.remind_at && source.start_time.getTime() > source.remind_at.getTime()
        ? source.start_time.getTime() - source.remind_at.getTime()
        : null;
    let nextRemindAt: Date | null = null;
    if (remindOffset !== null) {
      const candidate = new Date(nextStart.getTime() - remindOffset);
      // Đẩy lên hiện tại nếu đã qua
      nextRemindAt = candidate.getTime() > now.getTime() ? candidate : new Date(now);
    }

    const created = await this.create({
      user_id: source.user_id,
      item_type: source.item_type,
      title: source.title,
      description: source.description,
      start_time: nextStart,
      end_time: nextEnd,
      remind_at: nextRemindAt,
      priority: source.priority,
      recurrence_type: source.recurrence_type,
      recurrence_interval: source.recurrence_interval,
      recurrence_until: source.recurrence_until,
      recurrence_parent_id: source.recurrence_parent_id ?? source.id,
    });

    this.logger.log(
      `🔁 Đã sinh instance mới #${created.id} cho series (root #${source.recurrence_parent_id ?? source.id}).`,
    );
    return created;
  }
}
