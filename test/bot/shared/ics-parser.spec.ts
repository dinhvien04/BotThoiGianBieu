import {
  parseIcs,
  parseIcsDateTime,
  parseRrule,
} from "src/shared/utils/ics-parser";

describe("parseIcsDateTime", () => {
  it("UTC datetime", () => {
    const r = parseIcsDateTime("20260425T020000Z", {})!;
    expect(r.allDay).toBe(false);
    expect(r.date.toISOString()).toBe("2026-04-25T02:00:00.000Z");
  });

  it("floating datetime treated as VN local", () => {
    const r = parseIcsDateTime("20260425T090000", {})!;
    // 09:00 VN = 02:00 UTC
    expect(r.date.toISOString()).toBe("2026-04-25T02:00:00.000Z");
  });

  it("TZID Asia/Ho_Chi_Minh treated as VN", () => {
    const r = parseIcsDateTime("20260425T090000", {
      TZID: "Asia/Ho_Chi_Minh",
    })!;
    expect(r.date.toISOString()).toBe("2026-04-25T02:00:00.000Z");
  });

  it("DATE-only value → 00:00 VN, allDay=true", () => {
    const r = parseIcsDateTime("20260425", { VALUE: "DATE" })!;
    expect(r.allDay).toBe(true);
    // 00:00 VN = -7h UTC = previous day 17:00
    expect(r.date.toISOString()).toBe("2026-04-24T17:00:00.000Z");
  });

  it("returns null for invalid format", () => {
    expect(parseIcsDateTime("garbage", {})).toBeNull();
  });
});

