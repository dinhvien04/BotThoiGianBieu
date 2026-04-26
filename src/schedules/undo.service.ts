import { Injectable } from "@nestjs/common";
import { Schedule, ScheduleStatus } from "./entities/schedule.entity";

export interface DeleteUndoEntry {
  kind: "delete";
  schedule: Schedule;
  recordedAt: Date;
}

export interface CompleteUndoEntry {
  kind: "complete";
  scheduleId: number;
  scheduleTitle: string;
  prevStatus: ScheduleStatus;
  prevRemindAt: Date | null;
  prevAcknowledgedAt: Date | null;
  prevEndNotifiedAt: Date | null;
  spawnedNextId: number | null;
  recordedAt: Date;
}

export type UndoEntry = DeleteUndoEntry | CompleteUndoEntry;

const TTL_MS = 10 * 60 * 1000;

/**
 * In-memory undo slot per user. Chỉ giữ thao tác mới nhất; mỗi lần ghi
 * record mới sẽ ghi đè entry cũ. Entry tự hết hạn sau 10 phút.
 */
@Injectable()
export class UndoService {
  private readonly entries = new Map<string, UndoEntry>();

  record(userId: string, entry: UndoEntry): void {
    this.entries.set(userId, entry);
  }

  peek(userId: string, now: Date = new Date()): UndoEntry | null {
    return this.takeIfFresh(userId, now, /* consume */ false);
  }

  pop(userId: string, now: Date = new Date()): UndoEntry | null {
    return this.takeIfFresh(userId, now, /* consume */ true);
  }

  clear(userId: string): void {
    this.entries.delete(userId);
  }

  private takeIfFresh(
    userId: string,
    now: Date,
    consume: boolean,
  ): UndoEntry | null {
    const entry = this.entries.get(userId);
    if (!entry) return null;
    if (now.getTime() - entry.recordedAt.getTime() > TTL_MS) {
      this.entries.delete(userId);
      return null;
    }
    if (consume) this.entries.delete(userId);
    return entry;
  }
}
