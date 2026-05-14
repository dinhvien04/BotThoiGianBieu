import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import {
  StreakService,
  toVNDateKey,
  streakBadge,
} from "src/schedules/streak.service";
import { Schedule } from "src/schedules/entities/schedule.entity";

describe("StreakService", () => {
  let service: StreakService;
  let mockRepo: jest.Mocked<Pick<Repository<Schedule>, "find">>;

  const userId = "u1";

  // helper: build a Date that resolves to the given VN date+hour.
  // VN_OFFSET is +07:00 → utc = vn - 7h.
  function vnDate(vn: string, hour = 12): Date {
    const [y, m, d] = vn.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, hour - 7, 0, 0));
  }

  beforeEach(async () => {
    mockRepo = { find: jest.fn() };
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StreakService,
        { provide: getRepositoryToken(Schedule), useValue: mockRepo },
      ],
    }).compile();
    service = module.get(StreakService);
  });

  describe("toVNDateKey", () => {
    it("converts UTC to VN date", () => {
      // 2026-01-01 23:00 UTC = 2026-01-02 06:00 VN
      expect(toVNDateKey(new Date(Date.UTC(2026, 0, 1, 23, 0, 0)))).toBe(
        "2026-01-02",
      );
    });
  });

  describe("streakBadge", () => {
    it("scales by milestone", () => {
      expect(streakBadge(0)).toBe("");
      expect(streakBadge(2)).toBe("");
      expect(streakBadge(3)).toContain("Khởi đầu");
      expect(streakBadge(7)).toContain("tuần");
      expect(streakBadge(30)).toContain("tháng");
      expect(streakBadge(100)).toContain("Kim cương");
      expect(streakBadge(365)).toContain("Truyền kỳ");
    });
  });

  describe("computeStreak", () => {
    it("returns zeros when no completions", async () => {
      mockRepo.find.mockResolvedValue([]);
      const stats = await service.computeStreak(userId, vnDate("2026-04-25"));
      expect(stats).toEqual({
        currentStreak: 0,
        longestStreak: 0,
        daysActive: 0,
        totalCompleted: 0,
        lastCompletedDate: null,
      });
    });

    it("counts current streak ending today", async () => {
      mockRepo.find.mockResolvedValue([
        { id: 1, acknowledged_at: vnDate("2026-04-23") } as Schedule,
        { id: 2, acknowledged_at: vnDate("2026-04-24") } as Schedule,
        { id: 3, acknowledged_at: vnDate("2026-04-25") } as Schedule,
      ]);
      const stats = await service.computeStreak(userId, vnDate("2026-04-25"));
      expect(stats.currentStreak).toBe(3);
      expect(stats.longestStreak).toBe(3);
      expect(stats.daysActive).toBe(3);
      expect(stats.totalCompleted).toBe(3);
      expect(stats.lastCompletedDate).toBe("2026-04-25");
    });

    it("counts current streak ending yesterday", async () => {
      mockRepo.find.mockResolvedValue([
        { id: 1, acknowledged_at: vnDate("2026-04-23") } as Schedule,
        { id: 2, acknowledged_at: vnDate("2026-04-24") } as Schedule,
      ]);
      const stats = await service.computeStreak(userId, vnDate("2026-04-25"));
      expect(stats.currentStreak).toBe(2);
    });

    it("returns 0 current streak when last day was 2 days ago", async () => {
      mockRepo.find.mockResolvedValue([
        { id: 1, acknowledged_at: vnDate("2026-04-23") } as Schedule,
      ]);
      const stats = await service.computeStreak(userId, vnDate("2026-04-25"));
      expect(stats.currentStreak).toBe(0);
      expect(stats.longestStreak).toBe(1);
    });

    it("computes longest streak across gaps", async () => {
      // Run A: 4 days. Gap. Run B: 2 days. Today: 1 day.
      mockRepo.find.mockResolvedValue([
        { id: 1, acknowledged_at: vnDate("2026-04-01") } as Schedule,
        { id: 2, acknowledged_at: vnDate("2026-04-02") } as Schedule,
        { id: 3, acknowledged_at: vnDate("2026-04-03") } as Schedule,
        { id: 4, acknowledged_at: vnDate("2026-04-04") } as Schedule,
        { id: 5, acknowledged_at: vnDate("2026-04-10") } as Schedule,
        { id: 6, acknowledged_at: vnDate("2026-04-11") } as Schedule,
        { id: 7, acknowledged_at: vnDate("2026-04-25") } as Schedule,
      ]);
      const stats = await service.computeStreak(userId, vnDate("2026-04-25"));
      expect(stats.longestStreak).toBe(4);
      expect(stats.currentStreak).toBe(1);
      expect(stats.daysActive).toBe(7);
    });

    it("dedupes multiple completions on same day", async () => {
      mockRepo.find.mockResolvedValue([
        { id: 1, acknowledged_at: vnDate("2026-04-25", 8) } as Schedule,
        { id: 2, acknowledged_at: vnDate("2026-04-25", 14) } as Schedule,
        { id: 3, acknowledged_at: vnDate("2026-04-25", 20) } as Schedule,
      ]);
      const stats = await service.computeStreak(userId, vnDate("2026-04-25"));
      expect(stats.currentStreak).toBe(1);
      expect(stats.daysActive).toBe(1);
      expect(stats.totalCompleted).toBe(3);
    });
  });
});
