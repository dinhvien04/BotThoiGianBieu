import {
  addMonthsUtc,
  computeNextOccurrence,
  formatRecurrence,
  parseRecurrenceType,
} from '../../src/shared/utils/recurrence';

describe('recurrence utils', () => {
  describe('addMonthsUtc', () => {
    it('should add whole months when target month has the same day-of-month', () => {
      const d = new Date('2026-01-15T08:00:00Z');
      const r = addMonthsUtc(d, 1);
      expect(r.toISOString()).toBe('2026-02-15T08:00:00.000Z');
    });

    it('should clamp to last day when target month does not have the day', () => {
      const jan31 = new Date('2026-01-31T08:00:00Z');
      const feb = addMonthsUtc(jan31, 1);
      expect(feb.toISOString()).toBe('2026-02-28T08:00:00.000Z');
    });

    it('should handle leap year February', () => {
      const jan31 = new Date('2024-01-31T08:00:00Z');
      const feb = addMonthsUtc(jan31, 1);
      expect(feb.toISOString()).toBe('2024-02-29T08:00:00.000Z');
    });

    it('should handle multi-month jumps that cross year boundary', () => {
      const d = new Date('2026-11-30T00:00:00Z');
      const r = addMonthsUtc(d, 3);
      expect(r.toISOString()).toBe('2027-02-28T00:00:00.000Z');
    });

    it('should not mutate the input date', () => {
      const d = new Date('2026-01-15T08:00:00Z');
      const snapshot = d.toISOString();
      addMonthsUtc(d, 5);
      expect(d.toISOString()).toBe(snapshot);
    });
  });

  describe('computeNextOccurrence', () => {
    const from = new Date('2026-04-15T08:00:00Z');

    it('should return null for none', () => {
      expect(computeNextOccurrence(from, 'none', 1)).toBeNull();
    });

    it('should add days for daily', () => {
      const r = computeNextOccurrence(from, 'daily', 1);
      expect(r?.toISOString()).toBe('2026-04-16T08:00:00.000Z');
    });

    it('should add N*7 days for weekly', () => {
      const r = computeNextOccurrence(from, 'weekly', 2);
      expect(r?.toISOString()).toBe('2026-04-29T08:00:00.000Z');
    });

    it('should add calendar months for monthly', () => {
      const r = computeNextOccurrence(from, 'monthly', 1);
      expect(r?.toISOString()).toBe('2026-05-15T08:00:00.000Z');
    });

    it('should clamp monthly to end of target month', () => {
      const jan31 = new Date('2026-01-31T08:00:00Z');
      const r = computeNextOccurrence(jan31, 'monthly', 1);
      expect(r?.toISOString()).toBe('2026-02-28T08:00:00.000Z');
    });

    it('should reject non-positive interval', () => {
      expect(computeNextOccurrence(from, 'daily', 0)).toBeNull();
      expect(computeNextOccurrence(from, 'weekly', -1)).toBeNull();
    });

    it('should reject non-integer interval', () => {
      expect(computeNextOccurrence(from, 'daily', 1.5)).toBeNull();
    });
  });

  describe('formatRecurrence', () => {
    it('should label none', () => {
      expect(formatRecurrence('none', 1)).toBe('Không lặp');
    });

    it('should format daily/weekly/monthly with interval 1', () => {
      expect(formatRecurrence('daily', 1)).toBe('Hàng ngày');
      expect(formatRecurrence('weekly', 1)).toBe('Hàng tuần');
      expect(formatRecurrence('monthly', 1)).toBe('Hàng tháng');
    });

    it('should format with interval > 1', () => {
      expect(formatRecurrence('daily', 3)).toBe('Mỗi 3 ngày');
      expect(formatRecurrence('weekly', 2)).toBe('Mỗi 2 tuần');
      expect(formatRecurrence('monthly', 6)).toBe('Mỗi 6 tháng');
    });
  });

  describe('parseRecurrenceType', () => {
    it('should parse English aliases', () => {
      expect(parseRecurrenceType('daily')).toBe('daily');
      expect(parseRecurrenceType('weekly')).toBe('weekly');
      expect(parseRecurrenceType('monthly')).toBe('monthly');
      expect(parseRecurrenceType('d')).toBe('daily');
      expect(parseRecurrenceType('w')).toBe('weekly');
      expect(parseRecurrenceType('m')).toBe('monthly');
    });

    it('should parse Vietnamese with/without diacritics', () => {
      expect(parseRecurrenceType('ngày')).toBe('daily');
      expect(parseRecurrenceType('ngay')).toBe('daily');
      expect(parseRecurrenceType('tuần')).toBe('weekly');
      expect(parseRecurrenceType('tuan')).toBe('weekly');
      expect(parseRecurrenceType('tháng')).toBe('monthly');
      expect(parseRecurrenceType('thang')).toBe('monthly');
    });

    it('should strip "hàng"/"mỗi" prefix', () => {
      expect(parseRecurrenceType('hàng-ngày')).toBe('daily');
      expect(parseRecurrenceType('hang tuan')).toBe('weekly');
      expect(parseRecurrenceType('mỗi tháng')).toBe('monthly');
    });

    it('should parse none', () => {
      expect(parseRecurrenceType('none')).toBe('none');
      expect(parseRecurrenceType('không')).toBe('none');
      expect(parseRecurrenceType('khong')).toBe('none');
    });

    it('should return null for unknown', () => {
      expect(parseRecurrenceType('yearly')).toBeNull();
      expect(parseRecurrenceType('abc')).toBeNull();
      expect(parseRecurrenceType('')).toBeNull();
    });
  });
});
