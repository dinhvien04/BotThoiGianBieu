import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { TagsService } from "src/schedules/tags.service";
import { Schedule } from "src/schedules/entities/schedule.entity";
import { Tag } from "src/schedules/entities/tag.entity";

describe("TagsService", () => {
  let service: TagsService;
  let mockTagRepo: jest.Mocked<Repository<Tag>>;
  let mockScheduleRepo: jest.Mocked<Repository<Schedule>>;
  let mockQb: any;

  beforeEach(async () => {
    mockTagRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      delete: jest.fn(),
      create: jest.fn((data: any) => data),
      save: jest.fn(),
    } as any;
    mockQb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
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
    it("lowercases and trims valid name", () => {
      expect(service.normalize("  Work  ")).toBe("work");
      expect(service.normalize("HOC-TAP_2")).toBe("hoc-tap_2");
    });

    it("rejects empty / spaces / special chars / unicode", () => {
      expect(service.normalize("")).toBeNull();
      expect(service.normalize("   ")).toBeNull();
      expect(service.normalize("a b")).toBeNull();
      expect(service.normalize("học-tập")).toBeNull();
      expect(service.normalize("hello!")).toBeNull();
    });

    it("rejects names longer than 30 chars", () => {
      expect(service.normalize("a".repeat(31))).toBeNull();
      expect(service.normalize("a".repeat(30))).toBe("a".repeat(30));
    });
  });

  describe("listForUser", () => {
    it("queries tags by user_id sorted by name", async () => {
      mockTagRepo.find.mockResolvedValue([{ id: 1, name: "work" } as Tag]);
      const tags = await service.listForUser("u1");
      expect(tags).toHaveLength(1);
      expect(mockTagRepo.find).toHaveBeenCalledWith({
        where: { user_id: "u1" },
        order: { name: "ASC" },
      });
    });
  });

  describe("findByName", () => {
    it("returns null on invalid name", async () => {
      const tag = await service.findByName("u1", "bad name!");
      expect(tag).toBeNull();
      expect(mockTagRepo.findOne).not.toHaveBeenCalled();
    });

    it("queries by normalized name", async () => {
      mockTagRepo.findOne.mockResolvedValue({ id: 1, name: "work" } as Tag);
      await service.findByName("u1", "WORK");
      expect(mockTagRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: "u1", name: "work" },
      });
    });
  });

  describe("create", () => {
    it("returns existing tag when one exists", async () => {
      const existing = { id: 1, name: "work" } as Tag;
      mockTagRepo.findOne.mockResolvedValue(existing);
      const result = await service.create("u1", "work");
      expect(result).toEqual({ tag: existing, created: false });
      expect(mockTagRepo.save).not.toHaveBeenCalled();
    });

    it("creates new tag when not exists", async () => {
      mockTagRepo.findOne.mockResolvedValue(null);
      mockTagRepo.save.mockResolvedValue({ id: 2, name: "study" } as Tag);
      const result = await service.create("u1", "study");
      expect(result?.created).toBe(true);
      expect(result?.tag.name).toBe("study");
      expect(mockTagRepo.save).toHaveBeenCalled();
    });

    it("returns null on invalid name", async () => {
      const result = await service.create("u1", "bad name!");
      expect(result).toBeNull();
    });
  });

  describe("deleteByName", () => {
    it("returns true when affected > 0", async () => {
      mockTagRepo.delete.mockResolvedValue({ affected: 1 } as any);
      expect(await service.deleteByName("u1", "work")).toBe(true);
    });

    it("returns false when affected == 0", async () => {
      mockTagRepo.delete.mockResolvedValue({ affected: 0 } as any);
      expect(await service.deleteByName("u1", "ghost")).toBe(false);
    });

    it("returns false on invalid name without hitting db", async () => {
      expect(await service.deleteByName("u1", "bad name!")).toBe(false);
      expect(mockTagRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe("attachTags", () => {
    it("returns null when schedule not found", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      const result = await service.attachTags("u1", 5, ["work"]);
      expect(result).toBeNull();
    });

    it("attaches existing + creates new tags", async () => {
      const schedule: Schedule = {
        id: 5,
        user_id: "u1",
        tags: [{ id: 10, name: "old" } as Tag],
      } as any;
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockTagRepo.find.mockResolvedValue([{ id: 1, name: "work" } as Tag]);
      mockTagRepo.save.mockResolvedValue([
        { id: 2, name: "study" } as Tag,
      ] as any);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.attachTags("u1", 5, ["work", "STUDY"]);

      expect(result).not.toBeNull();
      const names = result!.tags.map((t) => t.name).sort();
      expect(names).toEqual(["old", "study", "work"]);
      expect(result!.invalid).toEqual([]);
    });

    it("collects invalid names", async () => {
      const schedule: Schedule = {
        id: 5,
        user_id: "u1",
        tags: [],
      } as any;
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockTagRepo.find.mockResolvedValue([]);
      mockTagRepo.save.mockResolvedValue([{ id: 1, name: "work" } as Tag] as any);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.attachTags("u1", 5, ["work", "bad name"]);

      expect(result!.invalid).toEqual(["bad name"]);
      expect(result!.tags.map((t) => t.name)).toEqual(["work"]);
    });

    it("does not duplicate existing tags on the schedule", async () => {
      const schedule: Schedule = {
        id: 5,
        user_id: "u1",
        tags: [{ id: 1, name: "work" } as Tag],
      } as any;
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockTagRepo.find.mockResolvedValue([{ id: 1, name: "work" } as Tag]);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.attachTags("u1", 5, ["work"]);

      expect(result!.tags).toHaveLength(1);
    });
  });

  describe("detachTag", () => {
    it("returns null on invalid name", async () => {
      const result = await service.detachTag("u1", 5, "bad!");
      expect(result).toBeNull();
    });

    it("returns null when schedule not found", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      const result = await service.detachTag("u1", 5, "work");
      expect(result).toBeNull();
    });

    it("removes existing tag", async () => {
      const schedule: Schedule = {
        id: 5,
        user_id: "u1",
        tags: [
          { id: 1, name: "work" } as Tag,
          { id: 2, name: "study" } as Tag,
        ],
      } as any;
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.detachTag("u1", 5, "work");

      expect(result).toEqual({ removed: true, tagName: "work" });
      expect(schedule.tags).toHaveLength(1);
      expect(schedule.tags?.[0].name).toBe("study");
      expect(mockScheduleRepo.save).toHaveBeenCalled();
    });

    it("noop when tag not attached", async () => {
      const schedule: Schedule = {
        id: 5,
        user_id: "u1",
        tags: [{ id: 2, name: "study" } as Tag],
      } as any;
      mockScheduleRepo.findOne.mockResolvedValue(schedule);

      const result = await service.detachTag("u1", 5, "work");

      expect(result).toEqual({ removed: false, tagName: "work" });
      expect(mockScheduleRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("findSchedulesByTag", () => {
    it("returns [] on invalid name", async () => {
      const result = await service.findSchedulesByTag("u1", "bad!");
      expect(result).toEqual([]);
      expect(mockScheduleRepo.createQueryBuilder).not.toHaveBeenCalled();
    });

    it("queries by normalized tag name", async () => {
      mockQb.getMany.mockResolvedValue([{ id: 5 } as Schedule]);
      const result = await service.findSchedulesByTag("u1", "WORK");
      expect(result).toHaveLength(1);
      expect(mockQb.where).toHaveBeenCalledWith(
        "schedule.user_id = :userId",
        { userId: "u1" },
      );
      expect(mockQb.andWhere).toHaveBeenCalledWith("tag.name = :name", {
        name: "work",
      });
    });

    it("filters pending only when onlyPending=true", async () => {
      mockQb.getMany.mockResolvedValue([]);
      await service.findSchedulesByTag("u1", "work", { onlyPending: true });
      expect(mockQb.andWhere).toHaveBeenCalledWith(
        "schedule.status = :status",
        { status: "pending" },
      );
    });
  });

  describe("findTagsForSchedule", () => {
    it("returns tags from schedule.tags", async () => {
      const tags = [{ id: 1, name: "work" } as Tag];
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: "u1",
        tags,
      } as any);
      const result = await service.findTagsForSchedule("u1", 5);
      expect(result).toEqual(tags);
    });

    it("returns [] when schedule not found", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      const result = await service.findTagsForSchedule("u1", 5);
      expect(result).toEqual([]);
    });
  });
});
