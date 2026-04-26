/**
 * Working hours: user đặt khung [start, end) giờ VN. Reminder rơi ngoài
 * khung sẽ bị "dồn" về `start` của ngày làm việc kế tiếp.
 *
 * Quy ước:
 * - `start === end` → coi như tắt (ping 24/7).
 * - 0 <= start, end <= 24. (24 = nửa đêm hôm sau).
 * - Nếu `start < end` (vd 8-18) → khung 1 đoạn trong ngày.
 * - Nếu `start > end` (vd 22-7) → khung qua đêm; "trong giờ" = giờ VN
 *   >= start HOẶC giờ VN < end.
 */

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

export interface WorkingHours {
  work_start_hour: number;
  work_end_hour: number;
}

/**
 * Hợp lệ + đã bật?
 */
export function isWorkingHoursEnabled(
  settings: WorkingHours | null | undefined,
): boolean {
  if (!settings) return false;
  const { work_start_hour: s, work_end_hour: e } = settings;
  if (!Number.isInteger(s) || !Number.isInteger(e)) return false;
  if (s < 0 || s > 24 || e < 0 || e > 24) return false;
  return s !== e;
}

/**
 * Date `now` có rơi trong khung working hours của user không (giờ VN).
 * Nếu disabled (start === end) → luôn true.
 */
export function isWithinWorkingHours(
  now: Date,
  settings: WorkingHours | null | undefined,
): boolean {
  if (!isWorkingHoursEnabled(settings)) return true;
  const s = settings!.work_start_hour;
  const e = settings!.work_end_hour;
  const vnHour = getVietnamHour(now);
  if (s < e) {
    // 8..18 → trong khung khi 8 <= h < 18
    return vnHour >= s && vnHour < e;
  }
  // 22..7 → trong khung khi h >= 22 || h < 7
  return vnHour >= s || vnHour < e;
}

/**
 * Trả về giờ VN của Date (0..23).
 */
export function getVietnamHour(d: Date): number {
  return new Date(d.getTime() + VN_OFFSET_MS).getUTCHours();
}

/**
 * Tính moment "next working start" tính từ `now` (UTC). Nếu user đã ở
 * trong giờ làm việc → trả `now` (không cần dồn). Nếu disabled → trả
 * `now`.
 *
 * Logic: chuyển sang VN, tìm Date có giờ VN === `work_start_hour` ở
 * tương lai gần nhất, rồi trả lại UTC.
 */
export function nextWorkingStart(
  now: Date,
  settings: WorkingHours | null | undefined,
): Date {
  if (!isWorkingHoursEnabled(settings)) return new Date(now);
  if (isWithinWorkingHours(now, settings)) return new Date(now);

  const vn = new Date(now.getTime() + VN_OFFSET_MS);
  const target = new Date(vn);
  target.setUTCHours(settings!.work_start_hour, 0, 0, 0);

  // Nếu mục tiêu đã qua trong "ngày VN" này → đẩy sang ngày VN kế tiếp
  if (target.getTime() <= vn.getTime()) {
    target.setUTCDate(target.getUTCDate() + 1);
  }

  return new Date(target.getTime() - VN_OFFSET_MS);
}
