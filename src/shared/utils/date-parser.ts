import { Injectable } from '@nestjs/common';

/**
 * Parse & format ngày giờ trong múi giờ Việt Nam (Asia/Ho_Chi_Minh, UTC+7).
 *
 * Quy ước: người dùng nhập/nhìn giờ Việt Nam, nhưng lưu DB dưới dạng UTC.
 */
@Injectable()
export class DateParser {
  private static readonly VN_OFFSET_HOURS = 7;
  private static readonly VN_OFFSET_MS = DateParser.VN_OFFSET_HOURS * 60 * 60 * 1000;

  /**
   * Parse nhiều định dạng datetime người dùng nhập và coi là giờ Việt Nam.
   * Trả về Date (UTC) tương ứng, hoặc null nếu không parse được.
   *
   * Định dạng hỗ trợ:
   *   - "2026-04-23T14:30" / "2026-04-23T14:30:00" (HTML datetime-local)
   *   - "2026-04-23 14:30"
   *   - "23-4-2026 14:30" / "23/4/2026 14:30"
   *   - "23-4-2026" (mặc định 00:00)
   */
  parseVietnamLocal(input: string | null | undefined): Date | null {
    if (!input) return null;
    const trimmed = input.trim();
    if (!trimmed) return null;

    const parts = this.extractParts(trimmed);
    if (!parts) return null;

    const { year, month, day, hour, minute } = parts;

    if (!this.isValidYMD(year, month, day)) return null;
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return null;

    // Tạo Date coi input là giờ VN (UTC+7): chuyển về UTC bằng Date.UTC rồi trừ 7h
    const utcMs = Date.UTC(year, month - 1, day, hour, minute) - DateParser.VN_OFFSET_MS;
    return new Date(utcMs);
  }

  /**
   * Convert Date → "YYYY-MM-DDTHH:MM" giờ Việt Nam — đúng format mà HTML
   * input `datetime-local` yêu cầu, dùng làm `defaultValue` trong form.
   */
  toDatetimeLocalVietnam(date: Date): string {
    const vn = new Date(date.getTime() + DateParser.VN_OFFSET_MS);
    const pad = (n: number) => String(n).padStart(2, '0');
    return (
      `${vn.getUTCFullYear()}-${pad(vn.getUTCMonth() + 1)}-${pad(vn.getUTCDate())}` +
      `T${pad(vn.getUTCHours())}:${pad(vn.getUTCMinutes())}`
    );
  }

  /**
   * Format số phút → "X phút" / "Y giờ Z phút" / "D ngày" ở dạng human-readable.
   * Dùng cho message nhắc/thông báo.
   */
  formatMinutes(minutes: number): string {
    const abs = Math.abs(minutes);
    if (abs < 60) return `${abs} phút`;
    if (abs < 60 * 24) {
      const h = Math.floor(abs / 60);
      const m = abs % 60;
      return m > 0 ? `${h} giờ ${m} phút` : `${h} giờ`;
    }
    const days = Math.floor(abs / (60 * 24));
    return `${days} ngày`;
  }

  /** Định dạng Date → "DD/MM/YYYY HH:mm" giờ Việt Nam. */
  formatVietnam(date: Date, withTime = true): string {
    const vn = new Date(date.getTime() + DateParser.VN_OFFSET_MS);
    const dd = String(vn.getUTCDate()).padStart(2, '0');
    const mm = String(vn.getUTCMonth() + 1).padStart(2, '0');
    const yyyy = vn.getUTCFullYear();
    if (!withTime) return `${dd}/${mm}/${yyyy}`;
    const hh = String(vn.getUTCHours()).padStart(2, '0');
    const mi = String(vn.getUTCMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${yyyy} ${hh}:${mi}`;
  }

  /** Định dạng Date → "DD/MM/YYYY" giờ Việt Nam. */
  formatVietnamDate(date: Date): string {
    return this.formatVietnam(date, false);
  }

  /** Định dạng Date → "HH:mm" giờ Việt Nam. */
  formatVietnamTime(date: Date): string {
    const vn = new Date(date.getTime() + DateParser.VN_OFFSET_MS);
    const hh = String(vn.getUTCHours()).padStart(2, '0');
    const mi = String(vn.getUTCMinutes()).padStart(2, '0');
    return `${hh}:${mi}`;
  }

  /** Lấy khoảng ngày hôm nay theo giờ VN, trả [startUTC, endUTC]. */
  getTodayRangeVietnam(now: Date = new Date()): { start: Date; end: Date } {
    const vn = new Date(now.getTime() + DateParser.VN_OFFSET_MS);
    const y = vn.getUTCFullYear();
    const m = vn.getUTCMonth();
    const d = vn.getUTCDate();
    const startVn = Date.UTC(y, m, d, 0, 0, 0);
    const endVn = Date.UTC(y, m, d, 23, 59, 59, 999);
    return {
      start: new Date(startVn - DateParser.VN_OFFSET_MS),
      end: new Date(endVn - DateParser.VN_OFFSET_MS),
    };
  }

  private extractParts(s: string): {
    year: number;
    month: number;
    day: number;
    hour: number;
    minute: number;
  } | null {
    // ISO-ish: YYYY-MM-DD[T ]HH:MM[:SS]
    const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})[T ](\d{1,2}):(\d{1,2})(?::\d{1,2})?$/;
    const mIso = iso.exec(s);
    if (mIso) {
      return {
        year: Number(mIso[1]),
        month: Number(mIso[2]),
        day: Number(mIso[3]),
        hour: Number(mIso[4]),
        minute: Number(mIso[5]),
      };
    }

    // ISO date only: YYYY-MM-DD
    const isoDate = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;
    const mIsoDate = isoDate.exec(s);
    if (mIsoDate) {
      return {
        year: Number(mIsoDate[1]),
        month: Number(mIsoDate[2]),
        day: Number(mIsoDate[3]),
        hour: 0,
        minute: 0,
      };
    }

    // DD-MM-YYYY HH:MM or DD/MM/YYYY HH:MM
    const dmy = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})\s+(\d{1,2}):(\d{1,2})$/;
    const mDmy = dmy.exec(s);
    if (mDmy) {
      return {
        year: Number(mDmy[3]),
        month: Number(mDmy[2]),
        day: Number(mDmy[1]),
        hour: Number(mDmy[4]),
        minute: Number(mDmy[5]),
      };
    }

    // DD-MM-YYYY only
    const dmyOnly = /^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/;
    const mDmyOnly = dmyOnly.exec(s);
    if (mDmyOnly) {
      return {
        year: Number(mDmyOnly[3]),
        month: Number(mDmyOnly[2]),
        day: Number(mDmyOnly[1]),
        hour: 0,
        minute: 0,
      };
    }

    return null;
  }

  private isValidYMD(y: number, m: number, d: number): boolean {
    if (y < 1970 || y > 9999) return false;
    if (m < 1 || m > 12) return false;
    if (d < 1 || d > 31) return false;
    // Validate ngày có tồn tại thật không (vd: 31/2)
    const dt = new Date(Date.UTC(y, m - 1, d));
    return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
  }
}
