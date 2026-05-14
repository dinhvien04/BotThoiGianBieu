import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AuditService } from "src/schedules/audit.service";
import { ScheduleAuditLog } from "src/schedules/entities/schedule-audit-log.entity";

describe("AuditService", () => {
  let service: AuditService;
  let mockRepo: jest.Mocked<Repository<ScheduleAuditLog>>;

  beforeEach(async () => {
    mockRepo = {
      create: jest.fn((d: any) => d),
      save: jest.fn(),
      findAndCount: jest.fn(),
    } as any;

    const m: TestingModule = await Test.createTestingModule({
      providers: [
        AuditService,
        { provide: getRepositoryToken(ScheduleAuditLog), useValue: mockRepo },
      ],
    }).compile();

    service = m.get(AuditService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("log", () => {
    it("saves entry", async () => {
      mockRepo.save.mockResolvedValue({} as any);
      await service.log({
        schedule_id: 5,
        user_id: "u1",
        action: "create",
      });
      expect(mockRepo.create).toHaveBeenCalledWith({
        schedule_id: 5,
        user_id: "u1",
        action: "create",
        changes: null,
      });
      expect(mockRepo.save).toHaveBeenCalled();
    });

    it("swallows errors (best-effort)", async () => {
      mockRepo.save.mockRejectedValue(new Error("DB down"));
      await expect(
        service.log({ schedule_id: 1, user_id: "u", action: "delete" }),
      ).resolves.toBeUndefined();
    });
  });

  describe("findBySchedule", () => {
    it("queries with pagination", async () => {
      mockRepo.findAndCount.mockResolvedValue([[], 0]);
      await service.findBySchedule(5, 10, 20);
      expect(mockRepo.findAndCount).toHaveBeenCalledWith({
        where: { schedule_id: 5 },
        order: { created_at: "DESC", id: "DESC" },
        take: 10,
        skip: 20,
      });
    });
  });

  describe("diff", () => {
    it("returns null when no changes", () => {
      expect(AuditService.diff({ a: 1 }, { a: 1 })).toBeNull();
    });

    it("returns changed fields only", () => {
      const result = AuditService.diff(
        { a: 1, b: 2, c: 3 },
        { a: 1, b: 99, c: 3 },
      );
      expect(result).toEqual({ b: { from: 2, to: 99 } });
    });

    it("compares dates by ISO string", () => {
      const d1 = new Date("2026-01-01T00:00:00Z");
      const d2 = new Date("2026-01-01T00:00:00Z");
      const d3 = new Date("2026-02-01T00:00:00Z");
      expect(AuditService.diff({ x: d1 }, { x: d2 })).toBeNull();
      expect(AuditService.diff({ x: d1 }, { x: d3 })).not.toBeNull();
    });

    it("ignores updated_at / created_at by default", () => {
      const result = AuditService.diff(
        { a: 1, updated_at: new Date(0) },
        { a: 1, updated_at: new Date(123456) },
      );
      expect(result).toBeNull();
    });

    it("treats null vs undefined as equal", () => {
      expect(AuditService.diff({ a: null }, { a: undefined })).toBeNull();
    });
  });
});
