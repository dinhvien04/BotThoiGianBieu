import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SharesService } from "../../../app/bot/src/schedules/shares.service";
import { Schedule } from "../../../app/bot/src/schedules/entities/schedule.entity";
import { User } from "../../../app/bot/src/users/entities/user.entity";

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

    it("rejects null target", async () => {
      const result = await service.share(5, ownerId, null as any);
      expect(result).toBeNull();
    });

    it("returns null when schedule not owned by user", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      const result = await service.share(5, ownerId, targetId);
      expect(result).toBeNull();
      expect(mockScheduleRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5, user_id: ownerId },
        relations: ["sharedWith"],
      });
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
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: targetId },
      });
    });

    it("adds share entry when not already shared", async () => {
      const schedule: any = { id: 5, user_id: ownerId, sharedWith: [] };
      const target: User = { user_id: targetId, username: "u2" } as any;
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockUserRepo.findOne.mockResolvedValue(target);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.share(5, ownerId, targetId);

      expect(result).toEqual({ added: true, sharedWith: [target] });
      expect(schedule.sharedWith).toEqual([target]);
      expect(mockScheduleRepo.save).toHaveBeenCalledWith(schedule);
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

    it("handles schedule with null sharedWith", async () => {
      const schedule: any = { id: 5, user_id: ownerId, sharedWith: null };
      const target: User = { user_id: targetId, username: "u2" } as any;
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockUserRepo.findOne.mockResolvedValue(target);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      const result = await service.share(5, ownerId, targetId);

      expect(result).toEqual({ added: true, sharedWith: [target] });
      expect(schedule.sharedWith).toEqual([target]);
    });
  });

  describe("unshare", () => {
    it("returns null when schedule not owned", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      const result = await service.unshare(5, ownerId, targetId);
      expect(result).toBeNull();
      expect(mockScheduleRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5, user_id: ownerId },
        relations: ["sharedWith"],
      });
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
      expect(mockScheduleRepo.save).toHaveBeenCalledWith(schedule);
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

    it("handles schedule with null sharedWith", async () => {
      const schedule: any = {
        id: 5,
        user_id: ownerId,
        sharedWith: null,
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
      expect(mockScheduleRepo.findOne).not.toHaveBeenCalled();
    });

    it("rejects empty target", async () => {
      expect(await service.grantEdit(5, ownerId, "")).toBeNull();
      expect(mockScheduleRepo.findOne).not.toHaveBeenCalled();
    });

    it("returns null when schedule not owned by ownerUserId", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      expect(await service.grantEdit(5, ownerId, targetId)).toBeNull();
      expect(mockScheduleRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5, user_id: ownerId },
        relations: ["editors"],
      });
    });

    it("returns null when target user does not exist", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        editors: [],
      } as any);
      mockUserRepo.findOne.mockResolvedValue(null);
      expect(await service.grantEdit(5, ownerId, targetId)).toBeNull();
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: targetId },
      });
    });

    it("returns added=false when target already has edit", async () => {
      const existingEditor = { user_id: targetId };
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        editors: [existingEditor],
      } as any);
      mockUserRepo.findOne.mockResolvedValue({ user_id: targetId } as any);
      const r = await service.grantEdit(5, ownerId, targetId);
      expect(r).toEqual({ added: false, editors: [existingEditor] });
      expect(mockScheduleRepo.save).not.toHaveBeenCalled();
    });

    it("adds editor when not present", async () => {
      const sched = { id: 5, user_id: ownerId, editors: [] } as any;
      const target = { user_id: targetId } as any;
      mockScheduleRepo.findOne.mockResolvedValue(sched);
      mockUserRepo.findOne.mockResolvedValue(target);
      mockScheduleRepo.save.mockResolvedValue(sched);
      const r = await service.grantEdit(5, ownerId, targetId);
      expect(r?.added).toBe(true);
      expect(r?.editors).toEqual([target]);
      expect(sched.editors).toEqual([target]);
      expect(mockScheduleRepo.save).toHaveBeenCalledWith(sched);
    });

    it("handles schedule with null editors", async () => {
      const sched = { id: 5, user_id: ownerId, editors: null } as any;
      const target = { user_id: targetId } as any;
      mockScheduleRepo.findOne.mockResolvedValue(sched);
      mockUserRepo.findOne.mockResolvedValue(target);
      mockScheduleRepo.save.mockResolvedValue(sched);
      const r = await service.grantEdit(5, ownerId, targetId);
      expect(r?.added).toBe(true);
      expect(r?.editors).toEqual([target]);
    });
  });

  describe("revokeEdit", () => {
    it("returns null when not owner", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      expect(await service.revokeEdit(5, ownerId, targetId)).toBeNull();
      expect(mockScheduleRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5, user_id: ownerId },
        relations: ["editors"],
      });
    });

    it("returns removed=false when target was not editor", async () => {
      const otherEditor = { user_id: "other" };
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        user_id: ownerId,
        editors: [otherEditor],
      } as any);
      const r = await service.revokeEdit(5, ownerId, targetId);
      expect(r).toEqual({
        removed: false,
        editors: [otherEditor],
      });
      expect(mockScheduleRepo.save).not.toHaveBeenCalled();
    });

    it("removes editor when present", async () => {
      const targetEditor = { user_id: targetId };
      const otherEditor = { user_id: "other" };
      const sched = {
        id: 5,
        user_id: ownerId,
        editors: [targetEditor, otherEditor],
      } as any;
      mockScheduleRepo.findOne.mockResolvedValue(sched);
      mockScheduleRepo.save.mockResolvedValue(sched);
      const r = await service.revokeEdit(5, ownerId, targetId);
      expect(r?.removed).toBe(true);
      expect(r?.editors).toEqual([otherEditor]);
      expect(sched.editors).toEqual([otherEditor]);
      expect(mockScheduleRepo.save).toHaveBeenCalledWith(sched);
    });

    it("handles schedule with null editors", async () => {
      const sched = {
        id: 5,
        user_id: ownerId,
        editors: null,
      } as any;
      mockScheduleRepo.findOne.mockResolvedValue(sched);
      const r = await service.revokeEdit(5, ownerId, targetId);
      expect(r?.removed).toBe(false);
      expect(r?.editors).toEqual([]);
      expect(mockScheduleRepo.save).not.toHaveBeenCalled();
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
      expect(mockScheduleRepo.findOne).toHaveBeenCalledWith({
        where: { id: 5 },
        relations: ["sharedWith"],
      });
    });

    it("returns [] when schedule not found", async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);
      const result = await service.getParticipantUserIds(5);
      expect(result).toEqual([]);
    });

    it("handles schedule with null sharedWith", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        sharedWith: null,
      } as any);
      const result = await service.getParticipantUserIds(5);
      expect(result).toEqual([]);
    });

    it("handles empty sharedWith array", async () => {
      mockScheduleRepo.findOne.mockResolvedValue({
        id: 5,
        sharedWith: [],
      } as any);
      const result = await service.getParticipantUserIds(5);
      expect(result).toEqual([]);
    });
  });

  // Integration tests
  describe("Integration scenarios", () => {
    it("should handle complete share workflow", async () => {
      const schedule: any = { id: 5, user_id: ownerId, sharedWith: [] };
      const target: User = { user_id: targetId, username: "u2" } as any;
      
      // Setup mocks for share
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockUserRepo.findOne.mockResolvedValue(target);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      // Share
      const shareResult = await service.share(5, ownerId, targetId);
      expect(shareResult?.added).toBe(true);

      // List shared users
      const sharedUsers = await service.listSharedUsers(5, ownerId);
      expect(sharedUsers).toEqual([target]);

      // Get participant IDs
      const participantIds = await service.getParticipantUserIds(5);
      expect(participantIds).toEqual([targetId]);

      // Unshare
      const unshareResult = await service.unshare(5, ownerId, targetId);
      expect(unshareResult?.removed).toBe(true);
      expect(unshareResult?.sharedWith).toEqual([]);
    });

    it("should handle complete edit workflow", async () => {
      const schedule: any = { id: 5, user_id: ownerId, editors: [] };
      const target: User = { user_id: targetId, username: "u2" } as any;
      
      // Setup mocks
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockUserRepo.findOne.mockResolvedValue(target);
      mockScheduleRepo.save.mockResolvedValue(schedule);

      // Grant edit
      const grantResult = await service.grantEdit(5, ownerId, targetId);
      expect(grantResult?.added).toBe(true);

      // Check can edit
      const canEdit = await service.canEdit(5, targetId);
      expect(canEdit).toBe(true);

      // List editors
      const editors = await service.listEditors(5, ownerId);
      expect(editors).toEqual([target]);

      // Revoke edit
      const revokeResult = await service.revokeEdit(5, ownerId, targetId);
      expect(revokeResult?.removed).toBe(true);

      // Check can't edit anymore
      const canEditAfter = await service.canEdit(5, targetId);
      expect(canEditAfter).toBe(false);
    });
  });

  // Error handling tests
  describe("Error handling", () => {
    it("should handle database errors gracefully", async () => {
      mockScheduleRepo.findOne.mockRejectedValue(new Error("DB Error"));
      
      await expect(service.share(5, ownerId, targetId)).rejects.toThrow("DB Error");
      await expect(service.unshare(5, ownerId, targetId)).rejects.toThrow("DB Error");
      await expect(service.grantEdit(5, ownerId, targetId)).rejects.toThrow("DB Error");
      await expect(service.revokeEdit(5, ownerId, targetId)).rejects.toThrow("DB Error");
      await expect(service.canEdit(5, targetId)).rejects.toThrow("DB Error");
      await expect(service.listSharedUsers(5, ownerId)).rejects.toThrow("DB Error");
      await expect(service.listEditors(5, ownerId)).rejects.toThrow("DB Error");
      await expect(service.getParticipantUserIds(5)).rejects.toThrow("DB Error");
    });

    it("should handle save errors", async () => {
      const schedule: any = { id: 5, user_id: ownerId, sharedWith: [] };
      const target: User = { user_id: targetId, username: "u2" } as any;
      
      mockScheduleRepo.findOne.mockResolvedValue(schedule);
      mockUserRepo.findOne.mockResolvedValue(target);
      mockScheduleRepo.save.mockRejectedValue(new Error("Save Error"));

      await expect(service.share(5, ownerId, targetId)).rejects.toThrow("Save Error");
    });
  });
});
