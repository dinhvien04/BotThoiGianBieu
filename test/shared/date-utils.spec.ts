import {
  parseVietnameseDate,
  startOfDay,
  endOfDay,
  dayRange,
  addDays,
  weekRange,
  formatDateShort,
  formatDateNoYear,
  formatTime,
} from '../../src/shared/utils/date-utils';

describe('date-utils', () => {
  describe('parseVietnameseDate', () => {
    it('should parse valid Vietnamese date format', () => {
      const result = parseVietnameseDate('24-4-2026');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(24);
      expect(result?.getMonth()).toBe(3); // April = 3 (0-indexed)
      expect(result?.getFullYear()).toBe(2026);
    });

    it('should parse date with leading zeros', () => {
      const result = parseVietnameseDate('01-01-2026');
      expect(result).toBeInstanceOf(Date);
      expect(result?.getDate()).toBe(1);
      expect(result?.getMonth()).toBe(0);
    });

    it('should return null for invalid format', () => {
      expect(parseVietnameseDate('2026-04-24')).toBeNull();
      expect(parseVietnameseDate('24/4/2026')).toBeNull();
      expect(parseVietnameseDate('invalid')).toBeNull();
      expect(parseVietnameseDate('')).toBeNull();
    });

    it('should return null for invalid date', () => {
      expect(parseVietnameseDate('31-2-2026')).toBeNull(); // Feb 31
      expect(parseVietnameseDate('32-1-2026')).toBeNull(); // Day 32
      expect(parseVietnameseDate('1-13-2026')).toBeNull(); // Month 13
    });
  });

  describe('startOfDay', () => {
    it('should return start of day', () => {
      const date = new Date('2026-04-24T14:30:45.123');
      const result = startOfDay(date);
      
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
      expect(result.getDate()).toBe(24);
    });
  });

  describe('endOfDay', () => {
    it('should return end of day', () => {
      const date = new Date('2026-04-24T14:30:45.123');
      const result = endOfDay(date);
      
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(59);
      expect(result.getSeconds()).toBe(59);
      expect(result.getMilliseconds()).toBe(999);
      expect(result.getDate()).toBe(24);
    });
  });

  describe('dayRange', () => {
    it('should return start and end of day', () => {
      const date = new Date('2026-04-24T14:30:00');
      const range = dayRange(date);
      
      expect(range.start.getHours()).toBe(0);
      expect(range.end.getHours()).toBe(23);
      expect(range.start.getDate()).toBe(24);
      expect(range.end.getDate()).toBe(24);
    });
  });

  describe('addDays', () => {
    it('should add positive days', () => {
      const date = new Date('2026-04-24T14:30:00');
      const result = addDays(date, 5);
      
      expect(result.getDate()).toBe(29);
      expect(result.getMonth()).toBe(3); // April
      expect(result.getHours()).toBe(14);
      expect(result.getMinutes()).toBe(30);
    });

    it('should add negative days', () => {
      const date = new Date('2026-04-24T14:30:00');
      const result = addDays(date, -5);
      
      expect(result.getDate()).toBe(19);
      expect(result.getMonth()).toBe(3); // April
    });

    it('should handle month boundaries', () => {
      const date = new Date('2026-04-30T14:30:00');
      const result = addDays(date, 1);
      
      expect(result.getDate()).toBe(1);
      expect(result.getMonth()).toBe(4); // May
    });

    it('should add zero days', () => {
      const date = new Date('2026-04-24T14:30:00');
      const result = addDays(date, 0);
      
      expect(result.getDate()).toBe(24);
      expect(result.getTime()).toBe(date.getTime());
    });
  });

  describe('weekRange', () => {
    it('should return Monday to Sunday for a weekday', () => {
      const thursday = new Date('2026-04-23T14:30:00'); // Thursday
      const range = weekRange(thursday);
      
      // Monday
      expect(range.start.getDate()).toBe(20);
      expect(range.start.getDay()).toBe(1);
      
      // Sunday
      expect(range.end.getDate()).toBe(26);
      expect(range.end.getDay()).toBe(0);
    });

    it('should handle Monday', () => {
      const monday = new Date('2026-04-20T14:30:00');
      const range = weekRange(monday);
      
      expect(range.start.getDate()).toBe(20);
      expect(range.start.getDay()).toBe(1);
    });

    it('should handle Sunday', () => {
      const sunday = new Date('2026-04-26T14:30:00');
      const range = weekRange(sunday);
      
      expect(range.start.getDate()).toBe(20);
      expect(range.start.getDay()).toBe(1);
      expect(range.end.getDate()).toBe(26);
    });

    it('should return full week range', () => {
      const date = new Date('2026-04-24T14:30:00');
      const range = weekRange(date);
      
      const daysDiff = (range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24);
      // Monday 00:00 → Sunday 23:59:59.999 = 6 ngày tròn + gần hết ngày.
      expect(Math.floor(daysDiff)).toBe(6);
    });
  });

  describe('formatDateShort', () => {
    it('should format date as D/M/YYYY', () => {
      const date = new Date('2026-04-24T14:30:00');
      expect(formatDateShort(date)).toBe('24/4/2026');
    });

    it('should not pad single digits', () => {
      const date = new Date('2026-01-05T14:30:00');
      expect(formatDateShort(date)).toBe('5/1/2026');
    });
  });

  describe('formatDateNoYear', () => {
    it('should format date as D/M', () => {
      const date = new Date('2026-04-24T14:30:00');
      expect(formatDateNoYear(date)).toBe('24/4');
    });

    it('should not pad single digits', () => {
      const date = new Date('2026-01-05T14:30:00');
      expect(formatDateNoYear(date)).toBe('5/1');
    });
  });

  describe('formatTime', () => {
    it('should format time as HH:MM', () => {
      const date = new Date('2026-04-24T14:30:00');
      expect(formatTime(date)).toBe('14:30');
    });

    it('should pad single digits', () => {
      const date = new Date('2026-04-24T09:05:00');
      expect(formatTime(date)).toBe('09:05');
    });

    it('should handle midnight', () => {
      const date = new Date('2026-04-24T00:00:00');
      expect(formatTime(date)).toBe('00:00');
    });
  });
});
