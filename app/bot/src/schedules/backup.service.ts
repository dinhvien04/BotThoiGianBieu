import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Schedule } from "./entities/schedule.entity";
import { Tag } from "./entities/tag.entity";
import { ScheduleTemplate } from "./entities/schedule-template.entity";
import { UserSettings } from "../users/entities/user-settings.entity";

export interface BackupV1 {
  version: 1;
  exported_at: string;
  user_id: string;
  settings: BackupSettings | null;
  tags: BackupTag[];
  templates: BackupTemplate[];
  schedules: BackupSchedule[];
}

export interface BackupSettings {
  timezone: string;
  default_channel_id: string | null;
  default_remind_minutes: number;
  notify_via_dm: boolean;
  notify_via_channel: boolean;
  work_start_hour: number;
  work_end_hour: number;
}

export interface BackupTag {
  id: number;
  name: string;
  color: string | null;
}

export interface BackupTemplate {
  id: number;
  name: string;
  item_type: string;
  title: string;
  description: string | null;
  duration_minutes: number | null;
  default_remind_minutes: number | null;
  priority: string;
}

export interface BackupSchedule {
  id: number;
  item_type: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  priority: string;
  remind_at: string | null;
  recurrence_type: string;
  recurrence_interval: number;
  recurrence_until: string | null;
  recurrence_parent_id: number | null;
  acknowledged_at: string | null;
  tag_names: string[];
  shared_with_user_ids: string[];
}

@Injectable()
export class BackupService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
    @InjectRepository(Tag)
    private readonly tagRepository: Repository<Tag>,
    @InjectRepository(ScheduleTemplate)
    private readonly templateRepository: Repository<ScheduleTemplate>,
    @InjectRepository(UserSettings)
    private readonly settingsRepository: Repository<UserSettings>,
  ) {}

  async buildBackup(userId: string, now: Date = new Date()): Promise<BackupV1> {
    const [schedules, tags, templates, settings] = await Promise.all([
      this.scheduleRepository.find({
        where: { user_id: userId },
        relations: ["tags", "sharedWith"],
        order: { start_time: "ASC" },
      }),
      this.tagRepository.find({
        where: { user_id: userId },
        order: { name: "ASC" },
      }),
      this.templateRepository.find({
        where: { user_id: userId },
        order: { name: "ASC" },
      }),
      this.settingsRepository.findOne({ where: { user_id: userId } }),
    ]);

    return {
      version: 1,
      exported_at: now.toISOString(),
      user_id: userId,
      settings: settings ? this.serializeSettings(settings) : null,
      tags: tags.map((t) => ({
        id: t.id,
        name: t.name,
        color: t.color ?? null,
      })),
      templates: templates.map((t) => this.serializeTemplate(t)),
      schedules: schedules.map((s) => this.serializeSchedule(s)),
    };
  }

  private serializeSettings(s: UserSettings): BackupSettings {
    return {
      timezone: s.timezone,
      default_channel_id: s.default_channel_id,
      default_remind_minutes: s.default_remind_minutes,
      notify_via_dm: s.notify_via_dm,
      notify_via_channel: s.notify_via_channel,
      work_start_hour: s.work_start_hour,
      work_end_hour: s.work_end_hour,
    };
  }

  private serializeTemplate(t: ScheduleTemplate): BackupTemplate {
    return {
      id: t.id,
      name: t.name,
      item_type: t.item_type,
      title: t.title,
      description: t.description,
      duration_minutes: t.duration_minutes,
      default_remind_minutes: t.default_remind_minutes,
      priority: t.priority,
    };
  }

  private serializeSchedule(s: Schedule): BackupSchedule {
    return {
      id: s.id,
      item_type: s.item_type,
      title: s.title,
      description: s.description,
      start_time: s.start_time.toISOString(),
      end_time: s.end_time ? s.end_time.toISOString() : null,
      status: s.status,
      priority: s.priority,
      remind_at: s.remind_at ? s.remind_at.toISOString() : null,
      recurrence_type: s.recurrence_type,
      recurrence_interval: s.recurrence_interval,
      recurrence_until: s.recurrence_until
        ? s.recurrence_until.toISOString()
        : null,
      recurrence_parent_id: s.recurrence_parent_id,
      acknowledged_at: s.acknowledged_at
        ? s.acknowledged_at.toISOString()
        : null,
      tag_names: (s.tags ?? []).map((t) => t.name),
      shared_with_user_ids: (s.sharedWith ?? []).map((u) => u.user_id),
    };
  }
}

export function summarizeBackup(b: BackupV1): string {
  return [
    `Schedules: ${b.schedules.length}`,
    `Tags: ${b.tags.length}`,
    `Templates: ${b.templates.length}`,
    `Settings: ${b.settings ? "yes" : "no"}`,
  ].join(" · ");
}
