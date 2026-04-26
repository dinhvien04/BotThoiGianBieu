/**
 * Parser tối thiểu cho file iCalendar (.ics) — RFC 5545. Hỗ trợ:
 * - Line unfolding (dòng bắt đầu bằng space/tab nối với dòng trên).
 * - VEVENT blocks với SUMMARY / DESCRIPTION / DTSTART / DTEND / UID.
 * - DTSTART/DTEND format: `YYYYMMDDTHHMMSSZ` (UTC), `YYYYMMDDTHHMMSS`
 *   (floating — coi như VN local), `YYYYMMDD` (all-day → 00:00 VN).
 * - TZID parameter — coi tất cả các timezone có chữ "Ho_Chi_Minh"
 *   hoặc Asia/Bangkok như VN; các TZID khác fallback floating.
 * - Escape sequences: `\n`/`\N` → newline, `\,` → `,`, `\;` → `;`,
 *   `\\` → `\`.
 *
 * KHÔNG hỗ trợ (out of scope): RRULE, EXDATE, VTIMEZONE block,
 * VTODO/VJOURNAL, ATTENDEE, recurrence-id.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface IcsEvent {
  index: number; // vị trí trong file (1-based)
  uid: string | null;
  summary: string;
  description: string | null;
  start: Date;
  end: Date | null;
  allDay: boolean;
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
      current = { index: eventIndex, uid: null };
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
      default:
        break;
    }
  }

  return { events, errors };
}
