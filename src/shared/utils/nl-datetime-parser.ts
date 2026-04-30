/**
 * Parser câu tự nhiên tiếng Việt → Date (giờ VN). KHÔNG dùng AI/LLM,
 * chỉ regex + bảng từ khoá. Coverage ~80% câu phổ biến của user VN.
 *
 * Pattern hỗ trợ:
 * - Giờ:  "9h", "9h30", "9:30", "9 giờ", "9 giờ 30", "21h", "9h tối"
 * - Buổi: "sáng", "trưa", "chiều", "tối", "đêm", "khuya"
 *         (chỉ dùng để disambiguate 7h sáng / 7h tối)
 * - Ngày: "hôm nay", "mai", "ngày mai", "ngày kia", "ngày kìa"
 * - Thứ:  "thứ 2"…"thứ 7", "thứ hai"…"thứ bảy", "chủ nhật", "cn", "t2"…"t7"
 * - Tuần: "tuần này", "tuần sau", "tuần tới", "tuần trước"
 * - DD/MM hoặc DD-MM (year mặc định = năm hiện tại nếu < hôm nay → năm sau)
 *
 * Trả về:
 * - title: phần text còn lại (đã loại bỏ token thời gian)
 * - start: Date — hoặc null nếu không parse được giờ/ngày
 * - hadDate: có chỉ định ngày rõ ràng?
 * - hadTime: có chỉ định giờ rõ ràng?
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const WEEKDAY_MAP: Record<string, number> = {
  // 0 = Chủ nhật, 1 = Thứ 2, ... 6 = Thứ 7
  "chủ nhật": 0,
  "chu nhat": 0,
  cn: 0,
  "thứ 2": 1,
  "thứ hai": 1,
  "thu hai": 1,
  t2: 1,
  "thứ 3": 2,
  "thứ ba": 2,
  "thu ba": 2,
  t3: 2,
  "thứ 4": 3,
  "thứ tư": 3,
  "thu tu": 3,
  t4: 3,
  "thứ 5": 4,
  "thứ năm": 4,
  "thu nam": 4,
  t5: 4,
  "thứ 6": 5,
  "thứ sáu": 5,
  "thu sau": 5,
  t6: 5,
  "thứ 7": 6,
  "thứ bảy": 6,
  "thu bay": 6,
  t7: 6,
};

export interface NlParseResult {
  title: string;
  start: Date | null;
  hadDate: boolean;
  hadTime: boolean;
  notes: string[];
}

/** Trừ về 00:00 VN cho `vnDate` đã có timezone offset cộng vào. */
function toUtcFromVnYMD(year: number, month: number, day: number, hour = 0, minute = 0): Date {
  return new Date(Date.UTC(year, month - 1, day, hour, minute) - VN_OFFSET_MS);
}

/** Chuyển Date UTC → object {year, month, day, hour, minute} theo giờ VN. */
function vnParts(date: Date): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
} {
  const vn = new Date(date.getTime() + VN_OFFSET_MS);
  return {
    year: vn.getUTCFullYear(),
    month: vn.getUTCMonth() + 1,
    day: vn.getUTCDate(),
    hour: vn.getUTCHours(),
    minute: vn.getUTCMinutes(),
    weekday: vn.getUTCDay(),
  };
}

interface TimeMatch {
  hour: number;
  minute: number;
  start: number;
  end: number;
  partOfDayHint: "morning" | "noon" | "afternoon" | "evening" | "night" | null;
}

function parseTimeToken(text: string): TimeMatch | null {
  // "9h", "9h30", "9:30", "9 giờ", "9 giờ 30", "21h"
  const re = /\b(\d{1,2})\s*(?:h(?!ôm)|:|\s+giờ)\s*(\d{1,2})?\b/i;
  const m = re.exec(text);
  if (!m) return null;
  const hour = Number(m[1]);
  const minute = m[2] ? Number(m[2]) : 0;
  if (hour > 23 || minute > 59) return null;

  // Look back/forward for part-of-day hint
  const window = text.slice(Math.max(0, m.index - 8), m.index + m[0].length + 12);
  let hint: TimeMatch["partOfDayHint"] = null;
  if (/sáng|sang/i.test(window)) hint = "morning";
  else if (/trưa|trua/i.test(window)) hint = "noon";
  else if (/chiều|chieu/i.test(window)) hint = "afternoon";
  else if (/tối|toi/i.test(window)) hint = "evening";
  else if (/đêm|dem|khuya/i.test(window)) hint = "night";

  return {
    hour,
    minute,
    start: m.index,
    end: m.index + m[0].length,
    partOfDayHint: hint,
  };
}

