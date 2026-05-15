import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NotFoundException } from "@nestjs/common";
import { AdminService } from "../../../app/bot/src/admin/admin.service";
import { User } from "../../../app/bot/src/users/entities/user.entity";
import { Schedule } from "../../../app/bot/src/schedules/entities/schedule.entity";
import { ScheduleAuditLog } from "../../../app/bot/src/schedules/entities/schedule-audit-log.entity";
import { SystemSetting } from "../../../app/bot/src/admin/entities/system-setting.entity";
import { Broadcast } from "../../../app/bot/src/admin/entities/broadcast.entity";

type ChainableQB = {
  leftJoin: jest.Mock;
  select: jest.Mock;
  addSelect: jest.Mock;
  where: jest.Mock;
  andWhere: jest.Mock;
  orderBy: jest.Mock;
  groupBy: jest.Mock;
  offset: jest.Mock;
  limit: jest.Mock;
  clone: jest.Mock;
  getRawMany: jest.Mock;
  getRawOne: jest.Mock;
  getCount: jest.Mock;
};

function makeChainableQB(overrides: Partial<ChainableQB> = {}): ChainableQB {
  const qb: ChainableQB = {
    leftJoin: jest.fn().mockReturnThis() as unknown as jest.Mock,
    select: jest.fn().mockReturnThis() as unknown as jest.Mock,
    addSelect: jest.fn().mockReturnThis() as unknown as jest.Mock,
    where: jest.fn().mockReturnThis() as unknown as jest.Mock,
    andWhere: jest.fn().mockReturnThis() as unknown as jest.Mock,
    orderBy: jest.fn().mockReturnThis() as unknown as jest.Mock,
    groupBy: jest.fn().mockReturnThis() as unknown as jest.Mock,
    offset: jest.fn().mockReturnThis() as unknown as jest.Mock,
    limit: jest.fn().mockReturnThis() as unknown as jest.Mock,
    clone: jest.fn(),
    getRawMany: jest.fn().mockResolvedValue([]),
    getRawOne: jest.fn().mockResolvedValue({ cnt: 0 }),
    getCount: jest.fn().mockResolvedValue(0),
  };
  qb.clone.mockReturnValue(qb);
  Object.assign(qb, overrides);
  return qb;
}

