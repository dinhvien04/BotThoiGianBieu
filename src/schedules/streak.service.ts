import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, IsNull } from "typeorm";
import { Schedule } from "./entities/schedule.entity";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** YYYY-MM-DD theo giờ VN. */
export function toVNDateKey(d: Date): string {
  const t = new Date(d.getTime() + VN_OFFSET_MS);
  const y = t.getUTCFullYear();
  const m = String(t.getUTCMonth() + 1).padStart(2, "0");
  const day = String(t.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Lùi 1 ngày theo VN. */
function previousVNDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() - 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

export interface StreakStats {
  currentStreak: number;
  longestStreak: number;
  daysActive: number;
  totalCompleted: number;
  lastCompletedDate: string | null; // YYYY-MM-DD VN
}

/** Milestones theo current streak để gắn badge. */
export const STREAK_MILESTONES = [365, 100, 30, 14, 7, 3] as const;

export function streakBadge(currentStreak: number): string {
  if (currentStreak >= 365) return "🏆 Truyền kỳ (≥1 năm)";
  if (currentStreak >= 100) return "💎 Kim cương (≥100 ngày)";
  if (currentStreak >= 30) return "🔥 Lửa tháng (≥30 ngày)";
  if (currentStreak >= 14) return "⚡ Hai tuần liên tục";
  if (currentStreak >= 7) return "🌟 Một tuần liền";
  if (currentStreak >= 3) return "✨ Khởi đầu";
  return "";
}

@Injectable()
export class StreakService {
  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepository: Repository<Schedule>,
  ) {}

  async computeStreak(userId: string, now: Date = new Date()): Promise<StreakStats> {
    const completed = await this.scheduleRepository.find({
      where: {
        user_id: userId,
        status: "completed",
        acknowledged_at: Not(IsNull()),
      },
      select: ["id", "acknowledged_at"],
    });

    const totalCompleted = completed.length;
    const dateSet = new Set<string>();
    for (const s of completed) {
      if (s.acknowledged_at) {
        dateSet.add(toVNDateKey(s.acknowledged_at));
      }
    }

    if (dateSet.size === 0) {
      return {
        currentStreak: 0,
        longestStreak: 0,
        daysActive: 0,
        totalCompleted,
        lastCompletedDate: null,
      };
    }

    const sorted = Array.from(dateSet).sort();
    const lastCompletedDate = sorted[sorted.length - 1];

    // Longest streak.
    let longest = 1;
    let run = 1;
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === incrementVNDay(sorted[i - 1])) {
        run += 1;
        if (run > longest) longest = run;
      } else {
        run = 1;
      }
    }

    // Current streak: count back from today (or yesterday) until gap.
    const today = toVNDateKey(now);
    const yesterday = previousVNDay(today);
    let cursor: string;
    let current = 0;
    if (dateSet.has(today)) {
      cursor = today;
    } else if (dateSet.has(yesterday)) {
      cursor = yesterday;
    } else {
      cursor = "";
    }
    while (cursor && dateSet.has(cursor)) {
      current += 1;
      cursor = previousVNDay(cursor);
    }

    return {
      currentStreak: current,
      longestStreak: longest,
      daysActive: dateSet.size,
      totalCompleted,
      lastCompletedDate,
    };
  }
}

function incrementVNDay(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + 1);
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}
