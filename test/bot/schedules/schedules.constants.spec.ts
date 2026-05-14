import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository, In } from "typeorm";
import { TagsService } from "../../../app/bot/src/schedules/tags.service";
import { Tag } from "../../../app/bot/src/schedules/entities/tag.entity";
import { Schedule } from "../../../app/bot/src/schedules/entities/schedule.entity";

describe("TagsService", () => {
  let service: TagsService;
  let mockTagRepo: jest.Mocked<Repository<Tag>>;
  let mockScheduleRepo: jest.Mocked<Repository<Schedule>>;
  let mockQb: any;

  const userId = "user123";
  const scheduleId = 1;

  // Helper function to create complete Tag mock
  const createMockTag = (overrides: Partial<Tag> = {}): Tag => ({
    id: 1,
    user_id: userId,
    name: "work",
    color: null,
    created_at: new Date(),
    ...overrides,
  });

  // Helper function to create complete Schedule mock
  const createMockSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
    id: scheduleId,
    user_id: userId,
    item_type: "task",
    title: "Test Schedule",
    description: null,
    start_time: new Date(),
    end_time: null,
    status: "pending",
    priority: "normal",
    remind_at: null,
    is_reminded: false,
    acknowledged_at: null,
    end_notified_at: null,
    recurrence_type: "none",
    recurrence_interval: 1,
    recurrence_until: null,
    recurrence_parent_id: null,
    is_pinned: false,
    is_hidden: false,
    created_at: new Date(),
    updated_at: new Date(),
    tags: [],
    ...overrides,
  });

  // Helper function to create complete DeleteResult mock
  const createMockDeleteResult = (affected: number | undefined): any => ({
    affected,
    raw: {},
  });

  beforeEach(async () => {
    mockQb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };

    mockTagRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    } as any;

    mockScheduleRepo = {
      findOne: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TagsService,
        { provide: getRepositoryToken(Tag), useValue: mockTagRepo },
        { provide: getRepositoryToken(Schedule), useValue: mockScheduleRepo },
      ],
    }).compile();

    service = module.get<TagsService>(TagsService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("normalize", () => {
    it("should normalize valid tag names", () => {
      expect(service.normalize("Work")).toBe("work");
      expect(service.normalize("  PERSONAL  ")).toBe("personal");
      expect(service.normalize("tag-name")).toBe("tag-name");
      expect(service.normalize("tag_name")).toBe("tag_name");
      expect(service.normalize("tag123")).toBe("tag123");
    });

    it("should return null for invalid tag names", () => {
      expect(service.normalize("")).toBeNull();
      expect(service.normalize("   ")).toBeNull();
      expect(service.normalize("tag with spaces")).toBeNull();
      expect(service.normalize("tag@special")).toBeNull();
      expect(service.normalize("tag.dot")).toBeNull();
      expect(service.normalize("tag/slash")).toBeNull();
      expect(service.normalize("tag#hash")).toBeNull();
    });

    it("should return null for tags exceeding max length", () => {
      const longTag = "a".repeat(31); // MAX_TAG_LENGTH is 30
      expect(service.normalize(longTag)).toBeNull();
    });

    it("should handle null and undefined input", () => {
      expect(service.normalize(null as any)).toBeNull();
      expect(service.normalize(undefined as any)).toBeNull();
    });

    it("should accept tags at max length boundary", () => {
      const maxLengthTag = "a".repeat(30);
      expect(service.normalize(maxLengthTag)).toBe(maxLengthTag);
    });
  });

  describe("listForUser", () => {
    it("should return tags ordered by name", async () => {
      const mockTags = [
        createMockTag({ id: 1, name: "personal" }),
        createMockTag({ id: 2, name: "work" }),
      ];
      mockTagRepo.find.mockResolvedValue(mockTags);

      const result = await service.listForUser(userId);

      expect(result).toEqual(mockTags);
      expect(mockTagRepo.find).toHaveBeenCalledWith({
        where: { user_id: userId },
        order: { name: "ASC" },
      });
    });
  });

  describe("findByName", () => {
    it("should find existing tag by normalized name", async () => {
      const mockTag = createMockTag({ name: "work" });
      mockTagRepo.findOne.mockResolvedValue(mockTag);

      const result = await service.findByName(userId, "WORK");

      expect(result).toEqual(mockTag);
      expect(mockTagRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: userId, name: "work" },
      });
    });

    it("should return null for invalid tag name", async () => {
      const result = await service.findByName(userId, "invalid tag name");
      expect(result).toBeNull();
      expect(mockTagRepo.findOne).not.toHaveBeenCalled();
    });

    it("should return null when tag not found", async () => {
      mockTagRepo.findOne.mockResolvedValue(null);
      const result = await service.findByName(userId, "nonexistent");
      expect(result).toBeNull();
    });
  });

  describe("findOrCreate", () => {
    it("should return existing tag if found", async () => {
      const mockTag = createMockTag({ name: "work" });
      mockTagRepo.findOne.mockResolvedValue(mockTag);

      const result = await service.findOrCreate(userId, "work");

      expect(result).toEqual(mockTag);
      expect(mockTagRepo.save).not.toHaveBeenCalled();
    });

    it("should create new tag if not found", async () => {
      const newTag = createMockTag({ id: 2, name: "personal" });
      mockTagRepo.findOne.mockResolvedValue(null);
      mockTagRepo.create.mockReturnValue(newTag);
      mockTagRepo.save.mockResolvedValue(newTag);

      const result = await service.findOrCreate(userId, "personal");

      expect(result).toEqual(newTag);
      expect(mockTagRepo.create).toHaveBeenCalledWith({
        user_id: userId,
        name: "personal",
      });
      expect(mockTagRepo.save).toHaveBeenCalledWith(newTag);
    });

    it("should return null for invalid tag name", async () => {
      const result = await service.findOrCreate(userId, "invalid tag");
      expect(result).toBeNull();
      expect(mockTagRepo.findOne).not.toHaveBeenCalled();
    });
  });

  describe("create", () => {
    it("should return existing tag with created=false", async () => {
      const existingTag = createMockTag({ name: "work" });
      mockTagRepo.findOne.mockResolvedValue(existingTag);

      const result = await service.create(userId, "work");

      expect(result).toEqual({ tag: existingTag, created: false });
      expect(mockTagRepo.save).not.toHaveBeenCalled();
    });

    it("should create new tag with created=true", async () => {
      const newTag = createMockTag({ id: 2, name: "personal" });
      mockTagRepo.findOne.mockResolvedValue(null);
      mockTagRepo.create.mockReturnValue(newTag);
      mockTagRepo.save.mockResolvedValue(newTag);

      const result = await service.create(userId, "personal");

      expect(result).toEqual({ tag: newTag, created: true });
      expect(mockTagRepo.save).toHaveBeenCalled();
    });

    it("should return null for invalid tag name", async () => {
      const result = await service.create(userId, "");
      expect(result).toBeNull();
    });
  });

  describe("deleteByName", () => {
    it("should delete existing tag and return true", async () => {
      mockTagRepo.delete.mockResolvedValue(createMockDeleteResult(1));

      const result = await service.deleteByName(userId, "work");

      expect(result).toBe(true);
      expect(mockTagRepo.delete).toHaveBeenCalledWith({
        user_id: userId,
        name: "work",
      });
    });

    it("should return false when no tag deleted", async () => {
      mockTagRepo.delete.mockResolvedValue(createMockDeleteResult(0));

      const result = await service.deleteByName(userId, "nonexistent");

      expect(result).toBe(false);
    });

    it("should return false for invalid tag name", async () => {
      const result = await service.deleteByName(userId, "invalid tag");
      expect(result).toBe(false);
      expect(mockTagRepo.delete).not.toHaveBeenCalled();
    });

    it("should handle undefined affected count", async () => {
      mockTagRepo.delete.mockResolvedValue(createMockDeleteResult(undefined));

      const result = await service.deleteByName(userId, "work");

      expect(result).toBe(false);
    });
  });

  describe("attachTags", () => {
    it("should return null when schedule not found", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);

      const result = await service.attachTags(userId, scheduleId, ["work"]);

      expect(result).toBeNull();
    });

    it("should attach new tags to schedule", async () => {
      const schedule = createMockSchedule({ tags: [] });
      const newTag = createMockTag({ name: "work" });
      
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockTagRepo.find.mockResolvedValue([]);
      mockTagRepo.create.mockReturnValue(newTag);
      mockTagRepo.save.mockResolvedValue([newTag] as any);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.attachTags(userId, scheduleId, ["work"]);

      expect(result).toEqual({ tags: [newTag], invalid: [] });
      expect(schedule.tags).toEqual([newTag]);
    });

    it("should attach existing tags to schedule", async () => {
      const schedule = createMockSchedule({ tags: [] });
      const existingTag = createMockTag({ name: "work" });
      
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockTagRepo.find.mockResolvedValue([existingTag]);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.attachTags(userId, scheduleId, ["work"]);

      expect(result).toEqual({ tags: [existingTag], invalid: [] });
      expect(mockTagRepo.save).not.toHaveBeenCalled();
    });

    it("should handle mix of valid and invalid tag names", async () => {
      const schedule = createMockSchedule({ tags: [] });
      const validTag = createMockTag({ name: "work" });
      
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockTagRepo.find.mockResolvedValue([]);
      mockTagRepo.create.mockReturnValue(validTag);
      mockTagRepo.save.mockResolvedValue([validTag] as any);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.attachTags(userId, scheduleId, ["work", "invalid tag"]);

      expect(result).toEqual({ tags: [validTag], invalid: ["invalid tag"] });
    });

    it("should merge with existing schedule tags", async () => {
      const existingTag = createMockTag({ id: 1, name: "existing" });
      const newTag = createMockTag({ id: 2, name: "work" });
      const schedule = createMockSchedule({ tags: [existingTag] });
      
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockTagRepo.find.mockResolvedValue([]);
      mockTagRepo.create.mockReturnValue(newTag);
      mockTagRepo.save.mockResolvedValue([newTag] as any);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.attachTags(userId, scheduleId, ["work"]);

      expect(result).toEqual({ tags: [existingTag, newTag], invalid: [] });
    });

    it("should not duplicate existing tags", async () => {
      const existingTag = createMockTag({ name: "work" });
      const schedule = createMockSchedule({ tags: [existingTag] });
      
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockTagRepo.find.mockResolvedValue([existingTag]);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.attachTags(userId, scheduleId, ["work"]);

      expect(result).toEqual({ tags: [existingTag], invalid: [] });
    });
  });

  describe("detachTag", () => {
    it("should return null for invalid tag name", async () => {
      const result = await service.detachTag(userId, scheduleId, "invalid tag");
      expect(result).toBeNull();
    });

    it("should return null when schedule not found", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);

      const result = await service.detachTag(userId, scheduleId, "work");

      expect(result).toBeNull();
    });

    it("should remove tag from schedule", async () => {
      const tag = createMockTag({ name: "work" });
      const schedule = createMockSchedule({ tags: [tag] });
      
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.detachTag(userId, scheduleId, "work");

      expect(result).toEqual({ removed: true, tagName: "work" });
      expect(schedule.tags).toEqual([]);
      expect(mockScheduleRepo.save).toHaveBeenCalled();
    });

    it("should return removed=false when tag not attached", async () => {
      const schedule = createMockSchedule({ tags: [] });
      
      mockScheduleRepo.findOne.mockResolvedValue(schedule);

      const result = await service.detachTag(userId, scheduleId, "work");

      expect(result).toEqual({ removed: false, tagName: "work" });
      expect(mockScheduleRepo.save).not.toHaveBeenCalled();
    });

    it("should handle schedule with null tags", async () => {
      const schedule = createMockSchedule({ tags: null as any });
      
      mockScheduleRepo.findOne.mockResolvedValue(schedule);

      const result = await service.detachTag(userId, scheduleId, "work");

      expect(result).toEqual({ removed: false, tagName: "work" });
    });
  });

  describe("findSchedulesByTag", () => {
    it("should return empty array for invalid tag name", async () => {
      const result = await service.findSchedulesByTag(userId, "invalid tag");
      expect(result).toEqual([]);
    });

    it("should find schedules by tag name", async () => {
      const mockSchedules = [{ id: 1, title: "Test Schedule" }];
      mockQb.getMany.mockResolvedValue(mockSchedules);

      const result = await service.findSchedulesByTag(userId, "work");

      expect(result).toEqual(mockSchedules);
      expect(mockQb.where).toHaveBeenCalledWith("schedule.user_id = :userId", { userId });
      expect(mockQb.andWhere).toHaveBeenCalledWith("tag.name = :name", { name: "work" });
      expect(mockQb.orderBy).toHaveBeenCalledWith("schedule.start_time", "ASC");
    });

    it("should filter by pending status when requested", async () => {
      const mockSchedules = [{ id: 1, title: "Pending Schedule" }];
      mockQb.getMany.mockResolvedValue(mockSchedules);

      const result = await service.findSchedulesByTag(userId, "work", { onlyPending: true });

      expect(result).toEqual(mockSchedules);
      expect(mockQb.andWhere).toHaveBeenCalledWith("schedule.status = :status", { status: "pending" });
    });
  });

  describe("findTagsForSchedule", () => {
    it("should return tags for existing schedule", async () => {
      const mockTags = [
        createMockTag({ id: 1, name: "work" }), 
        createMockTag({ id: 2, name: "personal" })
      ];
      const schedule = createMockSchedule({ tags: mockTags });
      
      mockScheduleRepo.findOne.mockResolvedValue(schedule);

      const result = await service.findTagsForSchedule(userId, scheduleId);

      expect(result).toEqual(mockTags);
      expect(mockScheduleRepo.findOne).toHaveBeenCalledWith({
        where: { id: scheduleId, user_id: userId },
        relations: ["tags"],
      });
    });

    it("should return empty array when schedule not found", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);

      const result = await service.findTagsForSchedule(userId, scheduleId);

      expect(result).toEqual([]);
    });

    it("should handle schedule with null tags", async () => {
      const schedule = createMockSchedule({ tags: null as any });
      
      mockScheduleRepo.findOne.mockResolvedValue(schedule);

      const result = await service.findTagsForSchedule(userId, scheduleId);

      expect(result).toEqual([]);
    });
  });
});
