import { UndoService, UndoEntry } from "src/schedules/undo.service";

describe("UndoService", () => {
  let service: UndoService;

  beforeEach(() => {
    service = new UndoService();
  });

  const completeEntry = (recordedAt: Date): UndoEntry => ({
    kind: "complete",
    scheduleId: 1,
    scheduleTitle: "Họp",
    prevStatus: "pending",
    prevRemindAt: null,
    prevAcknowledgedAt: null,
    prevEndNotifiedAt: null,
    spawnedNextId: null,
    recordedAt,
  });

  it("returns null when no entry recorded", () => {
    expect(service.peek("u1")).toBeNull();
    expect(service.pop("u1")).toBeNull();
  });

  it("records and pops latest entry", () => {
    const entry = completeEntry(new Date());
    service.record("u1", entry);
    expect(service.peek("u1")).toBe(entry);
    expect(service.pop("u1")).toBe(entry);
    expect(service.pop("u1")).toBeNull();
  });

  it("overwrites previous entry when recording again", () => {
    const e1 = completeEntry(new Date());
    const e2 = { ...completeEntry(new Date()), scheduleId: 2 } as UndoEntry;
    service.record("u1", e1);
    service.record("u1", e2);
    expect(service.pop("u1")).toBe(e2);
  });

  it("scopes per user", () => {
    const eA = completeEntry(new Date());
    const eB = { ...completeEntry(new Date()), scheduleId: 99 } as UndoEntry;
    service.record("a", eA);
    service.record("b", eB);
    expect(service.pop("a")).toBe(eA);
    expect(service.pop("b")).toBe(eB);
  });

  it("expires after 10 minutes", () => {
    const now = new Date("2026-04-25T10:00:00Z");
    const old = completeEntry(now);
    service.record("u1", old);

    const tooLate = new Date(now.getTime() + 11 * 60 * 1000);
    expect(service.peek("u1", tooLate)).toBeNull();
    expect(service.pop("u1", tooLate)).toBeNull();
  });

  it("does not expire just before 10 minute boundary", () => {
    const now = new Date("2026-04-25T10:00:00Z");
    service.record("u1", completeEntry(now));
    const justOk = new Date(now.getTime() + 9 * 60 * 1000);
    expect(service.peek("u1", justOk)).not.toBeNull();
  });

  it("clear() removes entry", () => {
    service.record("u1", completeEntry(new Date()));
    service.clear("u1");
    expect(service.peek("u1")).toBeNull();
  });
});
