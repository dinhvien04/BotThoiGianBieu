/**
 * Parser tối thiểu cho file iCalendar (.ics) — RFC 5545. Hỗ trợ:
 * - Line unfolding (dòng bắt đầu bằng space/tab nối với dòng trên).
 * - VEVENT blocks với SUMMARY / DESCRIPTION / DTSTART / DTEND / UID / RRULE.
 * - DTSTART/DTEND format: `YYYYMMDDTHHMMSSZ` (UTC), `YYYYMMDDTHHMMSS`
 *   (floating — coi như VN local), `YYYYMMDD` (all-day → 00:00 VN).
 * - TZID parameter — coi tất cả các timezone có chữ "Ho_Chi_Minh"
 *   hoặc Asia/Bangkok như VN; các TZID khác fallback floating.
 * - Escape sequences: `\n`/`\N` → newline, `\,` → `,`, `\;` → `;`,
 *   `\\` → `\`.
 * - RRULE → recurrence (DAILY/WEEKLY/MONTHLY + INTERVAL + UNTIL/COUNT).
 *   Các RRULE phức tạp khác (BYDAY, BYMONTHDAY, BYSETPOS, SECONDLY/MINUTELY/
 *   HOURLY/YEARLY) sẽ ghi nhận warning và skip RRULE (event vẫn được nhập
 *   nhưng không lặp).
 *
 * KHÔNG hỗ trợ (out of scope): EXDATE, VTIMEZONE block,
 * VTODO/VJOURNAL, ATTENDEE, recurrence-id.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export type IcsRecurrenceType = "daily" | "weekly" | "monthly";

export interface IcsRecurrence {
  type: IcsRecurrenceType;
  interval: number; // ≥ 1
  until: Date | null;
}

export interface IcsEvent {
  index: number; // vị trí trong file (1-based)
  uid: string | null;
  summary: string;
  description: string | null;
  start: Date;
  end: Date | null;
  allDay: boolean;
  recurrence: IcsRecurrence | null;
  /** Warnings trong RRULE — vd "BYDAY không hỗ trợ" */
  warnings: string[];
}

export interface IcsParseError {
  index: number;
  message: string;
}

export interface IcsParseResult {
  events: IcsEvent[];
  errors: IcsParseError[];
}

interface RawProperty {
  name: string;
  params: Record<string, string>;
  value: string;
}

