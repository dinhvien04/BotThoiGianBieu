import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TemplatesService } from "../../src/schedules/templates.service";
import { ScheduleTemplate } from "../../src/schedules/entities/schedule-template.entity";
import { Schedule } from "../../src/schedules/entities/schedule.entity";

describe("TemplatesService", () => {
  let service: TemplatesService;
  let mockRepo: jest.Mocked<Repository<ScheduleTemplate>>;

  beforeEach(async () => {
    mockRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      count: jest.fn(),
      delete: jest.fn(),
      create: jest.fn((d: any) => d),
      save: jest.fn((t: any) => Promise.resolve({ ...t, id: 1, created_at: new Date(), updated_at: new Date() })),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TemplatesService,
        { provide: getRepositoryToken(ScheduleTemplate), useValue: mockRepo },
      ],
    }).compile();

    service = module.get(TemplatesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("name validation", () => {
    it("normalizes name", () => {
      expect(TemplatesService.normalizeName("  Hop-Tuan  ")).toBe("hop-tuan");
    });
    it("validates name regex", () => {
      expect(TemplatesService.isValidName("hop-tuan")).toBe(true);
      expect(TemplatesService.isValidName("hop_tuan_2")).toBe(true);
      expect(TemplatesService.isValidName("a")).toBe(true);
      expect(TemplatesService.isValidName("")).toBe(false);
      expect(TemplatesService.isValidName("hop tuan")).toBe(false);
      expect(TemplatesService.isValidName("học-tập")).toBe(false);
      expect(TemplatesService.isValidName("a".repeat(51))).toBe(false);
    });
  });

  describe("listForUser", () => {
    it("queries by user_id ordered by name", async () => {
      mockRepo.find.mockResolvedValue([]);
      await service.listForUser("u1");
      expect(mockRepo.find).toHaveBeenCalledWith({
        where: { user_id: "u1" },
        order: { name: "ASC" },
      });
    });
  });

  describe("findByName", () => {
    it("normalizes before query", async () => {
      mockRepo.findOne.mockResolvedValue(null);
      await service.findByName("u1", "  HOP-TUAN  ");
      expect(mockRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: "u1", name: "hop-tuan" },
      });
    });
  });

  describe("create", () => {
    it("saves with defaults", async () => {
      const t = await service.create({
        user_id: "u1",
        name: "TEST",
        title: "Họp tuần",
      });
      expect(t.name).toBe("test");
      expect(t.priority).toBe("normal");
      expect(t.item_type).toBe("task");
    });

    it("preserves provided fields", async () => {
      const t = await service.create({
        user_id: "u1",
        name: "test",
        title: "Họp tuần",
        item_type: "meeting",
        description: "desc",
        duration_minutes: 60,
        default_remind_minutes: 15,
        priority: "high",
      });
      expect(t).toMatchObject({
        item_type: "meeting",
        description: "desc",
        duration_minutes: 60,
        default_remind_minutes: 15,
        priority: "high",
      });
    });
  });

  describe("createFromSchedule", () => {
    it("derives duration and remind minutes from schedule", async () => {
      const schedule: Schedule = {
        id: 5,
        user_id: "u1",
        item_type: "meeting",
        title: "Họp",
        description: "desc",
        start_time: new Date("2026-04-25T09:00:00Z"),
        end_time: new Date("2026-04-25T10:00:00Z"),
        remind_at: new Date("2026-04-25T08:45:00Z"),
        priority: "high",
      } as any;

      const t = await service.createFromSchedule("u1", "hop", schedule);
      expect(t.duration_minutes).toBe(60);
      expect(t.default_remind_minutes).toBe(15);
      expect(t.title).toBe("Họp");
      expect(t.priority).toBe("high");
    });

    it("handles schedule without end_time / remind_at", async () => {
      const schedule: Schedule = {
        id: 5,
        user_id: "u1",
        item_type: "task",
        title: "Task",
        description: null,
        start_time: new Date("2026-04-25T09:00:00Z"),
        end_time: null,
        remind_at: null,
        priority: "normal",
      } as any;

      const t = await service.createFromSchedule("u1", "task1", schedule);
      expect(t.duration_minutes).toBeNull();
      expect(t.default_remind_minutes).toBeNull();
    });
  });

  describe("deleteByName / existsByName", () => {
    it("deleteByName returns true when affected > 0", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 1 } as any);
      const ok = await service.deleteByName("u1", "TEST");
      expect(ok).toBe(true);
      expect(mockRepo.delete).toHaveBeenCalledWith({
        user_id: "u1",
        name: "test",
      });
    });

    it("deleteByName returns false when affected = 0", async () => {
      mockRepo.delete.mockResolvedValue({ affected: 0 } as any);
      expect(await service.deleteByName("u1", "x")).toBe(false);
    });

    it("existsByName uses count > 0", async () => {
      mockRepo.count.mockResolvedValue(1);
      expect(await service.existsByName("u1", "TEST")).toBe(true);
      mockRepo.count.mockResolvedValue(0);
      expect(await service.existsByName("u1", "TEST")).toBe(false);
    });
  });
});
