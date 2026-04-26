import { SchedulePriority } from "../../schedules/entities/schedule.entity";
import { parsePriority } from "./priority";

export interface PriorityFlagResult {
  /** Args còn lại sau khi đã bóc `--uutien <val>` (giữ nguyên thứ tự). */
  rest: string[];
  /** Priority đã parse, hoặc undefined nếu user không truyền flag. */
  priority?: SchedulePriority;
  /** Message lỗi nếu cờ thiếu giá trị / giá trị không hợp lệ. */
  error?: string;
}

/**
 * Bóc `--uutien <val>` (hoặc `--uutien=<val>` / `--priority <val>`) khỏi
 * `args` và parse thành `SchedulePriority`. Nếu không có cờ → trả `args`
 * nguyên vẹn + priority undefined.
 */
export function extractPriorityFlag(args: string[]): PriorityFlagResult {
  const rest: string[] = [];
  let priority: SchedulePriority | undefined;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    const eqMatch = /^--(uu-?tien|priority)=(.+)$/i.exec(arg);
    if (eqMatch) {
      const value = eqMatch[2];
      const parsed = parsePriority(value);
      if (!parsed) {
        return {
          rest,
          error: `⚠️ Giá trị --uutien không hợp lệ: \`${value}\`. Dùng: cao | vua | thap.`,
        };
      }
      priority = parsed;
      continue;
    }
    if (/^--(uu-?tien|priority)$/i.test(arg)) {
      const next = args[i + 1];
      if (!next) {
        return {
          rest,
          error: `⚠️ Cờ \`--uutien\` cần giá trị. Vd: \`--uutien cao\`.`,
        };
      }
      const parsed = parsePriority(next);
      if (!parsed) {
        return {
          rest,
          error: `⚠️ Giá trị --uutien không hợp lệ: \`${next}\`. Dùng: cao | vua | thap.`,
        };
      }
      priority = parsed;
      i += 1;
      continue;
    }
    rest.push(arg);
  }

  return { rest, priority };
}
