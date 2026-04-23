import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, IsNull, LessThanOrEqual, Repository } from 'typeorm';
import { Schedule, ScheduleItemType } from './entities/schedule.entity';

export interface CreateScheduleInput {
  user_id: string;
  item_type?: ScheduleItemType;
  title: string;
  description?: string | null;
  start_time: Date;
  end_time?: Date | null;
  remind_at?: Date | null;
}

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

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
    });

    const saved = await this.scheduleRepository.save(schedule);
    this.logger.log(`Đã tạo schedule #${saved.id} cho user ${saved.user_id}`);
    return saved;
  }

  findById(id: number, userId?: string): Promise<Schedule | null> {
    return this.scheduleRepository.findOne({
      where: userId ? { id, user_id: userId } : { id },
    });
  }

  findByDateRange(userId: string, start: Date, end: Date): Promise<Schedule[]> {
    return this.scheduleRepository.find({
      where: {
        user_id: userId,
        start_time: Between(start, end),
      },
      order: { start_time: 'ASC' },
    });
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
      relations: ['user', 'user.settings'],
      order: { remind_at: 'ASC' },
    });
  }

  /**
   * User bấm "Đã nhận" — đánh dấu đã xác nhận, dừng nhắc tiếp.
   * Tuỳ chọn set `markInProgress` để đánh dấu status riêng sau này.
   */
  async acknowledge(id: number, now: Date = new Date()): Promise<void> {
    await this.scheduleRepository.update(id, {
      acknowledged_at: now,
      remind_at: null,
      is_reminded: true,
    });
  }

  /** User bấm "Hoãn X phút" — đẩy `remind_at` về thời điểm sau X phút. */
  async snooze(id: number, minutes: number, now: Date = new Date()): Promise<Date> {
    const nextAt = new Date(now.getTime() + minutes * 60 * 1000);
    await this.scheduleRepository.update(id, {
      remind_at: nextAt,
      is_reminded: false,
    });
    return nextAt;
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
      relations: ['user', 'user.settings'],
      order: { end_time: 'ASC' },
    });
  }

  /** Đánh dấu đã gửi notification kết thúc (chỉ gửi 1 lần). */
  async markEndNotified(id: number, now: Date = new Date()): Promise<void> {
    await this.scheduleRepository.update(id, { end_notified_at: now });
  }

  /**
   * Mark schedule = completed. Đồng thời tắt mọi reminder pending
   * (start ack + end notification).
   */
  async markCompleted(id: number, now: Date = new Date()): Promise<void> {
    await this.scheduleRepository.update(id, {
      status: 'completed',
      remind_at: null,
      acknowledged_at: now,
      end_notified_at: now,
    });
  }

  async updateStatus(id: number, status: Schedule['status']): Promise<void> {
    await this.scheduleRepository.update(id, { status });
  }

  async delete(id: number): Promise<void> {
    await this.scheduleRepository.delete(id);
  }
}
