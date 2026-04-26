import { SchedulePriority } from "../../schedules/entities/schedule.entity";

/**
 * Options dùng cho dropdown chọn priority trong form (InteractiveBuilder).
 * Thứ tự `low → normal → high` để default `normal` ở giữa.
 */
export const PRIORITY_OPTIONS: Array<{
  label: string;
  value: SchedulePriority;
}> = [
  { label: "🟢 Thấp", value: "low" },
  { label: "🟡 Vừa", value: "normal" },
  { label: "🔴 Cao", value: "high" },
];

/** Emoji badge ngắn để gắn vào digest line. */
export function priorityBadge(priority: SchedulePriority): string {
  switch (priority) {
    case "high":
      return "🔴";
    case "low":
      return "🟢";
    case "normal":
    default:
      return "🟡";
  }
}

/** Label tiếng Việt đầy đủ (dùng cho `*chi-tiet`, summary). */
export function formatPriority(priority: SchedulePriority): string {
  switch (priority) {
    case "high":
      return "🔴 Cao";
    case "low":
      return "🟢 Thấp";
    case "normal":
    default:
      return "🟡 Vừa";
  }
}

/**
 * Parse string user nhập → priority. Chấp nhận VN-friendly inputs
 * (cao/vua/thap, cao/trung-binh/thap, high/normal/low, h/n/l...).
 * Trả `null` nếu không parse được.
 */
export function parsePriority(input: string): SchedulePriority | null {
  if (!input) return null;
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    .replace(/_/g, "");

  switch (normalized) {
    case "high":
    case "h":
    case "cao":
      return "high";
    case "low":
    case "l":
    case "thap":
    case "thấp":
      return "low";
    case "normal":
    case "n":
    case "med":
    case "medium":
    case "vua":
    case "vừa":
    case "trungbinh":
    case "trungbình":
    case "binhthuong":
    case "bìnhthường":
      return "normal";
    default:
      return null;
  }
}
