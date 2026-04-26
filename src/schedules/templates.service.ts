import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ScheduleTemplate } from "./entities/schedule-template.entity";
import {
  Schedule,
  ScheduleItemType,
  SchedulePriority,
} from "./entities/schedule.entity";

export interface CreateTemplateInput {
  user_id: string;
  name: string;
  item_type?: ScheduleItemType;
  title: string;
  description?: string | null;
  duration_minutes?: number | null;
  default_remind_minutes?: number | null;
  priority?: SchedulePriority;
}

export const TEMPLATE_NAME_REGEX = /^[a-z0-9_-]+$/;
export const MAX_TEMPLATE_NAME_LENGTH = 50;

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(ScheduleTemplate)
    private readonly templateRepository: Repository<ScheduleTemplate>,
  ) {}

  static normalizeName(raw: string): string {
    return raw.trim().toLowerCase();
  }

  static isValidName(name: string): boolean {
    if (name.length === 0 || name.length > MAX_TEMPLATE_NAME_LENGTH) return false;
    return TEMPLATE_NAME_REGEX.test(name);
  }

  async listForUser(userId: string): Promise<ScheduleTemplate[]> {
    return this.templateRepository.find({
      where: { user_id: userId },
      order: { name: "ASC" },
    });
  }

  async findByName(
    userId: string,
    rawName: string,
  ): Promise<ScheduleTemplate | null> {
    const name = TemplatesService.normalizeName(rawName);
    return this.templateRepository.findOne({
      where: { user_id: userId, name },
    });
  }

  async create(input: CreateTemplateInput): Promise<ScheduleTemplate> {
    const name = TemplatesService.normalizeName(input.name);
    const t = this.templateRepository.create({
      user_id: input.user_id,
      name,
      item_type: input.item_type ?? "task",
      title: input.title,
      description: input.description ?? null,
      duration_minutes: input.duration_minutes ?? null,
      default_remind_minutes: input.default_remind_minutes ?? null,
      priority: input.priority ?? "normal",
    });
    return this.templateRepository.save(t);
  }

  /**
   * Tạo template từ Schedule có sẵn — copy các field tĩnh.
   */
  async createFromSchedule(
    userId: string,
    rawName: string,
    schedule: Schedule,
  ): Promise<ScheduleTemplate> {
    const duration =
      schedule.end_time && schedule.start_time
        ? Math.max(
            0,
            Math.round(
              (schedule.end_time.getTime() - schedule.start_time.getTime()) /
                60000,
            ),
          )
        : null;
    const remindMinutes =
      schedule.remind_at && schedule.start_time
        ? Math.max(
            0,
            Math.round(
              (schedule.start_time.getTime() - schedule.remind_at.getTime()) /
                60000,
            ),
          )
        : null;
    return this.create({
      user_id: userId,
      name: rawName,
      item_type: schedule.item_type,
      title: schedule.title,
      description: schedule.description,
      duration_minutes: duration && duration > 0 ? duration : null,
      default_remind_minutes: remindMinutes && remindMinutes > 0 ? remindMinutes : null,
      priority: schedule.priority,
    });
  }

  async deleteByName(userId: string, rawName: string): Promise<boolean> {
    const name = TemplatesService.normalizeName(rawName);
    const result = await this.templateRepository.delete({
      user_id: userId,
      name,
    });
    return (result.affected ?? 0) > 0;
  }

  async existsByName(userId: string, rawName: string): Promise<boolean> {
    const name = TemplatesService.normalizeName(rawName);
    const count = await this.templateRepository.count({
      where: { user_id: userId, name },
    });
    return count > 0;
  }
}