function unfoldLines(text: string): string[] {
  const lines = text.split(/\r?\n/);
  const out: string[] = [];
  for (const line of lines) {
    if (line.length === 0) continue;
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function parseProperty(line: string): RawProperty | null {
  const colon = line.indexOf(":");
  if (colon < 0) return null;
  const head = line.slice(0, colon);
  const value = line.slice(colon + 1);
  const parts = head.split(";");
  const name = parts[0].toUpperCase();
  const params: Record<string, string> = {};
  for (const p of parts.slice(1)) {
    const eq = p.indexOf("=");
    if (eq > 0) {
      params[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
    }
  }
  return { name, params, value };
}

function unescapeText(s: string): string {
  return s
    .replace(/\\\\/g, "\u0000")
    .replace(/\\[nN]/g, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\u0000/g, "\\");
}

/**
 * Parse một giá trị DTSTART/DTEND. Trả về { date, allDay } hoặc null
 * nếu format không hợp lệ.
 */
export function parseIcsDateTime(
  value: string,
  params: Record<string, string>,
): { date: Date; allDay: boolean } | null {
  const isDateOnly = params.VALUE === "DATE" || /^\d{8}$/.test(value);
  if (isDateOnly && /^\d{8}$/.test(value)) {
    const y = Number(value.slice(0, 4));
    const m = Number(value.slice(4, 6));
    const d = Number(value.slice(6, 8));
    if (!isFinite(y) || !isFinite(m) || !isFinite(d)) return null;
    // 00:00 VN local → UTC tương ứng
    const utcMs = Date.UTC(y, m - 1, d, 0, 0, 0) - VN_OFFSET_MS;
    return { date: new Date(utcMs), allDay: true };
  }

  const m = value.match(
    /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/,
  );
  if (!m) return null;
  const [, ys, mos, ds, hs, mis, ss, z] = m;
  const y = Number(ys);
  const mo = Number(mos);
  const d = Number(ds);
  const h = Number(hs);
  const mi = Number(mis);
  const sc = Number(ss);

  if (z === "Z") {
    // UTC
    return {
      date: new Date(Date.UTC(y, mo - 1, d, h, mi, sc)),
      allDay: false,
    };
  }

  const tzid = params.TZID ?? "";
  const isVn =
    tzid === "" ||
    /ho_chi_minh|hochiminh|saigon|bangkok|jakarta/i.test(tzid) ||
    /^\+0?7$/i.test(tzid);
  if (isVn) {
    // Floating / VN local → convert sang UTC bằng cách trừ +7h
    const utcMs = Date.UTC(y, mo - 1, d, h, mi, sc) - VN_OFFSET_MS;
    return { date: new Date(utcMs), allDay: false };
  }

  // TZID không hỗ trợ — fallback coi như VN local (tốt hơn null hoá)
  const utcMs = Date.UTC(y, mo - 1, d, h, mi, sc) - VN_OFFSET_MS;
  return { date: new Date(utcMs), allDay: false };
}

/**
 * Parse RRULE value (rhs of `RRULE:`). Returns null nếu không thể map sang
 * recurrence schema của bot. Warnings được populate cho user biết tính năng
 * RRULE nào bị bỏ qua.
 *
 * Map:
 * - `FREQ=DAILY` → daily, `FREQ=WEEKLY` → weekly, `FREQ=MONTHLY` → monthly.
 * - `INTERVAL=N` → interval (mặc định 1).
 * - `UNTIL=...` → until (parse như DTSTART).
 * - `COUNT=N` → tính `until = start + (N-1)*interval-by-freq`.
 *
 * Các BYDAY / BYMONTHDAY / BYSETPOS / WKST / BYHOUR ... được ghi nhận warning
 * và bỏ qua (recurrence vẫn dùng, nhưng có thể lệch so với calendar gốc).
 */
export function parseRrule(
  value: string,
  start: Date,
): { recurrence: IcsRecurrence | null; warnings: string[] } {
  const warnings: string[] = [];
  const parts = value.split(";").filter((s) => s.length > 0);
  const map: Record<string, string> = {};
  for (const p of parts) {
    const eq = p.indexOf("=");
    if (eq <= 0) continue;
    map[p.slice(0, eq).toUpperCase()] = p.slice(eq + 1);
  }

  const freq = (map.FREQ ?? "").toUpperCase();
  let type: IcsRecurrenceType | null = null;
  if (freq === "DAILY") type = "daily";
  else if (freq === "WEEKLY") type = "weekly";
  else if (freq === "MONTHLY") type = "monthly";
  else if (freq === "YEARLY") {
    warnings.push("FREQ=YEARLY chưa hỗ trợ — bỏ qua RRULE.");
    return { recurrence: null, warnings };
  } else if (freq === "HOURLY" || freq === "MINUTELY" || freq === "SECONDLY") {
    warnings.push(`FREQ=${freq} chưa hỗ trợ — bỏ qua RRULE.`);
    return { recurrence: null, warnings };
  } else {
    warnings.push(`FREQ không hợp lệ — bỏ qua RRULE.`);
    return { recurrence: null, warnings };
  }

  let interval = 1;
  if (map.INTERVAL) {
    const n = Number(map.INTERVAL);
    if (Number.isInteger(n) && n > 0) interval = n;
    else warnings.push(`INTERVAL=${map.INTERVAL} không hợp lệ — dùng 1.`);
  }

  const unsupported = [
    "BYDAY",
    "BYMONTHDAY",
    "BYMONTH",
    "BYSETPOS",
    "BYHOUR",
    "BYMINUTE",
    "BYSECOND",
    "BYWEEKNO",
    "BYYEARDAY",
  ];
  for (const k of unsupported) {
    if (map[k] != null) {
      warnings.push(`${k} không hỗ trợ — recurrence có thể lệch.`);
    }
  }

  let until: Date | null = null;
  if (map.UNTIL) {
    const parsed = parseIcsDateTime(map.UNTIL, {});
    if (parsed) until = parsed.date;
    else warnings.push(`UNTIL=${map.UNTIL} không hợp lệ — bỏ qua.`);
  } else if (map.COUNT) {
    const n = Number(map.COUNT);
    if (Number.isInteger(n) && n > 0) {
      until = computeUntilFromCount(start, type, interval, n);
    } else {
      warnings.push(`COUNT=${map.COUNT} không hợp lệ — bỏ qua.`);
    }
  }

  return {
    recurrence: { type, interval, until },
    warnings,
  };
}

function computeUntilFromCount(
  start: Date,
  type: IcsRecurrenceType,
  interval: number,
  count: number,
): Date {
  const offsets = count - 1;
  if (type === "daily") {
    return new Date(
      start.getTime() + offsets * interval * 24 * 60 * 60 * 1000,
    );
  }
  if (type === "weekly") {
    return new Date(
      start.getTime() + offsets * interval * 7 * 24 * 60 * 60 * 1000,
    );
  }
  // monthly: shift bằng calendar (UTC) để khỏi xảy ra rò DST.
  const d = new Date(start.getTime());
  d.setUTCMonth(d.getUTCMonth() + offsets * interval);
  return d;
}

export function parseIcs(text: string): IcsParseResult {
  const events: IcsEvent[] = [];
  const errors: IcsParseError[] = [];

  const lines = unfoldLines(text);
  let inEvent = false;
  let current: Partial<IcsEvent> | null = null;
  let eventIndex = 0;

  for (const rawLine of lines) {
    const prop = parseProperty(rawLine);
    if (!prop) continue;

    if (prop.name === "BEGIN" && prop.value.toUpperCase() === "VEVENT") {
      inEvent = true;
      eventIndex += 1;
      current = {
        index: eventIndex,
        uid: null,
        recurrence: null,
        warnings: [],
      };
      continue;
    }

    if (prop.name === "END" && prop.value.toUpperCase() === "VEVENT") {
      if (current) {
        const idx = current.index ?? eventIndex;
        if (!current.summary || !current.summary.trim()) {
          errors.push({
            index: idx,
            message: "Thiếu SUMMARY (tiêu đề).",
          });
        } else if (!current.start) {
          errors.push({
            index: idx,
            message: "Thiếu DTSTART.",
          });
        } else {
          events.push({
            index: idx,
            uid: current.uid ?? null,
            summary: current.summary,
            description: current.description ?? null,
            start: current.start,
            end: current.end ?? null,
            allDay: current.allDay ?? false,
            recurrence: current.recurrence ?? null,
            warnings: current.warnings ?? [],
          });
        }
      }
      inEvent = false;
      current = null;
      continue;
    }

    if (!inEvent || !current) continue;

    switch (prop.name) {
      case "UID":
        current.uid = prop.value;
        break;
      case "SUMMARY":
        current.summary = unescapeText(prop.value).trim();
        break;
      case "DESCRIPTION": {
        const v = unescapeText(prop.value).trim();
        current.description = v.length > 0 ? v : null;
        break;
      }
      case "DTSTART": {
        const parsed = parseIcsDateTime(prop.value, prop.params);
        if (!parsed) {
          errors.push({
            index: current.index ?? eventIndex,
            message: `DTSTART không hợp lệ: \`${prop.value}\`.`,
          });
        } else {
          current.start = parsed.date;
          current.allDay = parsed.allDay;
        }
        break;
      }
      case "DTEND": {
        const parsed = parseIcsDateTime(prop.value, prop.params);
        if (parsed) {
          current.end = parsed.date;
        }
        break;
      }
      case "RRULE": {
        if (!current.start) {
          // RRULE phải đứng sau DTSTART theo RFC; nếu không có DTSTART
          // sẽ skip — hiếm gặp.
          (current.warnings ??= []).push(
            "RRULE đứng trước DTSTART — bỏ qua.",
          );
          break;
        }
        const { recurrence, warnings } = parseRrule(prop.value, current.start);
        if (recurrence) current.recurrence = recurrence;
        if (warnings.length > 0) {
          (current.warnings ??= []).push(...warnings);
        }
        break;
      }
      default:
        break;
    }
  }

  return { events, errors };
}
