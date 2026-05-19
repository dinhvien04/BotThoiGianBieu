import type { Schedule, ScheduleStats, StreakStats } from "./api";

export interface ScheduleImportInput {
  title: string;
  description?: string;
  item_type?: string;
  start_time: string;
  end_time?: string;
  priority?: string;
  remind_at?: string;
  recurrence_type?: string;
  recurrence_interval?: number;
  recurrence_until?: string;
}

function csvEscape(value: unknown): string {
  const text = value == null ? "" : String(value);
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
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

function parseOptionalNumber(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
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
  const events = schedules
    .map((schedule) => {
      const start = formatIcsDate(schedule.start_time);
      if (!start) return null;
      const end = formatIcsDate(schedule.end_time);
      return [
        "BEGIN:VEVENT",
        `UID:focusflow-${schedule.id}@local`,
        `DTSTAMP:${formatIcsDate(new Date().toISOString())}`,
        `DTSTART:${start}`,
        end ? `DTEND:${end}` : null,
        `SUMMARY:${escapeIcsText(schedule.title)}`,
        schedule.description ? `DESCRIPTION:${escapeIcsText(schedule.description)}` : null,
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
    const remindAt = record.get("remind_at");
    const recurrenceUntil = record.get("recurrence_until");

    result.push({
      title,
      description: record.get("description") || undefined,
      item_type: record.get("item_type") || "task",
      start_time: new Date(startTime).toISOString(),
      end_time: isValidDateString(endTime) ? new Date(endTime).toISOString() : undefined,
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

  for (const line of lines) {
    if (line === "BEGIN:VEVENT") {
      event = {};
      continue;
    }
    if (line === "END:VEVENT") {
      if (event) {
        const title = event.SUMMARY ? unescapeIcsText(event.SUMMARY) : "Imported event";
        const start = event.DTSTART ? parseIcsDate(event.DTSTART) : undefined;
        if (start) {
          const end = event.DTEND ? parseIcsDate(event.DTEND) : undefined;
          result.push({
            title,
            description: event.DESCRIPTION ? unescapeIcsText(event.DESCRIPTION) : undefined,
            item_type: "event",
            start_time: start,
            end_time: end,
            priority: "normal",
          });
        }
      }
      event = null;
      continue;
    }

    if (!event) continue;
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const rawKey = line.slice(0, separator).split(";")[0];
    const value = line.slice(separator + 1);
    event[rawKey] = value;
  }

  return result;
}
