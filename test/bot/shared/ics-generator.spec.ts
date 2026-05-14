import { generateIcs } from "src/shared/utils/ics-generator";
import { Schedule } from "src/schedules/entities/schedule.entity";

const baseSchedule = (overrides: Partial<Schedule> = {}): Schedule =>
  ({
    id: 1,
    user_id: "u1",
    title: "Họp nhóm",
    description: null,
    item_type: "meeting",
    start_time: new Date("2026-04-25T02:00:00Z"),
    end_time: new Date("2026-04-25T03:00:00Z"),
    status: "pending",
    priority: "normal",
    remind_at: null,
    acknowledged_at: null,
    end_notified_at: null,
    is_reminded: false,
    recurrence_type: "none",
    recurrence_interval: 1,
    recurrence_until: null,
    recurrence_parent_id: null,
    notify_via_dm: false,
    created_at: new Date("2026-04-01T00:00:00Z"),
    updated_at: new Date("2026-04-01T00:00:00Z"),
    ...overrides,
  }) as any;

describe("generateIcs", () => {
  it("emits VCALENDAR wrapper with VERSION + PRODID", () => {
    const out = generateIcs([baseSchedule()]);
    expect(out).toMatch(/^BEGIN:VCALENDAR\r\n/);
    expect(out).toContain("VERSION:2.0");
    expect(out).toContain("PRODID:-//BotThoiGianBieu//Mezon Schedule Bot//VI");
    expect(out.trim().endsWith("END:VCALENDAR")).toBe(true);
  });

  it("uses CRLF line endings (RFC 5545)", () => {
    const out = generateIcs([baseSchedule()]);
    expect(out.split("\r\n").length).toBeGreaterThan(5);
    expect(out.includes("\n") && !out.includes("\r\n\n")).toBe(true);
  });

  it("emits VEVENT with UID, DTSTART, DTEND, SUMMARY", () => {
    const out = generateIcs([baseSchedule()]);
    expect(out).toContain("BEGIN:VEVENT");
    expect(out).toContain("UID:schedule-1@bot-thoi-gian-bieu");
    expect(out).toContain("DTSTART:20260425T020000Z");
    expect(out).toContain("DTEND:20260425T030000Z");
    expect(out).toContain("SUMMARY:Họp nhóm");
    expect(out).toContain("END:VEVENT");
  });

  it("defaults end_time to start + 1 hour when missing", () => {
    const out = generateIcs([baseSchedule({ end_time: null })]);
    expect(out).toContain("DTSTART:20260425T020000Z");
    expect(out).toContain("DTEND:20260425T030000Z");
  });

  it("escapes commas, semicolons, newlines, backslashes in text fields", () => {
    const out = generateIcs([
      baseSchedule({
        title: "Họp, gấp; rất quan trọng \\ngay",
        description: "Dòng 1\nDòng 2",
      }),
    ]);
    expect(out).toContain(
      "SUMMARY:Họp\\, gấp\\; rất quan trọng \\\\ngay",
    );
    expect(out).toContain("DESCRIPTION:Dòng 1\\nDòng 2");
  });

  it("maps status values", () => {
    expect(generateIcs([baseSchedule({ status: "pending" })])).toContain(
      "STATUS:TENTATIVE",
    );
    expect(generateIcs([baseSchedule({ status: "completed" })])).toContain(
      "STATUS:CONFIRMED",
    );
    expect(generateIcs([baseSchedule({ status: "cancelled" })])).toContain(
      "STATUS:CANCELLED",
    );
  });

  it("emits PRIORITY 1/5/9 for high/normal/low", () => {
    expect(generateIcs([baseSchedule({ priority: "high" })])).toContain(
      "PRIORITY:1",
    );
    expect(generateIcs([baseSchedule({ priority: "normal" })])).toContain(
      "PRIORITY:5",
    );
    expect(generateIcs([baseSchedule({ priority: "low" })])).toContain(
      "PRIORITY:9",
    );
  });

  it("emits RRULE for recurring with interval & until", () => {
    const out = generateIcs([
      baseSchedule({
        recurrence_type: "weekly",
        recurrence_interval: 2,
        recurrence_until: new Date("2026-12-31T16:59:59Z"),
      }),
    ]);
    expect(out).toContain("RRULE:FREQ=WEEKLY;INTERVAL=2;UNTIL=20261231T165959Z");
  });

  it("does not emit RRULE when recurrence_type is none", () => {
    const out = generateIcs([baseSchedule({ recurrence_type: "none" })]);
    expect(out).not.toContain("RRULE:");
  });

  it("emits VALARM with negative trigger for remind_at before start", () => {
    const out = generateIcs([
      baseSchedule({
        start_time: new Date("2026-04-25T02:00:00Z"),
        remind_at: new Date("2026-04-25T01:30:00Z"),
      }),
    ]);
    expect(out).toContain("BEGIN:VALARM");
    expect(out).toContain("TRIGGER:-PT30M");
    expect(out).toContain("END:VALARM");
  });

  it("does not emit VALARM when remind_at is at/after start", () => {
    const out = generateIcs([
      baseSchedule({
        start_time: new Date("2026-04-25T02:00:00Z"),
        remind_at: new Date("2026-04-25T02:00:00Z"),
      }),
    ]);
    expect(out).not.toContain("VALARM");
  });

  it("includes calendar name when provided", () => {
    const out = generateIcs([baseSchedule()], { calendarName: "My, cal" });
    expect(out).toContain("X-WR-CALNAME:My\\, cal");
  });

  it("emits multiple events", () => {
    const out = generateIcs([
      baseSchedule({ id: 1 }),
      baseSchedule({ id: 2, title: "Khác" }),
    ]);
    expect(out.match(/BEGIN:VEVENT/g)?.length).toBe(2);
    expect(out).toContain("UID:schedule-1@");
    expect(out).toContain("UID:schedule-2@");
  });
});