describe("parseIcs", () => {
  const sample = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//EN
BEGIN:VEVENT
UID:event-1@test
SUMMARY:Họp team
DESCRIPTION:Sprint review\\nTuần 17
DTSTART:20260425T020000Z
DTEND:20260425T030000Z
END:VEVENT
BEGIN:VEVENT
UID:event-2@test
SUMMARY:Sinh nhật
DTSTART;VALUE=DATE:20260501
END:VEVENT
END:VCALENDAR`;

  it("parses 2 events with correct fields", () => {
    const r = parseIcs(sample);
    expect(r.events).toHaveLength(2);
    expect(r.errors).toHaveLength(0);

    const e1 = r.events[0];
    expect(e1.uid).toBe("event-1@test");
    expect(e1.summary).toBe("Họp team");
    expect(e1.description).toBe("Sprint review\nTuần 17");
    expect(e1.start.toISOString()).toBe("2026-04-25T02:00:00.000Z");
    expect(e1.end?.toISOString()).toBe("2026-04-25T03:00:00.000Z");
    expect(e1.allDay).toBe(false);

    const e2 = r.events[1];
    expect(e2.summary).toBe("Sinh nhật");
    expect(e2.allDay).toBe(true);
    expect(e2.end).toBeNull();
  });

  it("unfolds folded lines per RFC 5545", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Title
 continued
DTSTART:20260425T020000Z
END:VEVENT
END:VCALENDAR`;
    const r = parseIcs(ics);
    expect(r.events[0].summary).toBe("Titlecontinued");
  });

  it("unescapes special chars in DESCRIPTION", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:T
DESCRIPTION:line1\\nline2 with\\, comma\\; semi\\\\back
DTSTART:20260425T020000Z
END:VEVENT
END:VCALENDAR`;
    const r = parseIcs(ics);
    expect(r.events[0].description).toBe(
      "line1\nline2 with, comma; semi\\back",
    );
  });

  it("reports error when SUMMARY missing", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
DTSTART:20260425T020000Z
END:VEVENT
END:VCALENDAR`;
    const r = parseIcs(ics);
    expect(r.events).toHaveLength(0);
    expect(r.errors).toHaveLength(1);
    expect(r.errors[0].message).toContain("SUMMARY");
  });

  it("reports error when DTSTART missing", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Title
END:VEVENT
END:VCALENDAR`;
    const r = parseIcs(ics);
    expect(r.events).toHaveLength(0);
    expect(r.errors[0].message).toContain("DTSTART");
  });

  it("handles CRLF line endings", () => {
    const ics =
      "BEGIN:VCALENDAR\r\nBEGIN:VEVENT\r\nSUMMARY:T\r\nDTSTART:20260425T020000Z\r\nEND:VEVENT\r\nEND:VCALENDAR";
    const r = parseIcs(ics);
    expect(r.events).toHaveLength(1);
  });

  it("skips lines outside VEVENT", () => {
    const ics = `BEGIN:VCALENDAR
PRODID:-//abc//
SUMMARY:wrong-place
BEGIN:VEVENT
SUMMARY:correct
DTSTART:20260425T020000Z
END:VEVENT
END:VCALENDAR`;
    const r = parseIcs(ics);
    expect(r.events).toHaveLength(1);
    expect(r.events[0].summary).toBe("correct");
  });

  it("returns empty result for non-ICS text", () => {
    const r = parseIcs("hello world");
    expect(r.events).toHaveLength(0);
    expect(r.errors).toHaveLength(0);
  });
});

describe("parseRrule", () => {
  const start = new Date("2026-04-25T02:00:00.000Z");

  it("FREQ=DAILY → daily/1", () => {
    const r = parseRrule("FREQ=DAILY", start);
    expect(r.recurrence).toEqual({ type: "daily", interval: 1, until: null });
    expect(r.warnings).toEqual([]);
  });

  it("FREQ=WEEKLY;INTERVAL=2 → weekly/2", () => {
    const r = parseRrule("FREQ=WEEKLY;INTERVAL=2", start);
    expect(r.recurrence).toEqual({
      type: "weekly",
      interval: 2,
      until: null,
    });
  });

  it("FREQ=MONTHLY;UNTIL=...", () => {
    const r = parseRrule("FREQ=MONTHLY;UNTIL=20261231T000000Z", start);
    expect(r.recurrence!.type).toBe("monthly");
    expect(r.recurrence!.until!.toISOString()).toBe(
      "2026-12-31T00:00:00.000Z",
    );
  });

  it("COUNT computes until daily", () => {
    const r = parseRrule("FREQ=DAILY;COUNT=5", start);
    // start + 4 days
    expect(r.recurrence!.until!.toISOString()).toBe("2026-04-29T02:00:00.000Z");
  });

  it("COUNT computes until weekly with interval", () => {
    const r = parseRrule("FREQ=WEEKLY;INTERVAL=2;COUNT=3", start);
    // start + 2*7*2 = 28 days
    expect(r.recurrence!.until!.toISOString()).toBe("2026-05-23T02:00:00.000Z");
  });

  it("FREQ=YEARLY → null + warning", () => {
    const r = parseRrule("FREQ=YEARLY", start);
    expect(r.recurrence).toBeNull();
    expect(r.warnings.join(" ")).toMatch(/YEARLY/);
  });

  it("BYDAY warning but recurrence kept", () => {
    const r = parseRrule("FREQ=WEEKLY;BYDAY=MO,WE,FR", start);
    expect(r.recurrence?.type).toBe("weekly");
    expect(r.warnings.join(" ")).toMatch(/BYDAY/);
  });

  it("invalid FREQ → null", () => {
    const r = parseRrule("FREQ=GARBAGE", start);
    expect(r.recurrence).toBeNull();
  });
});

describe("parseIcs RRULE integration", () => {
  it("parses VEVENT with RRULE WEEKLY into recurrence", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Họp tuần
DTSTART:20260425T020000Z
RRULE:FREQ=WEEKLY;INTERVAL=1
END:VEVENT
END:VCALENDAR`;
    const r = parseIcs(ics);
    expect(r.events).toHaveLength(1);
    expect(r.events[0].recurrence).toEqual({
      type: "weekly",
      interval: 1,
      until: null,
    });
    expect(r.events[0].warnings).toEqual([]);
  });

  it("emits warnings for unsupported RRULE", () => {
    const ics = `BEGIN:VCALENDAR
BEGIN:VEVENT
SUMMARY:Test
DTSTART:20260425T020000Z
RRULE:FREQ=YEARLY
END:VEVENT
END:VCALENDAR`;
    const r = parseIcs(ics);
    expect(r.events).toHaveLength(1);
    expect(r.events[0].recurrence).toBeNull();
    expect(r.events[0].warnings.length).toBeGreaterThan(0);
  });
});
