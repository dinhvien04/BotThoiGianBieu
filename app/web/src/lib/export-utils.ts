import type { Schedule, ScheduleStats, StreakStats } from "./api";

export interface ScheduleImportInput {
  title: string;
  description?: string;
  item_type?: string;
  start_time: string;
  end_time?: string;
  status?: string;
  priority?: string;
  remind_at?: string;
  recurrence_type?: string;
  recurrence_interval?: number;
  recurrence_until?: string;
}

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  const safeText = /^\s*[=+\-@]/.test(text) ? `'${text}` : text;
  if (/[",\n\r]/.test(safeText)) {
    return `"${safeText.replace(/"/g, '""')}"`;
  }
  return safeText;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1];

    if (quoted) {
      if (ch === '"' && next === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (ch !== "\r") {
      cell += ch;
    }
  }

  row.push(cell);
  if (row.some((item) => item.trim() !== "")) rows.push(row);
  return rows;
}

function normalizeHeader(value: string): string {
  return value.trim().replace(/^\uFEFF/, "").toLowerCase();
}

function isValidDateString(value: string | undefined): value is string {
  return Boolean(value && !Number.isNaN(new Date(value).getTime()));
}

function isValidScheduleStatus(value: string | undefined): value is string {
  return value === "pending" || value === "completed" || value === "cancelled";
}

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseOptionalPositiveInteger(value: string | undefined): number | undefined {
  const parsed = parseOptionalNumber(value);
  return parsed && Number.isInteger(parsed) && parsed >= 1 ? parsed : undefined;
}

function formatIcsDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string | null | undefined): string {
  return (value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/\r/g, "")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function unescapeIcsText(value: string): string {
  return value
    .replace(/\\n/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseIcsDate(value: string): string | undefined {
  const trimmed = value.trim();
  if (/^\d{8}$/.test(trimmed)) {
    return `${trimmed.slice(0, 4)}-${trimmed.slice(4, 6)}-${trimmed.slice(6, 8)}T00:00:00.000Z`;
  }
  const match = trimmed.match(/^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/);
  if (!match) return undefined;
  const [, year, month, day, hour, minute, second, zulu] = match;
  const iso = `${year}-${month}-${day}T${hour}:${minute}:${second}${zulu ? ".000Z" : ""}`;
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function mapScheduleStatusToIcs(status: string | null | undefined): string {
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

function mapSchedulePriorityToIcs(priority: string | null | undefined): number | null {
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

function mapIcsPriorityToSchedule(priority: string | undefined): string {
  const parsed = parseOptionalNumber(priority);
  if (!parsed) return "normal";
  if (parsed <= 4) return "high";
  if (parsed >= 6) return "low";
  return "normal";
}

function mapIcsStatusToSchedule(status: string | undefined, focusFlowStatus: string | undefined): string | undefined {
  if (isValidScheduleStatus(focusFlowStatus)) return focusFlowStatus;
  switch (status?.toUpperCase()) {
    case "CANCELLED":
      return "cancelled";
    case "TENTATIVE":
      return "pending";
    default:
      return undefined;
  }
}

function formatIcsAlarmTrigger(startTime: string, remindAt: string | null | undefined): string | null {
  if (!remindAt) return null;
  const start = new Date(startTime);
  const reminder = new Date(remindAt);
  if (Number.isNaN(start.getTime()) || Number.isNaN(reminder.getTime())) return null;
  const diffSeconds = Math.round((start.getTime() - reminder.getTime()) / 1000);
  if (diffSeconds <= 0) return null;

  const days = Math.floor(diffSeconds / 86400);
  const hours = Math.floor((diffSeconds % 86400) / 3600);
  const minutes = Math.floor((diffSeconds % 3600) / 60);
  const seconds = diffSeconds % 60;
  const timeParts = [
    hours ? `${hours}H` : "",
    minutes ? `${minutes}M` : "",
    seconds ? `${seconds}S` : "",
  ].join("");

  return `-P${days ? `${days}D` : ""}${timeParts ? `T${timeParts}` : ""}`;
}

function parseIcsAlarmReminder(startTime: string, trigger: string | undefined): string | undefined {
  if (!trigger?.startsWith("-P")) return undefined;
  const match = trigger.match(/^-P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
  if (!match) return undefined;
  const [, days, hours, minutes, seconds] = match;
  const durationMs =
    ((Number(days ?? 0) * 24 * 60 * 60) +
      (Number(hours ?? 0) * 60 * 60) +
      (Number(minutes ?? 0) * 60) +
      Number(seconds ?? 0)) *
    1000;
  if (durationMs <= 0) return undefined;
  const start = new Date(startTime);
  if (Number.isNaN(start.getTime())) return undefined;
  return new Date(start.getTime() - durationMs).toISOString();
}

function buildIcsRrule(schedule: Schedule): string | null {
  if (!schedule.recurrence_type || schedule.recurrence_type === "none") return null;
  const freq =
    schedule.recurrence_type === "daily"
      ? "DAILY"
      : schedule.recurrence_type === "weekly"
        ? "WEEKLY"
        : schedule.recurrence_type === "monthly"
          ? "MONTHLY"
          : null;
  if (!freq) return null;

  const parts = [`FREQ=${freq}`];
  if (schedule.recurrence_interval > 1) parts.push(`INTERVAL=${schedule.recurrence_interval}`);
  const until = formatIcsDate(schedule.recurrence_until);
  if (until) parts.push(`UNTIL=${until}`);
  return `RRULE:${parts.join(";")}`;
}

function parseIcsRrule(value: string | undefined): Pick<
  ScheduleImportInput,
  "recurrence_type" | "recurrence_interval" | "recurrence_until"
> {
  if (!value) return {};
  const parts = new Map<string, string>();
  value.split(";").forEach((part) => {
    const separator = part.indexOf("=");
    if (separator > 0) {
      parts.set(part.slice(0, separator).toUpperCase(), part.slice(separator + 1));
    }
  });

  const freq = parts.get("FREQ")?.toUpperCase();
  const recurrence_type =
    freq === "DAILY" ? "daily" : freq === "WEEKLY" ? "weekly" : freq === "MONTHLY" ? "monthly" : undefined;
  if (!recurrence_type) return {};

  const interval = parseOptionalPositiveInteger(parts.get("INTERVAL"));
  const until = parts.get("UNTIL");
  return {
    recurrence_type,
    recurrence_interval: interval,
    recurrence_until: until ? parseIcsDate(until) : undefined,
  };
}

export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function schedulesToCsv(schedules: Schedule[]): string {
  const headers = [
    "id",
    "title",
    "description",
    "item_type",
    "start_time",
    "end_time",
    "status",
    "priority",
    "remind_at",
    "recurrence_type",
    "recurrence_interval",
    "recurrence_until",
    "tags",
  ];
  const lines = schedules.map((schedule) =>
    [
      schedule.id,
      schedule.title,
      schedule.description,
      schedule.item_type,
      schedule.start_time,
      schedule.end_time,
      schedule.status,
      schedule.priority,
      schedule.remind_at,
      schedule.recurrence_type,
      schedule.recurrence_interval,
      schedule.recurrence_until,
      schedule.tags?.map((tag) => tag.name).join("|") ?? "",
    ]
      .map(csvEscape)
      .join(","),
  );
  return `\uFEFF${headers.join(",")}\n${lines.join("\n")}`;
}

export function schedulesToJson(schedules: Schedule[]): string {
  return JSON.stringify({ exported_at: new Date().toISOString(), schedules }, null, 2);
}

export function schedulesToIcs(schedules: Schedule[]): string {
  const now = formatIcsDate(new Date().toISOString());
  const events = schedules
    .map((schedule) => {
      const start = formatIcsDate(schedule.start_time);
      if (!start) return null;
      const end = formatIcsDate(schedule.end_time);
      const scheduleStatus = schedule.status ?? "pending";
      const priority = mapSchedulePriorityToIcs(schedule.priority);
      const alarmTrigger = formatIcsAlarmTrigger(schedule.start_time, schedule.remind_at);
      return [
        "BEGIN:VEVENT",
        `UID:focusflow-${schedule.id}@local`,
        now ? `DTSTAMP:${now}` : null,
        `DTSTART:${start}`,
        end ? `DTEND:${end}` : null,
        `SUMMARY:${escapeIcsText(schedule.title)}`,
        schedule.description ? `DESCRIPTION:${escapeIcsText(schedule.description)}` : null,
        `STATUS:${mapScheduleStatusToIcs(scheduleStatus)}`,
        `X-FOCUSFLOW-STATUS:${scheduleStatus}`,
        priority ? `PRIORITY:${priority}` : null,
        buildIcsRrule(schedule),
        alarmTrigger
          ? [
              "BEGIN:VALARM",
              "ACTION:DISPLAY",
              `DESCRIPTION:${escapeIcsText(schedule.title)}`,
              `TRIGGER:${alarmTrigger}`,
              "END:VALARM",
            ].join("\r\n")
          : null,
        "END:VEVENT",
      ]
        .filter(Boolean)
        .join("\r\n");
    })
    .filter(Boolean);

  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//FocusFlow Pro//EN", ...events, "END:VCALENDAR"].join(
    "\r\n",
  );
}

export function statisticsReportToCsv(stats: ScheduleStats, streak: StreakStats | null): string {
  const completionRate =
    stats.total > 0 ? Math.round(((stats.byStatus.completed ?? 0) / stats.total) * 100) : 0;
  const rows: Array<[string, string | number]> = [
    ["metric", "value"],
    ["total_schedules", stats.total],
    ["pending", stats.byStatus.pending ?? 0],
    ["completed", stats.byStatus.completed ?? 0],
    ["cancelled", stats.byStatus.cancelled ?? 0],
    ["completion_rate_percent", completionRate],
    ["task", stats.byItemType.task ?? 0],
    ["meeting", stats.byItemType.meeting ?? 0],
    ["event", stats.byItemType.event ?? 0],
    ["reminder", stats.byItemType.reminder ?? 0],
    ["high_priority", stats.byPriority.high ?? 0],
    ["normal_priority", stats.byPriority.normal ?? 0],
    ["low_priority", stats.byPriority.low ?? 0],
    ["recurring_active", stats.recurringActiveCount],
    ["current_streak", streak?.currentStreak ?? 0],
    ["longest_streak", streak?.longestStreak ?? 0],
    ["total_completed_by_streak", streak?.totalCompleted ?? 0],
  ];
  return `\uFEFF${rows.map((row) => row.map(csvEscape).join(",")).join("\n")}`;
}

export function statisticsReportToHtml(stats: ScheduleStats, streak: StreakStats | null): string {
  const completionRate =
    stats.total > 0 ? Math.round(((stats.byStatus.completed ?? 0) / stats.total) * 100) : 0;
  return `<!doctype html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>FocusFlow report</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 32px; color: #1d1b20; }
    h1 { margin-bottom: 4px; }
    table { border-collapse: collapse; width: 100%; margin-top: 24px; }
    th, td { border: 1px solid #ddd; padding: 10px; text-align: left; }
    th { background: #f2ecf4; }
  </style>
</head>
<body>
  <h1>FocusFlow Pro - Báo cáo năng suất</h1>
  <p>Xuất lúc ${new Date().toLocaleString("vi-VN")}</p>
  <table>
    <tbody>
      <tr><th>Tổng lịch</th><td>${stats.total}</td></tr>
      <tr><th>Đang chờ</th><td>${stats.byStatus.pending ?? 0}</td></tr>
      <tr><th>Hoàn thành</th><td>${stats.byStatus.completed ?? 0}</td></tr>
      <tr><th>Đã hủy</th><td>${stats.byStatus.cancelled ?? 0}</td></tr>
      <tr><th>Tỷ lệ hoàn thành</th><td>${completionRate}%</td></tr>
      <tr><th>Streak hiện tại</th><td>${streak?.currentStreak ?? 0} ngày</td></tr>
      <tr><th>Streak dài nhất</th><td>${streak?.longestStreak ?? 0} ngày</td></tr>
    </tbody>
  </table>
</body>
</html>`;
}

export function parseCsvSchedules(text: string): ScheduleImportInput[] {
  const rows = parseCsv(text);
  const headers = rows.shift()?.map(normalizeHeader) ?? [];
  const result: ScheduleImportInput[] = [];

  for (const row of rows) {
    const record = new Map<string, string>();
    headers.forEach((header, index) => record.set(header, row[index]?.trim() ?? ""));

    const title = record.get("title") || record.get("tiêu đề") || record.get("tieu de");
    const startTime = record.get("start_time") || record.get("start") || record.get("bắt đầu");
    if (!title || !isValidDateString(startTime)) continue;

    const endTime = record.get("end_time") || record.get("end");
    const status = record.get("status");
    const remindAt = record.get("remind_at");
    const recurrenceUntil = record.get("recurrence_until");

    result.push({
      title,
      description: record.get("description") || undefined,
      item_type: record.get("item_type") || "task",
      start_time: new Date(startTime).toISOString(),
      end_time: isValidDateString(endTime) ? new Date(endTime).toISOString() : undefined,
      ...(isValidScheduleStatus(status) ? { status } : {}),
      priority: record.get("priority") || "normal",
      remind_at: isValidDateString(remindAt) ? new Date(remindAt).toISOString() : undefined,
      recurrence_type: record.get("recurrence_type") || undefined,
      recurrence_interval: parseOptionalNumber(record.get("recurrence_interval")),
      recurrence_until: isValidDateString(recurrenceUntil)
        ? new Date(recurrenceUntil).toISOString()
        : undefined,
    });
  }

  return result;
}

export function parseIcsSchedules(text: string): ScheduleImportInput[] {
  const lines = text.replace(/\r?\n[ \t]/g, "").split(/\r?\n/);
  const result: ScheduleImportInput[] = [];
  let event: Record<string, string> | null = null;
  let inAlarm = false;

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    const controlLine = trimmedLine.toUpperCase();

    if (controlLine === "BEGIN:VEVENT") {
      event = {};
      inAlarm = false;
      continue;
    }
    if (controlLine === "END:VEVENT") {
      if (event) {
        const title = event.SUMMARY ? unescapeIcsText(event.SUMMARY) : "Imported event";
        const start = event.DTSTART ? parseIcsDate(event.DTSTART) : undefined;
        if (start) {
          const end = event.DTEND ? parseIcsDate(event.DTEND) : undefined;
          const recurrence = parseIcsRrule(event.RRULE);
          const status = mapIcsStatusToSchedule(event.STATUS, event["X-FOCUSFLOW-STATUS"]);
          result.push({
            title,
            description: event.DESCRIPTION ? unescapeIcsText(event.DESCRIPTION) : undefined,
            item_type: "event",
            start_time: start,
            end_time: end,
            ...(status ? { status } : {}),
            priority: mapIcsPriorityToSchedule(event.PRIORITY),
            remind_at: parseIcsAlarmReminder(start, event.VALARM_TRIGGER),
            ...recurrence,
          });
        }
      }
      event = null;
      inAlarm = false;
      continue;
    }

    if (!event) continue;
    if (controlLine === "BEGIN:VALARM") {
      inAlarm = true;
      continue;
    }
    if (controlLine === "END:VALARM") {
      inAlarm = false;
      continue;
    }

    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const rawKey = line.slice(0, separator).split(";")[0].toUpperCase();
    const value = line.slice(separator + 1);
    if (inAlarm) {
      if (rawKey === "TRIGGER") event.VALARM_TRIGGER = value;
      continue;
    }
    event[rawKey] = value;
  }

  return result;
}
