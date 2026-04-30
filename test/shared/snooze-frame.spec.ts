import {
  parseSnoozeFrame,
  listSnoozeFrames,
} from "../../src/shared/utils/snooze-frame";

const VN_OFFSET_MS = 7 * 60 * 60 * 1000;

/** Build Date UTC tương ứng giờ VN. */
function vnNow(
  y: number,
  mo: number,
  d: number,
  h: number,
  mi = 0,
): Date {
  return new Date(Date.UTC(y, mo - 1, d, h, mi, 0) - VN_OFFSET_MS);
}

const NO_WORK = { workStartHour: 0, workEndHour: 0 };
const WORK_8_18 = { workStartHour: 8, workEndHour: 18 };

describe("parseSnoozeFrame", () => {
  it("returns null for unknown input", () => {
    expect(parseSnoozeFrame("30p", vnNow(2026, 4, 25, 10), NO_WORK)).toBeNull();
    expect(parseSnoozeFrame("hello", vnNow(2026, 4, 25, 10), NO_WORK)).toBeNull();
    expect(parseSnoozeFrame("", vnNow(2026, 4, 25, 10), NO_WORK)).toBeNull();
  });

  it("đến tối from morning → today 19:00 VN", () => {
    const now = vnNow(2026, 4, 25, 10); // 25/4/2026 10:00 VN (Saturday)
    const r = parseSnoozeFrame("đến tối", now, NO_WORK)!;
    // 25/4 19:00 VN = 25/4 12:00 UTC
    expect(r.remindAt.toISOString()).toBe("2026-04-25T12:00:00.000Z");
    expect(r.label).toMatch(/tối/);
  });

  it("đến tối after 19h → tomorrow 19:00 VN", () => {
    const now = vnNow(2026, 4, 25, 22);
    const r = parseSnoozeFrame("toi", now, NO_WORK)!;
    expect(r.remindAt.toISOString()).toBe("2026-04-26T12:00:00.000Z");
    expect(r.label).toMatch(/tối mai/);
  });

  it("đến trưa returns 12:00 VN", () => {
    const now = vnNow(2026, 4, 25, 9);
    const r = parseSnoozeFrame("đến trưa", now, NO_WORK)!;
    expect(r.remindAt.toISOString()).toBe("2026-04-25T05:00:00.000Z");
  });

  it("đến giờ làm with work_start=8, weekday past 8h → next day 8h", () => {
    const now = vnNow(2026, 4, 27, 14); // Monday 14:00
    const r = parseSnoozeFrame("đến giờ làm", now, WORK_8_18)!;
    // Tuesday 28/4 8:00 VN = 28/4 01:00 UTC
    expect(r.remindAt.toISOString()).toBe("2026-04-28T01:00:00.000Z");
    expect(r.label).toMatch(/8h/);
  });

  it("đến giờ làm before workStart → today workStart", () => {
    const now = vnNow(2026, 4, 27, 6); // Monday 6:00
    const r = parseSnoozeFrame("gio lam", now, WORK_8_18)!;
    expect(r.remindAt.toISOString()).toBe("2026-04-27T01:00:00.000Z");
  });

  it("đến giờ làm Saturday → skip to Monday", () => {
    const now = vnNow(2026, 4, 25, 10); // Saturday 25/4/2026
    const r = parseSnoozeFrame("đến giờ làm", now, WORK_8_18)!;
    // Monday 27/4/2026 8:00 VN
    expect(r.remindAt.toISOString()).toBe("2026-04-27T01:00:00.000Z");
  });

  it("đến giờ làm with no working hours configured uses default 9h", () => {
    const now = vnNow(2026, 4, 27, 14);
    const r = parseSnoozeFrame("đến giờ làm", now, NO_WORK)!;
    // 28/4 9:00 VN = 28/4 02:00 UTC
    expect(r.remindAt.toISOString()).toBe("2026-04-28T02:00:00.000Z");
    expect(r.label).toMatch(/9h/);
  });

  it("đến cuối ngày → today 23:00", () => {
    const now = vnNow(2026, 4, 25, 14);
    const r = parseSnoozeFrame("cuoi ngay", now, NO_WORK)!;
    // 25/4 23:00 VN = 25/4 16:00 UTC
    expect(r.remindAt.toISOString()).toBe("2026-04-25T16:00:00.000Z");
  });

  it("tuần sau jumps to next Monday", () => {
    const now = vnNow(2026, 4, 25, 10); // Saturday 25/4
    const r = parseSnoozeFrame("tuần sau", now, WORK_8_18)!;
    // Monday 27/4 8:00 VN = 27/4 01:00 UTC
    expect(r.remindAt.toISOString()).toBe("2026-04-27T01:00:00.000Z");
  });

  it("tuần sau on Monday jumps to next Monday", () => {
    const now = vnNow(2026, 4, 27, 10); // Monday
    const r = parseSnoozeFrame("tuan sau", now, WORK_8_18)!;
    // Monday 4/5 8:00 VN
    expect(r.remindAt.toISOString()).toBe("2026-05-04T01:00:00.000Z");
  });

  it("supports lowercase ASCII without diacritics", () => {
    const now = vnNow(2026, 4, 25, 10);
    expect(parseSnoozeFrame("DEN TOI", now, NO_WORK)).not.toBeNull();
    expect(parseSnoozeFrame("toi", now, NO_WORK)).not.toBeNull();
    expect(parseSnoozeFrame("Đến Tối", now, NO_WORK)).not.toBeNull();
  });
});

describe("listSnoozeFrames", () => {
  it("returns non-empty list", () => {
    const frames = listSnoozeFrames();
    expect(frames.length).toBeGreaterThan(0);
    expect(frames).toContain("đến tối");
    expect(frames).toContain("đến giờ làm");
  });
});
