/**
 * Parse "snooze frame" — keyword tiếng Việt mô tả thời điểm tương lai gần
 * (vd "đến giờ làm", "đến tối"), trả về Date UTC tương ứng.
 *
 * Frames được tính trong giờ VN (+7), độc lập với timezone hệ thống.
 *
 * Trả về null nếu input không phải frame keyword.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface SnoozeFrameSettings {
  workStartHour: number;
  workEndHour: number;
}

export interface SnoozeFrameResult {
  remindAt: Date;
  /** Vietnamese label hiển thị, vd "đến giờ làm (8h sáng mai)" */
  label: string;
}

const TRUA_HOUR = 12;
const CHIEU_HOUR = 14;
const TOI_HOUR = 19;
const EOD_HOUR = 23;
const DEFAULT_WORK_START = 9;

function normalize(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Lấy { y, mo, d, h, mi, dow } theo giờ VN của một Date UTC. */
function vnParts(date: Date): {
  y: number;
  mo: number;
  d: number;
  h: number;
  mi: number;
  dow: number;
} {
  const vn = new Date(date.getTime() + VN_OFFSET_MS);
  return {
    y: vn.getUTCFullYear(),
    mo: vn.getUTCMonth(),
    d: vn.getUTCDate(),
    h: vn.getUTCHours(),
    mi: vn.getUTCMinutes(),
    dow: vn.getUTCDay(), // 0=Chủ nhật, 1=Thứ 2, ..., 6=Thứ 7
  };
}

/** Build Date UTC từ y/m/d/h/mi giờ VN. */
function vnDate(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi: number,
): Date {
  return new Date(Date.UTC(y, mo, d, h, mi, 0) - VN_OFFSET_MS);
}

/** Cộng `days` ngày calendar VN. */
function addVnDays(parts: ReturnType<typeof vnParts>, days: number) {
  const d = new Date(Date.UTC(parts.y, parts.mo, parts.d + days, 0, 0, 0));
  return {
    y: d.getUTCFullYear(),
    mo: d.getUTCMonth(),
    d: d.getUTCDate(),
    dow: d.getUTCDay(),
  };
}

/**
 * Trả về parts cho "ngày làm việc kế tiếp": nếu hôm nay đang là weekday và
 * chưa qua workStart thì giữ nguyên hôm nay; còn lại nhảy ngày kế tiếp đến
 * khi không phải Chủ nhật/Thứ 7. Giả định weekend = T7+CN; nếu workEnd=0
 * (disabled) thì coi mọi ngày là làm việc.
 */
function nextWorkdayParts(
  now: ReturnType<typeof vnParts>,
  settings: SnoozeFrameSettings,
  startHour: number,
): { y: number; mo: number; d: number } {
  const treatAllDays =
    settings.workStartHour === 0 && settings.workEndHour === 0;
  let cursor: { y: number; mo: number; d: number; dow: number } = {
    y: now.y,
    mo: now.mo,
    d: now.d,
    dow: now.dow,
  };
  // nếu bây giờ đã >= startHour và là cuối tuần / sau giờ làm → nhảy sang ngày sau
  const todayIsWeekend = !treatAllDays && (cursor.dow === 0 || cursor.dow === 6);
  const pastStart = now.h >= startHour;
  if (todayIsWeekend || pastStart) {
    cursor = addVnDays(now, 1);
  }
  if (!treatAllDays) {
    while (cursor.dow === 0 || cursor.dow === 6) {
      cursor = addVnDays(cursor as ReturnType<typeof vnParts>, 1);
    }
  }
  return { y: cursor.y, mo: cursor.mo, d: cursor.d };
}

/** Snooze đến `targetHour` hôm nay (giờ VN); nếu đã qua thì sang mai. */
function snoozeToday(
  now: ReturnType<typeof vnParts>,
  targetHour: number,
): { y: number; mo: number; d: number; carriedToTomorrow: boolean } {
  if (now.h < targetHour || (now.h === targetHour && now.mi === 0)) {
    return {
      y: now.y,
      mo: now.mo,
      d: now.d,
      carriedToTomorrow: false,
    };
  }
  const tomorrow = addVnDays(now, 1);
  return { ...tomorrow, carriedToTomorrow: true };
}

const TRUA_KEYS = new Set([
  "den trua",
  "trua",
  "noon",
  "buoi trua",
]);
const CHIEU_KEYS = new Set([
  "den chieu",
  "chieu",
  "afternoon",
  "buoi chieu",
]);
const TOI_KEYS = new Set([
  "den toi",
  "toi",
  "evening",
  "buoi toi",
]);
const EOD_KEYS = new Set(["cuoi ngay", "eod", "het ngay"]);
const WORK_KEYS = new Set([
  "den gio lam",
  "gio lam",
  "morning",
  "den mai",
  "mai sang",
  "sang mai",
  "work",
  "den sang",
]);
const NEXT_WEEK_KEYS = new Set([
  "tuan sau",
  "next week",
  "thu 2 sau",
  "thu hai sau",
]);

export function parseSnoozeFrame(
  input: string,
  now: Date,
  settings: SnoozeFrameSettings,
): SnoozeFrameResult | null {
  const key = normalize(input);
  if (key.length === 0) return null;

  const parts = vnParts(now);

  if (TRUA_KEYS.has(key)) {
    const t = snoozeToday(parts, TRUA_HOUR);
    return {
      remindAt: vnDate(t.y, t.mo, t.d, TRUA_HOUR, 0),
      label: t.carriedToTomorrow ? "đến trưa mai (12h)" : "đến trưa (12h)",
    };
  }
  if (CHIEU_KEYS.has(key)) {
    const t = snoozeToday(parts, CHIEU_HOUR);
    return {
      remindAt: vnDate(t.y, t.mo, t.d, CHIEU_HOUR, 0),
      label: t.carriedToTomorrow ? "đến chiều mai (14h)" : "đến chiều (14h)",
    };
  }
  if (TOI_KEYS.has(key)) {
    const t = snoozeToday(parts, TOI_HOUR);
    return {
      remindAt: vnDate(t.y, t.mo, t.d, TOI_HOUR, 0),
      label: t.carriedToTomorrow ? "đến tối mai (19h)" : "đến tối (19h)",
    };
  }
  if (EOD_KEYS.has(key)) {
    const t = snoozeToday(parts, EOD_HOUR);
    return {
      remindAt: vnDate(t.y, t.mo, t.d, EOD_HOUR, 0),
      label: t.carriedToTomorrow
        ? "đến cuối ngày mai (23h)"
        : "đến cuối ngày (23h)",
    };
  }
  if (WORK_KEYS.has(key)) {
    const startHour =
      settings.workStartHour > 0 ? settings.workStartHour : DEFAULT_WORK_START;
    const target = nextWorkdayParts(parts, settings, startHour);
    return {
      remindAt: vnDate(target.y, target.mo, target.d, startHour, 0),
      label: `đến giờ làm (${startHour}h)`,
    };
  }
  if (NEXT_WEEK_KEYS.has(key)) {
    const startHour =
      settings.workStartHour > 0 ? settings.workStartHour : DEFAULT_WORK_START;
    // Thứ 2 kế tiếp
    let cursor = addVnDays(parts, 1);
    while (cursor.dow !== 1) {
      cursor = addVnDays(cursor as ReturnType<typeof vnParts>, 1);
    }
    return {
      remindAt: vnDate(cursor.y, cursor.mo, cursor.d, startHour, 0),
      label: `đến thứ 2 tuần sau (${startHour}h)`,
    };
  }

  return null;
}

/** Trả về danh sách frame keywords để hiển thị help. */
export function listSnoozeFrames(): string[] {
  return [
    "đến trưa",
    "đến chiều",
    "đến tối",
    "đến cuối ngày",
    "đến giờ làm",
    "tuần sau",
  ];
}