describe("AdminService", () => {
  let service: AdminService;
  let userRepo: jest.Mocked<{
    count: jest.Mock;
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
    manager: { query: jest.Mock; transaction: jest.Mock };
  }>;
  let scheduleRepo: jest.Mocked<{
    count: jest.Mock;
    findOne: jest.Mock;
    delete: jest.Mock;
    createQueryBuilder: jest.Mock;
  }>;
  let auditRepo: jest.Mocked<{ createQueryBuilder: jest.Mock }>;
  let settingRepo: jest.Mocked<{
    find: jest.Mock;
    findOne: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
  }>;
  let broadcastRepo: jest.Mocked<{
    create: jest.Mock;
    save: jest.Mock;
    findAndCount: jest.Mock;
  }>;
  let managerQuery: jest.Mock;

  beforeEach(async () => {
    managerQuery = jest.fn().mockResolvedValue([]);
    userRepo = {
      count: jest.fn().mockResolvedValue(0),
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(async (u) => u),
      create: jest.fn((u) => u),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
      manager: {
        query: managerQuery,
        transaction: jest.fn(async (cb) => {
          const m = {
            query: jest.fn().mockResolvedValue([]),
            delete: jest.fn().mockResolvedValue({}),
          };
          await cb(m);
          return undefined;
        }),
      },
    } as never;
    scheduleRepo = {
      count: jest.fn().mockResolvedValue(0),
      findOne: jest.fn(),
      delete: jest.fn(),
      createQueryBuilder: jest.fn(),
    } as never;
    auditRepo = { createQueryBuilder: jest.fn() } as never;
    settingRepo = {
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn(),
      save: jest.fn(async (s) => s),
      create: jest.fn((s) => s),
    } as never;
    broadcastRepo = {
      create: jest.fn((b) => b),
      save: jest.fn(async (b) => ({ ...b, id: "1" })),
      findAndCount: jest.fn().mockResolvedValue([[], 0]),
    } as never;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(Schedule), useValue: scheduleRepo },
        { provide: getRepositoryToken(ScheduleAuditLog), useValue: auditRepo },
        { provide: getRepositoryToken(SystemSetting), useValue: settingRepo },
        { provide: getRepositoryToken(Broadcast), useValue: broadcastRepo },
      ],
    }).compile();
    service = module.get(AdminService);
  });

  describe("getDashboardStats", () => {
    it("aggregates counts and per-day chart data", async () => {
      userRepo.count
        .mockResolvedValueOnce(10) // total_users
        .mockResolvedValueOnce(2) // total_admins
        .mockResolvedValueOnce(1); // locked_users
      scheduleRepo.count
        .mockResolvedValueOnce(50) // total
        .mockResolvedValueOnce(30) // pending
        .mockResolvedValueOnce(20); // completed
      userRepo.createQueryBuilder.mockReturnValue(
        makeChainableQB({ getCount: jest.fn().mockResolvedValue(3) }),
      );
      scheduleRepo.createQueryBuilder.mockReturnValue(
        makeChainableQB({ getCount: jest.fn().mockResolvedValue(5) }),
      );
      managerQuery.mockResolvedValueOnce([{ date: "2026-05-15", count: 4 }]);
      managerQuery.mockResolvedValueOnce([{ date: "2026-05-15", count: 7 }]);

      const stats = await service.getDashboardStats();
      expect(stats).toEqual({
        total_users: 10,
        total_admins: 2,
        locked_users: 1,
        total_schedules: 50,
        schedules_pending: 30,
        schedules_completed: 20,
        new_users_today: 3,
        new_schedules_today: 5,
        signups_last_30_days: [{ date: "2026-05-15", count: 4 }],
        schedules_last_30_days: [{ date: "2026-05-15", count: 7 }],
      });
    });
  });

  describe("listUsers", () => {
    it("applies search/role/locked filters and pagination", async () => {
      const qb = makeChainableQB({
        getRawMany: jest.fn().mockResolvedValue([
          {
            user_id: "u-1",
            username: "alice",
            display_name: "Alice",
            role: "admin",
            is_locked: false,
            created_at: new Date("2026-05-15"),
            updated_at: new Date("2026-05-15"),
            schedule_count: "7",
          },
        ]),
      });
      const countQb = makeChainableQB({
        getCount: jest.fn().mockResolvedValue(1),
      });
      userRepo.createQueryBuilder
        .mockReturnValueOnce(qb)
        .mockReturnValueOnce(countQb);

      const result = await service.listUsers({
        page: 1,
        limit: 10,
        search: "alice",
        role: "admin",
        locked: false,
      });
      expect(result.total).toBe(1);
      expect(result.items[0].schedule_count).toBe(7);
      expect(result.items[0].is_locked).toBe(false);
      expect(qb.andWhere).toHaveBeenCalled();
      expect(qb.offset).toHaveBeenCalledWith(0);
      expect(qb.limit).toHaveBeenCalledWith(10);
    });

    it("clamps invalid page/limit to safe range", async () => {
      const qb = makeChainableQB();
      const countQb = makeChainableQB();
      userRepo.createQueryBuilder.mockReturnValue(qb);
      // 2nd call returns countQb
      userRepo.createQueryBuilder
        .mockReturnValueOnce(qb)
        .mockReturnValueOnce(countQb);
      const result = await service.listUsers({
        page: -5,
        limit: 500,
      });
      expect(result.page).toBe(1);
      expect(result.limit).toBe(100);
    });
  });

  describe("user mutations", () => {
    it("setRole updates user role", async () => {
      const user = { user_id: "u-1", role: "user" } as User;
      userRepo.findOne.mockResolvedValue(user);
      const result = await service.setRole("u-1", "admin");
      expect(result.role).toBe("admin");
      expect(userRepo.save).toHaveBeenCalled();
    });

    it("setRole throws when user missing", async () => {
      userRepo.findOne.mockResolvedValue(null);
      await expect(service.setRole("nope", "admin")).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("setLocked updates is_locked", async () => {
      const user = { user_id: "u-1", is_locked: false } as User;
      userRepo.findOne.mockResolvedValue(user);
      const result = await service.setLocked("u-1", true);
      expect(result.is_locked).toBe(true);
    });

    it("getUserDetail returns user + counts", async () => {
      userRepo.findOne.mockResolvedValue({ user_id: "u-1" } as User);
      scheduleRepo.count.mockResolvedValueOnce(3);
      scheduleRepo.count.mockResolvedValueOnce(2);
      scheduleRepo.count.mockResolvedValueOnce(1);
      const detail = await service.getUserDetail("u-1");
      expect(detail.schedule_count).toBe(3);
      expect(detail.pending_count).toBe(2);
      expect(detail.completed_count).toBe(1);
    });

    it("deleteUser cascades to schedules/audit/settings", async () => {
      userRepo.findOne.mockResolvedValue({ user_id: "u-1" } as User);
      const txQueryFn = jest.fn().mockResolvedValue([]);
      const txDeleteFn = jest.fn().mockResolvedValue({});
      userRepo.manager.transaction = jest.fn(async (cb) => {
        await cb({ query: txQueryFn, delete: txDeleteFn });
      }) as never;
      await service.deleteUser("u-1");
      expect(txQueryFn).toHaveBeenCalledWith(
        expect.stringContaining("schedule_audit_logs"),
        ["u-1"],
      );
      expect(txDeleteFn).toHaveBeenCalledWith(User, { user_id: "u-1" });
    });
  });

  describe("listSchedules", () => {
    it("queries schedules with filters and total count", async () => {
      const qb = makeChainableQB({
        getRawMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            user_id: "u-1",
            user_display_name: "Alice",
            user_username: "alice",
            title: "Học",
            status: "pending",
            priority: "high",
            start_time: new Date(),
            end_time: null,
            created_at: new Date(),
          },
        ]),
      });
      const cloneQb = makeChainableQB({
        getRawOne: jest.fn().mockResolvedValue({ cnt: 1 }),
      });
      qb.clone = jest.fn().mockReturnValue(cloneQb);
      scheduleRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.listSchedules({
        page: 1,
        limit: 10,
        search: "học",
        status: "pending",
        user_id: "u-1",
      });
      expect(result.total).toBe(1);
      expect(result.items[0].user_display_name).toBe("Alice");
    });

    it("deleteSchedule errors when not found", async () => {
      scheduleRepo.findOne.mockResolvedValue(null);
      await expect(service.deleteSchedule(99)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it("deleteSchedule deletes when found", async () => {
      scheduleRepo.findOne.mockResolvedValue({ id: 5 } as Schedule);
      await service.deleteSchedule(5);
      expect(scheduleRepo.delete).toHaveBeenCalledWith({ id: 5 });
    });
  });

  describe("audit logs", () => {
    it("lists with filters", async () => {
      const qb = makeChainableQB({
        getRawMany: jest.fn().mockResolvedValue([
          {
            id: "10",
            schedule_id: 1,
            user_id: "u-1",
            user_display_name: "Alice",
            action: "create",
            changes: { title: "X" },
            created_at: new Date(),
          },
        ]),
      });
      const cloneQb = makeChainableQB({
        getRawOne: jest.fn().mockResolvedValue({ cnt: 1 }),
      });
      qb.clone = jest.fn().mockReturnValue(cloneQb);
      auditRepo.createQueryBuilder.mockReturnValue(qb);
      const result = await service.listAuditLogs({
        page: 1,
        limit: 10,
        user_id: "u-1",
        action: "create",
        schedule_id: 1,
      });
      expect(result.total).toBe(1);
      expect(result.items[0].action).toBe("create");
    });
  });

  describe("settings", () => {
    it("getAllSettings flattens rows into key/value map", async () => {
      settingRepo.find.mockResolvedValue([
        { key: "bot_enabled", value: true },
        { key: "site_banner", value: { enabled: false } },
      ] as SystemSetting[]);
      const settings = await service.getAllSettings();
      expect(settings.bot_enabled).toBe(true);
    });

    it("getSetting returns null when missing", async () => {
      settingRepo.findOne.mockResolvedValue(null);
      expect(await service.getSetting("nope")).toBeNull();
    });

    it("setSetting updates existing row", async () => {
      const existing = { key: "k", value: "old" } as SystemSetting;
      settingRepo.findOne.mockResolvedValue(existing);
      const result = await service.setSetting("k", "new", "admin-1");
      expect(result.value).toBe("new");
      expect(result.updated_by).toBe("admin-1");
    });

    it("setSetting creates row when not exists", async () => {
      settingRepo.findOne.mockResolvedValue(null);
      const result = await service.setSetting("k2", { x: 1 }, "admin-1");
      expect(settingRepo.create).toHaveBeenCalled();
      expect(result.value).toEqual({ x: 1 });
    });
  });

  describe("broadcast", () => {
    it("findBroadcastRecipients respects role + only_unlocked", async () => {
      await service.findBroadcastRecipients({
        role: "user",
        only_unlocked: true,
      });
      expect(userRepo.find).toHaveBeenCalledWith({
        where: { role: "user", is_locked: false },
      });
    });

    it("findBroadcastRecipients skips locked filter when explicitly disabled", async () => {
      await service.findBroadcastRecipients({ only_unlocked: false });
      expect(userRepo.find).toHaveBeenCalledWith({ where: {} });
    });

    it("recordBroadcast persists with correct fields", async () => {
      const out = await service.recordBroadcast({
        sender_user_id: "admin-1",
        message: "hi",
        recipient_filter: { role: "user" },
        total: 5,
        success: 4,
        failed: 1,
      });
      expect(out.message).toBe("hi");
      expect(out.total_recipients).toBe(5);
    });

    it("listBroadcasts maps results", async () => {
      broadcastRepo.findAndCount.mockResolvedValue([
        [
          {
            id: "10",
            sender_user_id: "a",
            message: "m",
            recipient_filter: null,
            total_recipients: 1,
            success_count: 1,
            failed_count: 0,
            created_at: new Date(),
          } as unknown as Broadcast,
        ],
        1,
      ]);
      const result = await service.listBroadcasts({ page: 1, limit: 20 });
      expect(result.total).toBe(1);
      expect(result.items[0].sender_user_id).toBe("a");
    });
  });
});
