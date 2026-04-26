import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  AuditAction,
  AuditChanges,
  ScheduleAuditLog,
} from "./entities/schedule-audit-log.entity";

export interface LogInput {
  schedule_id: number;
  user_id: string;
  action: AuditAction;
  changes?: AuditChanges;
}

export interface AuditPage {
  items: ScheduleAuditLog[];
  total: number;
}

@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(
    @InjectRepository(ScheduleAuditLog)
    private readonly auditRepository: Repository<ScheduleAuditLog>,
  ) {}

  /**
   * Best-effort log. Errors không nên propagate ra — audit log không
   * được phép làm fail business logic.
   */
  async log(input: LogInput): Promise<void> {
    try {
      const entity = this.auditRepository.create({
        schedule_id: input.schedule_id,
        user_id: input.user_id,
        action: input.action,
        changes: input.changes ?? null,
      });
      await this.auditRepository.save(entity);
    } catch (err) {
      this.logger.error(
        `Audit log failed for schedule #${input.schedule_id}/${input.action}: ${
          err instanceof Error ? err.message : String(err)
        }`,
      );
    }
  }

  async findBySchedule(
    scheduleId: number,
    limit = 10,
    offset = 0,
  ): Promise<AuditPage> {
    const [items, total] = await this.auditRepository.findAndCount({
      where: { schedule_id: scheduleId },
      order: { created_at: "DESC", id: "DESC" },
      take: limit,
      skip: offset,
    });
    return { items, total };
  }

  /**
   * Tính diff giữa 2 partial objects. Trả về object chỉ chứa các field
   * khác nhau với cấu trúc `{ from, to }`. Bỏ qua các field hệ thống
   * như `updated_at`.
   */
  static diff(
    before: Record<string, unknown>,
    after: Record<string, unknown>,
    ignoreKeys: ReadonlySet<string> = new Set(["updated_at", "created_at"]),
  ): AuditChanges {
    const changes: AuditChanges = {};
    const keys = new Set<string>([
      ...Object.keys(before),
      ...Object.keys(after),
    ]);
    for (const key of keys) {
      if (ignoreKeys.has(key)) continue;
      const a = AuditService.normalize(before[key]);
      const b = AuditService.normalize(after[key]);
      if (a !== b) {
        changes![key] = { from: before[key], to: after[key] };
      }
    }
    return Object.keys(changes ?? {}).length > 0 ? changes : null;
  }

  private static normalize(v: unknown): unknown {
    if (v instanceof Date) return v.toISOString();
    if (v === null || v === undefined) return null;
    if (typeof v === "object") return JSON.stringify(v);
    return v;
  }
}