function applyPartOfDay(hour: number, hint: TimeMatch["partOfDayHint"]): number {
  if (hint === null) return hour;
  if (hour >= 13) return hour; // already 24-hour
  switch (hint) {
    case "morning":
      return hour === 12 ? 0 : hour;
    case "noon":
      return hour < 6 ? hour + 12 : hour;
    case "afternoon":
    case "evening":
      return hour < 12 ? hour + 12 : hour;
    case "night":
      return hour < 12 ? hour + 12 : hour;
  }
  return hour;
}

interface DateMatch {
  year: number;
  month: number;
  day: number;
  start: number;
  end: number;
}

function parseRelativeDay(text: string, now: Date): DateMatch | null {
  // "hôm nay", "mai", "ngày mai", "ngày kia", "ngày kìa", "hôm qua"
  const re =
    /\b(hôm nay|hom nay|ngày mai|ngay mai|mai(?!\w)|ngày kia|ngay kia|ngày kìa|ngay kia|hôm qua|hom qua)\b/i;
  const m = re.exec(text);
  if (!m) return null;
  const today = vnParts(now);
  const baseUtc = toUtcFromVnYMD(today.year, today.month, today.day);
  let offsetDays = 0;
  const k = m[1].toLowerCase();
  if (/hôm nay|hom nay/.test(k)) offsetDays = 0;
  else if (/^mai$|ngày mai|ngay mai/.test(k)) offsetDays = 1;
  else if (/ngày kia|ngay kia|ngày kìa/.test(k)) offsetDays = 2;
  else if (/hôm qua|hom qua/.test(k)) offsetDays = -1;

  const target = new Date(baseUtc.getTime() + offsetDays * 24 * 60 * 60 * 1000);
  const tp = vnParts(target);
  return {
    year: tp.year,
    month: tp.month,
    day: tp.day,
    start: m.index,
    end: m.index + m[0].length,
  };
}

function parseWeekday(text: string, now: Date): DateMatch | null {
  // "thứ 2 tuần sau", "thứ hai", "t6 tuần này", "chủ nhật"
  const lowered = text.toLowerCase();
  let bestKey: string | null = null;
  let bestStart = -1;
  let bestEnd = -1;
  for (const key of Object.keys(WEEKDAY_MAP)) {
    const re = new RegExp(`\\b${key.replace(/\s+/g, "\\s+")}\\b`, "i");
    const m = re.exec(lowered);
    if (m && (bestKey === null || key.length > bestKey.length)) {
      bestKey = key;
      bestStart = m.index;
      bestEnd = m.index + m[0].length;
    }
  }
  if (!bestKey) return null;
  const targetWeekday = WEEKDAY_MAP[bestKey];
  const today = vnParts(now);

  // Detect "tuần sau/tới" / "tuần trước"
  const afterToken = lowered.slice(bestEnd, bestEnd + 30);
  let weekShift = 0;
  if (/\btuần sau|\btuan sau|\btuần tới|\btuan toi/.test(afterToken)) {
    weekShift = 1;
  } else if (/\btuần trước|\btuan truoc/.test(afterToken)) {
    weekShift = -1;
  }
  const tokenEnd =
    weekShift !== 0
      ? bestEnd +
        (afterToken.match(
          /\btuần\s+(sau|tới)|\btuan\s+(sau|toi)|\btuần trước|\btuan truoc/,
        )?.[0]?.length ?? 0) +
        1
      : bestEnd;

  // Today as VN-midnight UTC
  const todayUtc = toUtcFromVnYMD(today.year, today.month, today.day);
  const todayWeekday = today.weekday;

  // Default behavior: nearest future occurrence (or today if same weekday)
  let diff = (targetWeekday - todayWeekday + 7) % 7;
  if (weekShift === 0 && diff === 0) {
    // "thứ 2" while today is thứ 2 → today; user can use "tuần sau" to skip
  }
  if (weekShift !== 0) diff += 7 * weekShift;

  const target = new Date(todayUtc.getTime() + diff * 24 * 60 * 60 * 1000);
  const tp = vnParts(target);
  return {
    year: tp.year,
    month: tp.month,
    day: tp.day,
    start: bestStart,
    end: tokenEnd,
  };
}

