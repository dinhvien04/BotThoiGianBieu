/**
 * Helper cho timezone IANA per-user. Giai đoạn 1: chỉ validate + format.
 * Bot vẫn hiển thị mặc định theo giờ VN cho tới khi formatters tích hợp tz.
 */

const COMMON_ALIASES: Record<string, string> = {
  vn: "Asia/Ho_Chi_Minh",
  vietnam: "Asia/Ho_Chi_Minh",
  hcm: "Asia/Ho_Chi_Minh",
  saigon: "Asia/Ho_Chi_Minh",
  hanoi: "Asia/Ho_Chi_Minh",
  jp: "Asia/Tokyo",
  japan: "Asia/Tokyo",
  tokyo: "Asia/Tokyo",
  kr: "Asia/Seoul",
  korea: "Asia/Seoul",
  seoul: "Asia/Seoul",
  uk: "Europe/London",
  london: "Europe/London",
  ny: "America/New_York",
  nyc: "America/New_York",
  newyork: "America/New_York",
  sf: "America/Los_Angeles",
  la: "America/Los_Angeles",
  losangeles: "America/Los_Angeles",
  utc: "UTC",
  gmt: "UTC",
};

export const POPULAR_TIMEZONES = [
  "Asia/Ho_Chi_Minh",
  "Asia/Bangkok",
  "Asia/Tokyo",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Shanghai",
  "Asia/Kolkata",
  "Australia/Sydney",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "America/New_York",
  "America/Los_Angeles",
  "UTC",
];

/** Resolve alias hoặc trả về input gốc. */
export function resolveTimezoneAlias(input: string): string {
  const key = input.trim().toLowerCase().replace(/[\s_]/g, "");
  return COMMON_ALIASES[key] ?? input.trim();
}

/** Validate IANA timezone via Intl. Trả về tên chuẩn hoặc null. */
export function isValidTimezone(tz: string): boolean {
  if (!tz) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Tính offset (ms) của 1 thời điểm cụ thể vs UTC trong timezone IANA cho trước.
 * Vd: getTimezoneOffsetMs(date, "Asia/Ho_Chi_Minh") = +7*3600*1000.
 *
 * Dùng trick `formatToParts` để extract các thành phần Date sau khi đã
 * chuyển sang `tz`, rồi so với UTC để tính diff.
 */
export function getTimezoneOffsetMs(date: Date, tz: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, number> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = Number(p.value);
  }
  const asUtc = Date.UTC(
    map.year,
    map.month - 1,
    map.day,
    map.hour === 24 ? 0 : map.hour,
    map.minute,
    map.second,
  );
  // Truncate to whole seconds before diffing — date.getTime() may have ms,
  // but formatToParts only resolves to seconds.
  const truncated = Math.floor(date.getTime() / 1000) * 1000;
  return asUtc - truncated;
}

/** Format offset như "+07:00" / "-05:30". */
export function formatOffset(offsetMs: number): string {
  const sign = offsetMs >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMs);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  return `${sign}${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Format date theo timezone IANA (dạng "DD/MM/YYYY HH:mm"). */
export function formatInTimezone(date: Date, tz: string): string {
  const dtf = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  const parts = dtf.formatToParts(date);
  const m: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") m[p.type] = p.value;
  }
  return `${m.day}/${m.month}/${m.year} ${m.hour}:${m.minute}`;
}
