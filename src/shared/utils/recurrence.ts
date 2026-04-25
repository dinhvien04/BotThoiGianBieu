import { RecurrenceType } from "../../schedules/entities/schedule.entity";

/**
 * Cộng thêm `months` tháng vào `date` theo UTC, tự clamp khi target month
 * không có ngày đó (vd Jan 31 + 1 → Feb 28/29 thay vì rolling sang tháng 3).
 */
export function addMonthsUtc(date: Date, months: number): Date {
  const result = new Date(date.getTime());
  const originalDay = result.getUTCDate();
  result.setUTCMonth(result.getUTCMonth() + months);
  if (result.getUTCDate() !== originalDay) {
    // overflow → rewind về ngày cuối tháng đích
    result.setUTCDate(0);
  }
  return result;
}

/**
 * Tính thời điểm của lần xuất hiện kế tiếp dựa trên `from` + quy tắc lặp.
 * Trả `null` nếu `type = 'none'` hoặc không hợp lệ.
 */
export function computeNextOccurrence(
  from: Date,
  type: RecurrenceType,
  interval: number,
): Date | null {
  if (type === "none" || !Number.isInteger(interval) || interval < 1) {
    return null;
  }

  switch (type) {
    case "daily":
      return new Date(from.getTime() + interval * 24 * 60 * 60 * 1000);
    case "weekly":
      return new Date(from.getTime() + interval * 7 * 24 * 60 * 60 * 1000);
    case "monthly":
      return addMonthsUtc(from, interval);
    default:
      return null;
  }
}

/**
 * Mô tả ngắn gọn chu kỳ lặp dạng tiếng Việt.
 * Vd: "Hàng ngày", "Mỗi 2 tuần", "Hàng tháng".
 */
export function formatRecurrence(
  type: RecurrenceType,
  interval: number,
): string {
  if (type === "none") return "Không lặp";

  const unit = recurrenceUnitLabel(type);
  if (interval <= 1) {
    return `Hàng ${unit}`;
  }
  return `Mỗi ${interval} ${unit}`;
}

function recurrenceUnitLabel(type: RecurrenceType): string {
  switch (type) {
    case "daily":
      return "ngày";
    case "weekly":
      return "tuần";
    case "monthly":
      return "tháng";
    case "none":
    default:
      return "";
  }
}

/**
 * Parse một chuỗi user nhập → `RecurrenceType`. Chấp nhận tiếng Việt thân
 * thiện (vd "ngày", "tuan", "hàng-tháng") lẫn aliases tiếng Anh. Trả null
 * nếu không parse được.
 */
export function parseRecurrenceType(input: string): RecurrenceType | null {
  if (!input) return null;
  const normalized = input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "")
    .replace(/-/g, "")
    // Chỉ strip prefix "hàng" / "mỗi" ở đầu chuỗi để tránh ăn vào các từ
    // chứa chuỗi con như "thang" (chứa "hang").
    .replace(/^hàng/, "")
    .replace(/^hang/, "")
    .replace(/^mỗi/, "")
    .replace(/^moi/, "");

  switch (normalized) {
    case "none":
    case "khong":
    case "không":
      return "none";
    case "d":
    case "day":
    case "daily":
    case "ngay":
    case "ngày":
      return "daily";
    case "w":
    case "week":
    case "weekly":
    case "tuan":
    case "tuần":
      return "weekly";
    case "m":
    case "month":
    case "monthly":
    case "thang":
    case "tháng":
      return "monthly";
    default:
      return null;
  }
}
