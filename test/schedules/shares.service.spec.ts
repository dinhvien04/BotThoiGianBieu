import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SharesService } from "../../src/schedules/shares.service";
import { Schedule } from "../../src/schedules/entities/schedule.entity";
import { User } from "../../src/users/entities/user.entity";

describe("SharesService", () => {
  let service: SharesService;
  let mockScheduleRepo: jest.Mocked<Repository<Schedule>>;
  let mockUserRepo: jest.Mocked<Repository<User>>;
  let mockQb: any;

  const ownerId = "owner1";
  const targetId = "user2";

  beforeEach(async () => {
    mockQb = {
      innerJoin: jest.fn().mockReturnThis(),
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn(),
    };
    mockScheduleRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      save: jest.fn(),
      createQueryBuilder: jest.fn().mockReturnValue(mockQb),
    } as any;
    mockUserRepo = {
      findOne: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SharesService,
        { provide: getRepositoryToken(Schedule), useValue: mockScheduleRepo },
        { provide: getRepositoryToken(User), useValue: mockUserRepo },
      ],
    }).compile();

    service = module.get<SharesService>(SharesService);
  });

  afterEach(() => jest.clearAllMocks());

  describe("share", () => {
    it("rejects sharing to self", async () => {
      const result = await service.share(5, ownerId, ownerId);
      expect(result).toBeNull();
      expect(mockScheduleRepo.findOne).not.toHaveBeenCalled();
    });

    it("rejects empty target", async () => {
      const result = await service.share(5, ownerId, "");
      expect(result).toBeNull();
    });

    it("returns null when schedule not owned by user", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      const result = await service.share(5, ownerId, targetId);
      expect(result).toBeNull();
    });

    it("returns null when target user does not exist", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        sharedWith: [],
      } as any);
      mockUserRepo.findOne.mockResolvedValue(null);
      const result = await service.share(5, ownerId, targetId);
      expect(result).toBeNull();
    });

    it("adds share entry when not already shared", async () => {
      const schedule: any = { id: 5, user_id: ownerId, sharedWith: [] };
      const target: User = { user_id: targetId, username: "u2" } as any;
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockUserRepo.findOne.mockResolvedValue(target);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.share(5, ownerId, targetId);

      expect(result).toEqual({ added: true, sharedWith: [target] });
      expect(mockScheduleRepo.save).toHaveBeenCalled();
    });

    it("noop if target already shared", async () => {
      const target: User = { user_id: targetId, username: "u2" } as any;
      const schedule: any = {
        id: 5,
        user_id: ownerId,
        sharedWith: [target],
      };
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockUserRepo.findOne.mockResolvedValue(target);

      const result = await service.share(5, ownerId, targetId);

      expect(result).toEqual({ added: false, sharedWith: [target] });
      expect(mockScheduleRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("unshare", () => {
    it("returns null when schedule not owned", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      const result = await service.unshare(5, ownerId, targetId);
      expect(result).toBeNull();
    });

    it("removes existing share", async () => {
      const target: User = { user_id: targetId, username: "u2" } as any;
      const other: User = { user_id: "u3", username: "u3" } as any;
      const schedule: any = {
        id: 5,
        user_id: ownerId,
        sharedWith: [target, other],
      };
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.unshare(5, ownerId, targetId);

      expect(result).toEqual({ removed: true, sharedWith: [other] });
      expect(schedule.sharedWith).toEqual([other]);
    });

    it("noop if target not in share list", async () => {
      const schedule: any = {
        id: 5,
        user_id: ownerId,
        sharedWith: [],
      };
      mockScheduleRepo.findOne.mockResolvedValue(schedule);

      const result = await service.unshare(5, ownerId, targetId);

      expect(result).toEqual({ removed: false, sharedWith: [] });
      expect(mockScheduleRepo.save).not.toHaveBeenCalled();
    });
  });

  describe("listSharedUsers", () => {
    it("returns sharedWith from owner schedule", async () => {
      const target: User = { user_id: targetId, username: "u2" } as any;
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        sharedWith: [target],
      } as any);
      const result = await service.listSharedUsers(5, ownerId);
      expect(result).toEqual([target]);
    });

    it("returns [] if not owner / not found", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      const result = await service.listSharedUsers(5, ownerId);
      expect(result).toEqual([]);
    });
  });

  describe("findSchedulesSharedWith", () => {
    it("queries schedules joined via schedule_shares", async () => {
      const fixture: Schedule = { id: 5 } as any;
      mockQb.getMany.mockResolvedValue([fixture]);

      const result = await service.findSchedulesSharedWith(targetId);

      expect(result).toEqual([fixture]);
      expect(mockQb.innerJoin).toHaveBeenCalledWith(
        "schedule_shares",
        "ss",
        expect.stringContaining("ss.shared_with_user_id = :userId"),
        { userId: targetId },
      );
    });
  });

  describe("grantEdit", () => {
    it("rejects grant to self", async () => {
      expect(await service.grantEdit(5, ownerId, ownerId)).toBeNull();
    });

    it("returns null when schedule not owned by ownerUserId", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      expect(await service.grantEdit(5, ownerId, targetId)).toBeNull();
    });

    it("returns null when target user does not exist", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        editors: [],
      } as any);
      mockUserRepo.findOne.mockResolvedValue(null);
      expect(await service.grantEdit(5, ownerId, targetId)).toBeNull();
    });

    it("returns added=false when target already has edit", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        editors: [{ user_id: targetId }],
      } as any);
      mockUserRepo.findOne.mockResolvedValue({ user_id: targetId } as any);
      const r = await service.grantEdit(5, ownerId, targetId);
      expect(r).toEqual({ added: false, editors: [{ user_id: targetId }] });
      expect(mockScheduleRepo.save).not.toHaveBeenCalled();
    });

    it("adds editor when not present", async () => {
      const sched = { id: 5, user_id: ownerId, editors: [] } as any;
      mockScheduleRepo.findOne.mockResolvedValue(sched);
      mockUserRepo.findOne.mockResolvedValue({ user_id: targetId } as any);
      mockScheduleRepo.save.mockResolvedValue(sched);
      const r = await service.grantEdit(5, ownerId, targetId);
      expect(r?.added).toBe(true);
      expect(r?.editors).toHaveLength(1);
      expect(mockScheduleRepo.save).toHaveBeenCalled();
    });
  });

  describe("revokeEdit", () => {
    it("returns null when not owner", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      expect(await service.revokeEdit(5, ownerId, targetId)).toBeNull();
    });

    it("returns removed=false when target was not editor", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        editors: [{ user_id: "other" }],
      } as any);
      const r = await service.revokeEdit(5, ownerId, targetId);
      expect(r).toEqual({
        removed: false,
        editors: [{ user_id: "other" }],
      });
    });

    it("removes editor when present", async () => {
      const sched = {
        id: 5,
        user_id: ownerId,
        editors: [{ user_id: targetId }, { user_id: "other" }],
      } as any;
      mockScheduleRepo.findOne.mockResolvedValue(sched);
      mockScheduleRepo.save.mockResolvedValue(sched);
      const r = await service.revokeEdit(5, ownerId, targetId);
      expect(r?.removed).toBe(true);
      expect(r?.editors).toEqual([{ user_id: "other" }]);
    });
  });

  describe("canEdit", () => {
    it("returns true for owner", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        editors: [],
      } as any);
      expect(await service.canEdit(5, ownerId)).toBe(true);
    });

    it("returns true for editor", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        editors: [{ user_id: targetId }],
      } as any);
      expect(await service.canEdit(5, targetId)).toBe(true);
    });

    it("returns false for view-only participant", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        editors: [],
      } as any);
      expect(await service.canEdit(5, "view-only-user")).toBe(false);
    });

    it("returns false when schedule not found", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      expect(await service.canEdit(5, ownerId)).toBe(false);
    });
  });

  describe("listEditors", () => {
    it("returns editors for owner", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        editors: [{ user_id: targetId }],
      } as any);
      const editors = await service.listEditors(5, ownerId);
      expect(editors).toEqual([{ user_id: targetId }]);
    });

    it("returns [] when schedule not found / not owner", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      const editors = await service.listEditors(5, ownerId);
      expect(editors).toEqual([]);
    });
  });

  describe("findSchedulesIShared", () => {
    it("returns only schedules with at least one viewer or editor", async () => {
      const sched1 = {
        id: 1,
        user_id: ownerId,
        sharedWith: [{ user_id: "u2" }],
        editors: [],
      };
      const sched2 = {
        id: 2,
        user_id: ownerId,
        sharedWith: [],
        editors: [{ user_id: "u3" }],
      };
      const sched3 = {
        id: 3,
        user_id: ownerId,
        sharedWith: [],
        editors: [],
      };
      (mockScheduleRepo.find as jest.Mock).mockResolvedValue([
        sched1,
        sched2,
        sched3,
      ] as any);
      const result = await service.findSchedulesIShared(ownerId);
      expect(result.map((s) => s.id)).toEqual([1, 2]);
    });

    it("returns [] when owner has no schedules", async () => {
      (mockScheduleRepo.find as jest.Mock).mockResolvedValue([] as any);
      const result = await service.findSchedulesIShared(ownerId);
      expect(result).toEqual([]);
    });
  });

  describe("getParticipantUserIds", () => {
    it("returns user_ids from sharedWith", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        sharedWith: [
          { user_id: "u2" },
          { user_id: "u3" },
        ],
      } as any);
      const result = await service.getParticipantUserIds(5);
      expect(result).toEqual(["u2", "u3"]);
    });

    it("returns [] when schedule not found", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      const result = await service.getParticipantUserIds(5);
      expect(result).toEqual([]);
    });
  });
});
