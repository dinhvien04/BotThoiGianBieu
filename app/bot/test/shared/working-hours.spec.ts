import {
  getVietnamHour,
  isWithinWorkingHours,
  isWorkingHoursEnabled,
  nextWorkingStart,
} from "../../src/shared/utils/working-hours";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

const vnDate = (iso: string): Date => new Date(new Date(iso).getTime() - VN_OFFSET_MS);

describe("working-hours util", () => {
  describe("isWorkingHoursEnabled", () => {
    it("disabled when start === end", () => {
      expect(isWorkingHoursEnabled({ work_start_hour: 0, work_end_hour: 0 })).toBe(false);
      expect(isWorkingHoursEnabled({ work_start_hour: 8, work_end_hour: 8 })).toBe(false);
    });
    it("disabled when null/invalid", () => {
      expect(isWorkingHoursEnabled(null)).toBe(false);
      expect(isWorkingHoursEnabled(undefined)).toBe(false);
      expect(isWorkingHoursEnabled({ work_start_hour: -1, work_end_hour: 8 })).toBe(false);
      expect(isWorkingHoursEnabled({ work_start_hour: 8, work_end_hour: 25 })).toBe(false);
    });
    it("enabled when valid", () => {
      expect(isWorkingHoursEnabled({ work_start_hour: 8, work_end_hour: 18 })).toBe(true);
      expect(isWorkingHoursEnabled({ work_start_hour: 22, work_end_hour: 7 })).toBe(true);
    });
  });

  describe("getVietnamHour", () => {
    it("returns VN local hour", () => {
      // 2026-04-25 03:00 UTC = 10:00 VN
      expect(getVietnamHour(new Date("2026-04-25T03:00:00Z"))).toBe(10);
    });
    it("handles wrap across midnight", () => {
      // 2026-04-25 19:00 UTC = 02:00 VN ngày hôm sau
      expect(getVietnamHour(new Date("2026-04-25T19:00:00Z"))).toBe(2);
    });
  });

  describe("isWithinWorkingHours", () => {
    const hours = { work_start_hour: 8, work_end_hour: 18 };

    it("true when disabled", () => {
      expect(
        isWithinWorkingHours(new Date(), { work_start_hour: 0, work_end_hour: 0 }),
      ).toBe(true);
    });

    it("true at 10h VN with 8-18", () => {
      // VN 10h
      expect(isWithinWorkingHours(vnDate("2026-04-25T10:00:00Z"), hours)).toBe(true);
    });

    it("false at 23h VN with 8-18", () => {
      expect(isWithinWorkingHours(vnDate("2026-04-25T23:00:00Z"), hours)).toBe(false);
    });

    it("false at 18:00 VN with 8-18 (end-exclusive)", () => {
      expect(isWithinWorkingHours(vnDate("2026-04-25T18:00:00Z"), hours)).toBe(false);
    });

    it("overnight 22-7: true at 23h VN", () => {
      const overnight = { work_start_hour: 22, work_end_hour: 7 };
      expect(isWithinWorkingHours(vnDate("2026-04-25T23:00:00Z"), overnight)).toBe(true);
    });

    it("overnight 22-7: true at 5h VN", () => {
      const overnight = { work_start_hour: 22, work_end_hour: 7 };
      expect(isWithinWorkingHours(vnDate("2026-04-25T05:00:00Z"), overnight)).toBe(true);
    });

    it("overnight 22-7: false at 12h VN", () => {
      const overnight = { work_start_hour: 22, work_end_hour: 7 };
      expect(isWithinWorkingHours(vnDate("2026-04-25T12:00:00Z"), overnight)).toBe(false);
    });
  });

  describe("nextWorkingStart", () => {
    it("returns now when disabled", () => {
      const now = new Date("2026-04-25T03:00:00Z");
      expect(nextWorkingStart(now, { work_start_hour: 0, work_end_hour: 0 }).getTime())
        .toBe(now.getTime());
    });

    it("returns now when already in range", () => {
      const now = vnDate("2026-04-25T10:00:00Z"); // 10h VN
      const result = nextWorkingStart(now, { work_start_hour: 8, work_end_hour: 18 });
      expect(result.getTime()).toBe(now.getTime());
    });

    it("when at 23h VN with 8-18 → next 8h sáng mai", () => {
      const now = vnDate("2026-04-25T23:00:00Z"); // 23h VN ngày 25
      const result = nextWorkingStart(now, { work_start_hour: 8, work_end_hour: 18 });
      expect(getVietnamHour(result)).toBe(8);
      // 8h VN ngày 26 = 1h UTC ngày 26
      expect(result.toISOString()).toBe("2026-04-26T01:00:00.000Z");
    });

    it("when at 5h VN with 8-18 → 8h cùng ngày", () => {
      const now = vnDate("2026-04-25T05:00:00Z"); // 5h VN ngày 25
      const result = nextWorkingStart(now, { work_start_hour: 8, work_end_hour: 18 });
      expect(getVietnamHour(result)).toBe(8);
      expect(result.toISOString()).toBe("2026-04-25T01:00:00.000Z");
    });
  });
});
