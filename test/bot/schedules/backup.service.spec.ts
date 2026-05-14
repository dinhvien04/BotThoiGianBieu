import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { BackupService } from "src/schedules/backup.service";
import { Schedule } from "src/schedules/entities/schedule.entity";
import { Tag } from "src/schedules/entities/tag.entity";
import { ScheduleTemplate } from "src/schedules/entities/schedule-template.entity";
import { UserSettings } from "src/users/entities/user-settings.entity";

describe("BackupService", () => {
  let service: BackupService;
  let mockSchedule: jest.Mocked<Pick<Repository<Schedule>, "find">>;
  let mockTag: jest.Mocked<Pick<Repository<Tag>, "find">>;
  let mockTemplate: jest.Mocked<Pick<Repository<ScheduleTemplate>, "find">>;
  let mockSettings: jest.Mocked<Pick<Repository<UserSettings>, "findOne">>;

  beforeEach(async () => {
    mockSchedule = { find: jest.fn() };
    mockTag = { find: jest.fn() };
    mockTemplate = { find: jest.fn() };
    mockSettings = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: getRepositoryToken(Schedule), useValue: mockSchedule },
        { provide: getRepositoryToken(Tag), useValue: mockTag },
        { provide: getRepositoryToken(ScheduleTemplate), useValue: mockTemplate },
        { provide: getRepositoryToken(UserSettings), useValue: mockSettings },
      ],
    }).compile();
    service = module.get(BackupService);
  });

  it("returns full backup with all sections populated", async () => {
    mockSchedule.find.mockResolvedValue([
      {
        id: 1,
        item_type: "task",
        title: "Họp",
        description: "ghi chú",
        start_time: new Date("2026-04-25T02:00:00Z"),
        end_time: new Date("2026-04-25T03:00:00Z"),
        status: "pending",
        priority: "high",
        remind_at: null,
        recurrence_type: "weekly",
        recurrence_interval: 1,
        recurrence_until: new Date("2026-12-31T00:00:00Z"),
        recurrence_parent_id: null,
        acknowledged_at: null,
        tags: [{ name: "work" } as Tag],
        sharedWith: [{ user_id: "u2" } as any],
      } as any,
    ]);
    mockTag.find.mockResolvedValue([
      { id: 1, name: "work", color: "#ff0000" } as Tag,
    ]);
    mockTemplate.find.mockResolvedValue([
      {
        id: 5,
        name: "morning-stand",
        item_type: "meeting",
        title: "Standup",
        description: null,
        duration_minutes: 30,
        default_remind_minutes: 5,
        priority: "normal",
      } as ScheduleTemplate,
    ]);
    mockSettings.findOne.mockResolvedValue({
      timezone: "Asia/Ho_Chi_Minh",
      default_channel_id: "ch1",
      default_remind_minutes: 30,
      notify_via_dm: true,
      notify_via_channel: false,
      work_start_hour: 8,
      work_end_hour: 18,
    } as UserSettings);

    const now = new Date("2026-04-25T05:00:00Z");
    const backup = await service.buildBackup("u1", now);

    expect(backup.version).toBe(1);
    expect(backup.exported_at).toBe("2026-04-25T05:00:00.000Z");
    expect(backup.user_id).toBe("u1");
    expect(backup.settings?.work_start_hour).toBe(8);
    expect(backup.tags).toEqual([{ id: 1, name: "work", color: "#ff0000" }]);
    expect(backup.templates).toHaveLength(1);
    expect(backup.templates[0].name).toBe("morning-stand");
    expect(backup.schedules).toHaveLength(1);
    expect(backup.schedules[0]).toMatchObject({
      id: 1,
      title: "Họp",
      tag_names: ["work"],
      shared_with_user_ids: ["u2"],
      recurrence_until: "2026-12-31T00:00:00.000Z",
    });
  });

  it("handles user with no data", async () => {
    mockSchedule.find.mockResolvedValue([]);
    mockTag.find.mockResolvedValue([]);
    mockTemplate.find.mockResolvedValue([]);
    mockSettings.findOne.mockResolvedValue(null);

    const backup = await service.buildBackup("u1", new Date());

    expect(backup.schedules).toEqual([]);
    expect(backup.tags).toEqual([]);
    expect(backup.templates).toEqual([]);
    expect(backup.settings).toBeNull();
  });
});