function parseDateLiteral(text: string, now: Date): DateMatch | null {
  // "30/4", "30/4/2026", "30-4", "30-4-2026", "30 thg 4"
  const re =
    /\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?\b/;
  const m = re.exec(text);
  if (!m) return null;
  const day = Number(m[1]);
  const month = Number(m[2]);
  let year: number;
  if (m[3]) {
    year = Number(m[3]);
    if (year < 100) year += 2000;
  } else {
    const today = vnParts(now);
    year = today.year;
    // If date in past for this year, assume next year
    const candidate = toUtcFromVnYMD(year, month, day);
    if (candidate.getTime() < now.getTime() - 24 * 60 * 60 * 1000) {
      year += 1;
    }
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return {
    year,
    month,
    day,
    start: m.index,
    end: m.index + m[0].length,
  };
}

/** Strip ranges from the source text and return the remaining trimmed string. */
function stripRanges(
  text: string,
  ranges: Array<{ start: number; end: number }>,
): string {
  if (ranges.length === 0) return text.trim();
  const sorted = [...ranges].sort((a, b) => a.start - b.start);
  const merged: Array<{ start: number; end: number }> = [];
  for (const r of sorted) {
    if (merged.length === 0 || r.start > merged[merged.length - 1].end) {
      merged.push({ ...r });
    } else {
      merged[merged.length - 1].end = Math.max(
        merged[merged.length - 1].end,
        r.end,
      );
    }
  }
  let out = "";
  let i = 0;
  for (const r of merged) {
    out += text.slice(i, r.start);
    i = r.end;
  }
  out += text.slice(i);
  return out.replace(/\s+/g, " ").trim();
}

/** Cleanup leftover filler words. Uses Unicode property escapes to handle
 * Vietnamese diacritics correctly (regex `\b` is ASCII-only in JS). */
function cleanupTitle(s: string): string {
  return s
    .replace(
      /(?<![\p{L}\p{N}])(vào|lúc|đi|nha|nhé|đó|này|tới|nào|ạ)(?![\p{L}\p{N}])/giu,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
}

export function parseNaturalLanguage(
  raw: string,
  now: Date = new Date(),
): NlParseResult {
  const notes: string[] = [];
  const text = raw.trim();
  if (!text) {
    return { title: "", start: null, hadDate: false, hadTime: false, notes: ["Câu rỗng."] };
  }

  const ranges: Array<{ start: number; end: number }> = [];

  let dateMatch =
    parseRelativeDay(text, now) ??
    parseWeekday(text, now) ??
    parseDateLiteral(text, now);
  if (dateMatch) {
    ranges.push({ start: dateMatch.start, end: dateMatch.end });
  }

  const timeMatch = parseTimeToken(text);
  if (timeMatch) {
    ranges.push({ start: timeMatch.start, end: timeMatch.end });
  }

  // Strip part-of-day standalone tokens too (only those near time)
  const partOfDayRe = /\b(sáng|sang|trưa|trua|chiều|chieu|tối|toi|đêm|dem|khuya)\b/gi;
  let m: RegExpExecArray | null;
  while ((m = partOfDayRe.exec(text)) !== null) {
    ranges.push({ start: m.index, end: m.index + m[0].length });
  }

  const title = cleanupTitle(stripRanges(text, ranges));

  let hadDate = !!dateMatch;
  let hadTime = !!timeMatch;
  let start: Date | null = null;

  if (hadDate || hadTime) {
    const today = vnParts(now);
    let year = dateMatch?.year ?? today.year;
    let month = dateMatch?.month ?? today.month;
    let day = dateMatch?.day ?? today.day;
    let hour = timeMatch ? applyPartOfDay(timeMatch.hour, timeMatch.partOfDayHint) : 9;
    let minute = timeMatch?.minute ?? 0;

    if (!timeMatch) {
      // No time provided — default 09:00
      hour = 9;
      minute = 0;
      notes.push("Không có giờ — mặc định 09:00.");
    }

    const candidate = toUtcFromVnYMD(year, month, day, hour, minute);

    // If only time given (no date) and time already passed today → tomorrow
    if (!hadDate && candidate.getTime() < now.getTime()) {
      const tomorrow = new Date(candidate.getTime() + 24 * 60 * 60 * 1000);
      const tp = vnParts(tomorrow);
      start = toUtcFromVnYMD(tp.year, tp.month, tp.day, hour, minute);
      notes.push("Giờ đã qua hôm nay — chuyển sang ngày mai.");
      hadDate = true;
    } else {
      start = candidate;
    }
  }

  return {
    title,
    start,
    hadDate,
    hadTime,
    notes,
  };
}
