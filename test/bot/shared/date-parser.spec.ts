import { DateParser } from 'src/shared/utils/date-parser';

describe('DateParser', () => {
  let parser: DateParser;

  beforeEach(() => {
    parser = new DateParser();
  });

  describe('parseVietnamLocal', () => {
    it('should parse ISO datetime format', () => {
      const result = parser.parseVietnamLocal('2026-04-24T14:30');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(7); // 14:30 VN = 07:30 UTC
      expect(result?.getUTCMinutes()).toBe(30);
    });

    it('should parse ISO datetime with seconds', () => {
      const result = parser.parseVietnamLocal('2026-04-24T14:30:00');
      expect(result).toBeInstanceOf(Date);
    });

    it('should parse space-separated datetime', () => {
      const result = parser.parseVietnamLocal('2026-04-24 14:30');
      expect(result).toBeInstanceOf(Date);
    });

    it('should parse DD-MM-YYYY HH:MM format', () => {
      const result = parser.parseVietnamLocal('24-4-2026 14:30');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCDate()).toBe(24);
      expect(result?.getUTCMonth()).toBe(3); // April = 3 (0-indexed)
    });

    it('should parse DD/MM/YYYY HH:MM format', () => {
      const result = parser.parseVietnamLocal('24/4/2026 14:30');
      expect(result).toBeInstanceOf(Date);
    });

    it('should parse date only with default time 00:00', () => {
      const result = parser.parseVietnamLocal('24-4-2026');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(17); // 00:00 VN = 17:00 UTC (previous day)
    });

    it('should return null for invalid input', () => {
      expect(parser.parseVietnamLocal('invalid')).toBeNull();
      expect(parser.parseVietnamLocal('')).toBeNull();
      expect(parser.parseVietnamLocal(null)).toBeNull();
      expect(parser.parseVietnamLocal(undefined)).toBeNull();
    });

    it('should return null for invalid date', () => {
      expect(parser.parseVietnamLocal('31-2-2026')).toBeNull(); // Feb 31 doesn't exist
      expect(parser.parseVietnamLocal('32-1-2026')).toBeNull(); // Day 32 doesn't exist
    });

    it('should return null for invalid time', () => {
      expect(parser.parseVietnamLocal('24-4-2026 25:00')).toBeNull(); // Hour 25
      expect(parser.parseVietnamLocal('24-4-2026 14:60')).toBeNull(); // Minute 60
    });

    it('should handle single digit day and month', () => {
      const result = parser.parseVietnamLocal('1-1-2026 9:5');
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle leap year dates', () => {
      const result = parser.parseVietnamLocal('29-2-2024'); // 2024 is leap year
      expect(result).toBeInstanceOf(Date);
      // parseVietnamLocal coi input là giờ VN (UTC+7) nên UTC date sẽ lệch.
      // Round-trip qua formatVietnam (giờ VN) để verify đúng ngày gốc.
      expect(parser.formatVietnam(result!, false)).toBe('29/02/2024');
    });

    it('should reject Feb 29 on non-leap year', () => {
      const result = parser.parseVietnamLocal('29-2-2026'); // 2026 is not leap year
      expect(result).toBeNull();
    });

    it('should handle year boundaries', () => {
      const result = parser.parseVietnamLocal('31-12-2026 23:59');
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle month boundaries', () => {
      expect(parser.parseVietnamLocal('31-1-2026')).toBeInstanceOf(Date);
      expect(parser.parseVietnamLocal('30-4-2026')).toBeInstanceOf(Date);
      expect(parser.parseVietnamLocal('31-4-2026')).toBeNull(); // April has 30 days
    });

    it('should handle midnight', () => {
      const result = parser.parseVietnamLocal('24-4-2026 00:00');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(17); // 00:00 VN = 17:00 UTC previous day
    });

    it('should handle noon', () => {
      const result = parser.parseVietnamLocal('24-4-2026 12:00');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getUTCHours()).toBe(5); // 12:00 VN = 05:00 UTC
    });

    it('should handle end of day', () => {
      const result = parser.parseVietnamLocal('24-4-2026 23:59');
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle whitespace variations', () => {
      expect(parser.parseVietnamLocal('  24-4-2026 14:30  ')).toBeInstanceOf(Date);
      expect(parser.parseVietnamLocal('24-4-2026  14:30')).toBeInstanceOf(Date);
    });

    it('should reject partial dates', () => {
      expect(parser.parseVietnamLocal('24-4')).toBeNull();
      expect(parser.parseVietnamLocal('2026')).toBeNull();
    });

    it('should reject dates with wrong separators', () => {
      expect(parser.parseVietnamLocal('24.4.2026')).toBeNull();
      expect(parser.parseVietnamLocal('24 4 2026')).toBeNull();
    });

    it('should handle year 1970 (Unix epoch)', () => {
      const result = parser.parseVietnamLocal('1-1-1970 00:00');
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle year 9999 (max year)', () => {
      const result = parser.parseVietnamLocal('31-12-9999 23:59');
      expect(result).toBeInstanceOf(Date);
    });

    it('should reject year below 1970', () => {
      const result = parser.parseVietnamLocal('1-1-1969 00:00');
      expect(result).toBeNull();
    });

    it('should reject year above 9999', () => {
      const result = parser.parseVietnamLocal('1-1-10000 00:00');
      expect(result).toBeNull();
    });

    it('should handle ISO format with leading zeros', () => {
      const result = parser.parseVietnamLocal('2026-04-05T09:05');
      expect(result).toBeInstanceOf(Date);
    });

    it('should handle negative time offset correctly', () => {
      const result = parser.parseVietnamLocal('24-4-2026 01:00');
      expect(result).toBeInstanceOf(Date);
      // 01:00 VN = 18:00 UTC previous day
      expect(result?.getUTCHours()).toBe(18);
    });
  });

  describe('toDatetimeLocalVietnam', () => {
    it('should format date to datetime-local format', () => {
      const date = new Date('2026-04-24T07:30:00Z'); // UTC
      const result = parser.toDatetimeLocalVietnam(date);
      expect(result).toBe('2026-04-24T14:30'); // VN time
    });

    it('should pad single digits', () => {
      const date = new Date('2026-01-05T00:05:00Z'); // UTC
      const result = parser.toDatetimeLocalVietnam(date);
      expect(result).toBe('2026-01-05T07:05'); // VN time
    });
  });

  describe('formatMinutes', () => {
    it('should format minutes less than 60', () => {
      expect(parser.formatMinutes(30)).toBe('30 phút');
      expect(parser.formatMinutes(1)).toBe('1 phút');
      expect(parser.formatMinutes(59)).toBe('59 phút');
    });

    it('should format hours', () => {
      expect(parser.formatMinutes(60)).toBe('1 giờ');
      expect(parser.formatMinutes(120)).toBe('2 giờ');
      expect(parser.formatMinutes(90)).toBe('1 giờ 30 phút');
      expect(parser.formatMinutes(125)).toBe('2 giờ 5 phút');
    });

    it('should format days', () => {
      expect(parser.formatMinutes(1440)).toBe('1 ngày');
      expect(parser.formatMinutes(2880)).toBe('2 ngày');
      expect(parser.formatMinutes(1500)).toBe('1 ngày');
    });

    it('should handle negative values', () => {
      expect(parser.formatMinutes(-30)).toBe('30 phút');
      expect(parser.formatMinutes(-90)).toBe('1 giờ 30 phút');
    });

    it('should handle zero', () => {
      expect(parser.formatMinutes(0)).toBe('0 phút');
    });
  });

  describe('formatVietnam', () => {
    it('should format date with time', () => {
      const date = new Date('2026-04-24T07:30:00Z'); // UTC
      const result = parser.formatVietnam(date);
      expect(result).toBe('24/04/2026 14:30'); // VN time
    });

    it('should format date without time', () => {
      const date = new Date('2026-04-24T07:30:00Z');
      const result = parser.formatVietnam(date, false);
      expect(result).toBe('24/04/2026');
    });

    it('should pad single digits', () => {
      const date = new Date('2026-01-05T00:05:00Z');
      const result = parser.formatVietnam(date);
      expect(result).toBe('05/01/2026 07:05');
    });
  });

  describe('getTodayRangeVietnam', () => {
    it('should return start and end of today in VN timezone', () => {
      const now = new Date('2026-04-24T10:00:00Z'); // 17:00 VN time
      const range = parser.getTodayRangeVietnam(now);

      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);

      // Start should be 00:00 VN = 17:00 UTC previous day
      expect(range.start.getUTCHours()).toBe(17);
      expect(range.start.getUTCMinutes()).toBe(0);

      // End should be 23:59:59.999 VN = 16:59:59.999 UTC same day
      expect(range.end.getUTCHours()).toBe(16);
      expect(range.end.getUTCMinutes()).toBe(59);
      expect(range.end.getUTCSeconds()).toBe(59);
    });

    it('should use current date when no date provided', () => {
      const range = parser.getTodayRangeVietnam();
      expect(range.start).toBeInstanceOf(Date);
      expect(range.end).toBeInstanceOf(Date);
      expect(range.end.getTime()).toBeGreaterThan(range.start.getTime());
    });
  });
});
