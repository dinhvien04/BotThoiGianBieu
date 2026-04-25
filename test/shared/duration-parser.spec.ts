import { parseDurationMinutes } from '../../src/shared/utils/duration-parser';

describe('parseDurationMinutes', () => {
  describe('bare integers (minutes)', () => {
    it('should parse a positive integer as minutes', () => {
      expect(parseDurationMinutes('30')).toBe(30);
      expect(parseDurationMinutes('1')).toBe(1);
      expect(parseDurationMinutes('1440')).toBe(1440);
    });

    it('should reject zero', () => {
      expect(parseDurationMinutes('0')).toBeNull();
    });

    it('should reject negative or non-integer', () => {
      expect(parseDurationMinutes('-5')).toBeNull();
      expect(parseDurationMinutes('1.5')).toBeNull();
    });
  });

  describe('short units', () => {
    it('should parse p/m as minutes', () => {
      expect(parseDurationMinutes('30p')).toBe(30);
      expect(parseDurationMinutes('30m')).toBe(30);
      expect(parseDurationMinutes('1p')).toBe(1);
    });

    it('should parse h as hours', () => {
      expect(parseDurationMinutes('2h')).toBe(120);
      expect(parseDurationMinutes('1h')).toBe(60);
    });

    it('should parse d as days', () => {
      expect(parseDurationMinutes('1d')).toBe(1440);
      expect(parseDurationMinutes('3d')).toBe(3 * 1440);
    });
  });

  describe('Vietnamese units', () => {
    it('should parse "phút" and "phut"', () => {
      expect(parseDurationMinutes('30phut')).toBe(30);
      expect(parseDurationMinutes('30phút')).toBe(30);
    });

    it('should parse "giờ" and "gio"', () => {
      expect(parseDurationMinutes('2gio')).toBe(120);
      expect(parseDurationMinutes('2giờ')).toBe(120);
    });

    it('should parse "ngày" and "ngay"', () => {
      expect(parseDurationMinutes('1ngay')).toBe(1440);
      expect(parseDurationMinutes('1ngày')).toBe(1440);
    });
  });

  describe('compound durations', () => {
    it('should sum hours + minutes', () => {
      expect(parseDurationMinutes('2h30p')).toBe(150);
      expect(parseDurationMinutes('1h15m')).toBe(75);
    });

    it('should sum days + hours + minutes', () => {
      expect(parseDurationMinutes('1d12h')).toBe(1440 + 12 * 60);
      expect(parseDurationMinutes('1d2h30p')).toBe(1440 + 2 * 60 + 30);
    });

    it('should sum Vietnamese compound', () => {
      expect(parseDurationMinutes('1ngày12giờ')).toBe(1440 + 720);
      expect(parseDurationMinutes('2giờ30phút')).toBe(150);
    });
  });

  describe('whitespace tolerance', () => {
    it('should ignore spaces between tokens', () => {
      expect(parseDurationMinutes('2h 30p')).toBe(150);
      expect(parseDurationMinutes(' 30 phút ')).toBe(30);
      expect(parseDurationMinutes('1 ngày 12 giờ')).toBe(1440 + 720);
    });
  });

  describe('case insensitivity', () => {
    it('should accept uppercase units', () => {
      expect(parseDurationMinutes('30P')).toBe(30);
      expect(parseDurationMinutes('2H30P')).toBe(150);
      expect(parseDurationMinutes('1D')).toBe(1440);
    });
  });

  describe('invalid input', () => {
    it('should return null for null/undefined/empty', () => {
      expect(parseDurationMinutes(null)).toBeNull();
      expect(parseDurationMinutes(undefined)).toBeNull();
      expect(parseDurationMinutes('')).toBeNull();
      expect(parseDurationMinutes('   ')).toBeNull();
    });

    it('should return null for unknown unit', () => {
      expect(parseDurationMinutes('30x')).toBeNull();
      expect(parseDurationMinutes('5tuần')).toBeNull();
    });

    it('should return null when tokens do not cover the full string', () => {
      expect(parseDurationMinutes('abc30p')).toBeNull();
      expect(parseDurationMinutes('30pxyz')).toBeNull();
    });

    it('should return null for missing numeric part', () => {
      expect(parseDurationMinutes('phút')).toBeNull();
      expect(parseDurationMinutes('p')).toBeNull();
    });

    it('should return null when total equals zero', () => {
      expect(parseDurationMinutes('0p')).toBeNull();
      expect(parseDurationMinutes('0h0p')).toBeNull();
    });
  });
});
