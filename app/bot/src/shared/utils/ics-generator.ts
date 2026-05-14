import { Schedule } from "../../schedules/entities/schedule.entity";

export interface IcsOptions {
  prodId?: string;
  calendarName?: string;
}

const DEFAULT_PROD_ID = "-//BotThoiGianBieu//Mezon Schedule Bot//VI";

/**
 * Sinh nội dung file `.ics` (RFC 5545) cho danh sách schedules.
 *
 * - Tất cả thời gian được encode dạng UTC (`YYYYMMDDTHHMMSSZ`) — tương
 *   thích với Google Calendar / Apple Calendar.
 * - Nếu schedule không có `end_time`, mặc định event dài 1 giờ.
 * - Recurring (daily/weekly/monthly) được encode bằng `RRULE`.
 * - Status mapping: pending→TENTATIVE, completed→CONFIRMED, cancelled→CANCELLED.
 */
export function generateIcs(
  schedules: Schedule[],
  opts: IcsOptions = {},
): string {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:${opts.prodId ?? DEFAULT_PROD_ID}`,
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];
  if (opts.calendarName) {
    lines.push(`X-WR-CALNAME:${escapeText(opts.calendarName)}`);
  }

  const now = formatUtc(new Date());
  for (const schedule of schedules) {
    lines.push(...buildEvent(schedule, now));
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}

function buildEvent(schedule: Schedule, dtstamp: string): string[] {
  const start = schedule.start_time;
  const end = schedule.end_time ?? new Date(start.getTime() + 60 * 60 * 1000);

  const out: string[] = [
    "BEGIN:VEVENT",
    `UID:schedule-${schedule.id}@bot-thoi-gian-bieu`,
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${formatUtc(start)}`,
    `DTEND:${formatUtc(end)}`,
    `SUMMARY:${escapeText(schedule.title)}`,
  ];

  if (schedule.description) {
    out.push(`DESCRIPTION:${escapeText(schedule.description)}`);
  }

  out.push(`STATUS:${mapStatus(schedule.status)}`);

  const priority = mapPriority(schedule.priority);
  if (priority !== null) {
    out.push(`PRIORITY:${priority}`);
  }

  const rrule = buildRrule(schedule);
  if (rrule) out.push(rrule);

  if (schedule.remind_at) {
    const offsetMin = Math.round(
      (schedule.start_time.getTime() - schedule.remind_at.getTime()) / 60000,
    );
    if (offsetMin > 0) {
      out.push(
        "BEGIN:VALARM",
        "ACTION:DISPLAY",
        `DESCRIPTION:${escapeText(schedule.title)}`,
        `TRIGGER:-PT${offsetMin}M`,
        "END:VALARM",
      );
    }
  }

  out.push("END:VEVENT");
  return out;
}

function buildRrule(schedule: Schedule): string | null {
  if (!schedule.recurrence_type || schedule.recurrence_type === "none") {
    return null;
  }
  const freq =
    schedule.recurrence_type === "daily"
      ? "DAILY"
      : schedule.recurrence_type === "weekly"
        ? "WEEKLY"
        : "MONTHLY";
  const parts = [`FREQ=${freq}`];
  const interval = schedule.recurrence_interval ?? 1;
  if (interval > 1) parts.push(`INTERVAL=${interval}`);
  if (schedule.recurrence_until) {
    parts.push(`UNTIL=${formatUtc(schedule.recurrence_until)}`);
  }
  return `RRULE:${parts.join(";")}`;
}

function mapStatus(status: Schedule["status"]): string {
  switch (status) {
    case "completed":
      return "CONFIRMED";
    case "cancelled":
      return "CANCELLED";
    case "pending":
    default:
      return "TENTATIVE";
  }
}

function mapPriority(priority: Schedule["priority"] | undefined): number | null {
  switch (priority) {
    case "high":
      return 1;
    case "normal":
      return 5;
    case "low":
      return 9;
    default:
      return null;
  }
}

/**
 * RFC 5545 escape: backslash → `\\`, comma → `\,`, semicolon → `\;`,
 * newline → `\n`. Ký tự khác giữ nguyên.
 */
function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function formatUtc(date: Date): string {
  const pad = (v: number, n = 2): string => v.toString().padStart(n, "0");
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  );
}
