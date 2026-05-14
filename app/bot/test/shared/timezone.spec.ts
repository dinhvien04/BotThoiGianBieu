import {
  formatInTimezone,
  formatOffset,
  getTimezoneOffsetMs,
  isValidTimezone,
  resolveTimezoneAlias,
} from "../../src/shared/utils/timezone";

describe("timezone utils", () => {
  describe("isValidTimezone", () => {
    it("accepts IANA names", () => {
      expect(isValidTimezone("Asia/Ho_Chi_Minh")).toBe(true);
      expect(isValidTimezone("Asia/Tokyo")).toBe(true);
      expect(isValidTimezone("Europe/London")).toBe(true);
      expect(isValidTimezone("UTC")).toBe(true);
    });

    it("rejects invalid names", () => {
      expect(isValidTimezone("Not/A_Zone")).toBe(false);
      expect(isValidTimezone("")).toBe(false);
      expect(isValidTimezone("garbage")).toBe(false);
    });
  });

  describe("resolveTimezoneAlias", () => {
    it("maps shorthand to IANA", () => {
      expect(resolveTimezoneAlias("vn")).toBe("Asia/Ho_Chi_Minh");
      expect(resolveTimezoneAlias("VN")).toBe("Asia/Ho_Chi_Minh");
      expect(resolveTimezoneAlias("New York")).toBe("America/New_York");
      expect(resolveTimezoneAlias("tokyo")).toBe("Asia/Tokyo");
      expect(resolveTimezoneAlias("UTC")).toBe("UTC");
    });

    it("returns input when no alias matches", () => {
      expect(resolveTimezoneAlias("Asia/Bangkok")).toBe("Asia/Bangkok");
      expect(resolveTimezoneAlias("Random/Zone")).toBe("Random/Zone");
    });
  });

  describe("getTimezoneOffsetMs", () => {
    it("returns +7h for VN", () => {
      const date = new Date("2026-04-25T00:00:00Z");
      expect(getTimezoneOffsetMs(date, "Asia/Ho_Chi_Minh")).toBe(
        7 * 60 * 60 * 1000,
      );
    });

    it("returns 0 for UTC", () => {
      const date = new Date("2026-04-25T00:00:00Z");
      expect(getTimezoneOffsetMs(date, "UTC")).toBe(0);
    });

    it("returns +9h for Tokyo", () => {
      const date = new Date("2026-04-25T00:00:00Z");
      expect(getTimezoneOffsetMs(date, "Asia/Tokyo")).toBe(
        9 * 60 * 60 * 1000,
      );
    });

    it("returns negative offset for NY (EST/EDT)", () => {
      const winter = new Date("2026-01-15T12:00:00Z");
      const summer = new Date("2026-07-15T12:00:00Z");
      // EST = UTC-5, EDT = UTC-4
      expect(getTimezoneOffsetMs(winter, "America/New_York")).toBe(
        -5 * 60 * 60 * 1000,
      );
      expect(getTimezoneOffsetMs(summer, "America/New_York")).toBe(
        -4 * 60 * 60 * 1000,
      );
    });
  });

  describe("formatOffset", () => {
    it("formats positive offset", () => {
      expect(formatOffset(7 * 60 * 60 * 1000)).toBe("+07:00");
      expect(formatOffset(0)).toBe("+00:00");
      expect(formatOffset(5.5 * 60 * 60 * 1000)).toBe("+05:30");
    });

    it("formats negative offset", () => {
      expect(formatOffset(-5 * 60 * 60 * 1000)).toBe("-05:00");
      expect(formatOffset(-3.5 * 60 * 60 * 1000)).toBe("-03:30");
    });
  });

  describe("formatInTimezone", () => {
    it("formats VN time", () => {
      // 00:00 UTC = 07:00 VN.
      expect(
        formatInTimezone(new Date("2026-04-25T00:00:00Z"), "Asia/Ho_Chi_Minh"),
      ).toBe("25/04/2026 07:00");
    });

    it("formats Tokyo time", () => {
      // 00:00 UTC = 09:00 JST.
      expect(
        formatInTimezone(new Date("2026-04-25T00:00:00Z"), "Asia/Tokyo"),
      ).toBe("25/04/2026 09:00");
    });
  });
});
