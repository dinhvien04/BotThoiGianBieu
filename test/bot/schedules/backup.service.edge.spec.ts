import { getRepositoryToken } from "@nestjs/typeorm";
import { Test, TestingModule } from "@nestjs/testing";
import { Repository } from "typeorm";
import {
  BackupService,
  BackupV1,
  summarizeBackup,
} from "src/schedules/backup.service";
import { Schedule } from "src/schedules/entities/schedule.entity";
import { ScheduleTemplate } from "src/schedules/entities/schedule-template.entity";
import { Tag } from "src/schedules/entities/tag.entity";
import { UserSettings } from "src/users/entities/user-settings.entity";

describe("BackupService edge cases", () => {
  let service: BackupService;
  let scheduleRepository: jest.Mocked<Pick<Repository<Schedule>, "find">>;
  let tagRepository: jest.Mocked<Pick<Repository<Tag>, "find">>;
  let templateRepository: jest.Mocked<Pick<Repository<ScheduleTemplate>, "find">>;
  let settingsRepository: jest.Mocked<Pick<Repository<UserSettings>, "findOne">>;

  const date = new Date("2026-05-15T01:02:03.000Z");

  function schedule(overrides: Partial<Schedule> = {}): Schedule {
    return {
      id: 7,
      user_id: "u1",
      item_type: "task",
      title: "Task",
      description: null,
      start_time: new Date("2026-05-16T02:00:00.000Z"),
      end_time: null,
      status: "pending",
      priority: "normal",
      remind_at: null,
      recurrence_type: "none",
      recurrence_interval: 1,
      recurrence_until: null,
      recurrence_parent_id: null,
      acknowledged_at: null,
      tags: [],
      sharedWith: [],
      ...overrides,
    } as unknown as Schedule;
  }

  beforeEach(async () => {
    scheduleRepository = { find: jest.fn().mockResolvedValue([]) };
    tagRepository = { find: jest.fn().mockResolvedValue([]) };
    templateRepository = { find: jest.fn().mockResolvedValue([]) };
    settingsRepository = { findOne: jest.fn().mockResolvedValue(null) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BackupService,
        { provide: getRepositoryToken(Schedule), useValue: scheduleRepository },
        { provide: getRepositoryToken(Tag), useValue: tagRepository },
        {
          provide: getRepositoryToken(ScheduleTemplate),
          useValue: templateRepository,
        },
        {
          provide: getRepositoryToken(UserSettings),
          useValue: settingsRepository,
        },
      ],
    }).compile();
    service = module.get(BackupService);
  });

  it("queries every repository with the requested user id", async () => {
    await service.buildBackup("u1", date);

    expect(scheduleRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { user_id: "u1" },
        relations: ["tags", "sharedWith"],
      }),
    );
    expect(tagRepository.find).toHaveBeenCalledWith({
      where: { user_id: "u1" },
      order: { name: "ASC" },
    });
    expect(templateRepository.find).toHaveBeenCalledWith({
      where: { user_id: "u1" },
      order: { name: "ASC" },
    });
    expect(settingsRepository.findOne).toHaveBeenCalledWith({
      where: { user_id: "u1" },
    });
  });

  it("requests schedules ordered by start_time ascending", async () => {
    await service.buildBackup("u1", date);
    expect(scheduleRepository.find).toHaveBeenCalledWith(
      expect.objectContaining({ order: { start_time: "ASC" } }),
    );
  });

  it("uses the provided export time", async () => {
    const backup = await service.buildBackup("u1", date);
    expect(backup.exported_at).toBe("2026-05-15T01:02:03.000Z");
  });

  it("serializes nullable schedule fields as null", async () => {
    scheduleRepository.find.mockResolvedValueOnce([schedule()]);

    const backup = await service.buildBackup("u1", date);

    expect(backup.schedules[0]).toMatchObject({
      end_time: null,
      remind_at: null,
      recurrence_until: null,
      recurrence_parent_id: null,
      acknowledged_at: null,
      tag_names: [],
      shared_with_user_ids: [],
    });
  });

  it("serializes optional schedule dates when present", async () => {
    scheduleRepository.find.mockResolvedValueOnce([
      schedule({
        end_time: new Date("2026-05-16T03:00:00.000Z"),
        remind_at: new Date("2026-05-16T01:45:00.000Z"),
        recurrence_until: new Date("2026-06-01T00:00:00.000Z"),
        acknowledged_at: new Date("2026-05-16T04:00:00.000Z"),
      }),
    ]);

    const backup = await service.buildBackup("u1", date);

    expect(backup.schedules[0]).toMatchObject({
      end_time: "2026-05-16T03:00:00.000Z",
      remind_at: "2026-05-16T01:45:00.000Z",
      recurrence_until: "2026-06-01T00:00:00.000Z",
      acknowledged_at: "2026-05-16T04:00:00.000Z",
    });
  });

  it("serializes tags and shared users from relations", async () => {
    scheduleRepository.find.mockResolvedValueOnce([
      schedule({
        tags: [{ name: "work" }, { name: "urgent" }] as Tag[],
        sharedWith: [{ user_id: "u2" }, { user_id: "u3" }] as never,
      }),
    ]);

    const backup = await service.buildBackup("u1", date);

    expect(backup.schedules[0].tag_names).toEqual(["work", "urgent"]);
    expect(backup.schedules[0].shared_with_user_ids).toEqual(["u2", "u3"]);
  });

  it("tolerates missing relation arrays", async () => {
    scheduleRepository.find.mockResolvedValueOnce([
      schedule({ tags: undefined, sharedWith: undefined } as never),
    ]);

    const backup = await service.buildBackup("u1", date);

    expect(backup.schedules[0].tag_names).toEqual([]);
    expect(backup.schedules[0].shared_with_user_ids).toEqual([]);
  });

  it("serializes tag color null when absent", async () => {
    tagRepository.find.mockResolvedValueOnce([
      { id: 1, name: "personal", color: null } as Tag,
    ]);

    const backup = await service.buildBackup("u1", date);

    expect(backup.tags).toEqual([{ id: 1, name: "personal", color: null }]);
  });

  it("serializes template optional fields", async () => {
    templateRepository.find.mockResolvedValueOnce([
      {
        id: 9,
        name: "deep-work",
        item_type: "task",
        title: "Deep work",
        description: null,
        duration_minutes: null,
        default_remind_minutes: null,
        priority: "high",
      } as ScheduleTemplate,
    ]);

    const backup = await service.buildBackup("u1", date);

    expect(backup.templates[0]).toEqual({
      id: 9,
      name: "deep-work",
      item_type: "task",
      title: "Deep work",
      description: null,
      duration_minutes: null,
      default_remind_minutes: null,
      priority: "high",
    });
  });

  it("preserves settings booleans and work hours", async () => {
    settingsRepository.findOne.mockResolvedValueOnce({
      timezone: "Asia/Tokyo",
      default_channel_id: null,
      default_remind_minutes: 0,
      notify_via_dm: false,
      notify_via_channel: true,
      work_start_hour: 0,
      work_end_hour: 0,
    } as UserSettings);

    const backup = await service.buildBackup("u1", date);

    expect(backup.settings).toEqual({
      timezone: "Asia/Tokyo",
      default_channel_id: null,
      default_remind_minutes: 0,
      notify_via_dm: false,
      notify_via_channel: true,
      work_start_hour: 0,
      work_end_hour: 0,
    });
  });

  it("summarizes populated backups", () => {
    const backup: BackupV1 = {
      version: 1,
      exported_at: date.toISOString(),
      user_id: "u1",
      settings: {
        timezone: "UTC",
        default_channel_id: null,
        default_remind_minutes: 30,
        notify_via_dm: false,
        notify_via_channel: true,
        work_start_hour: 9,
        work_end_hour: 18,
      },
      tags: [{ id: 1, name: "work", color: null }],
      templates: [{ id: 1 } as never],
      schedules: [{ id: 1 } as never, { id: 2 } as never],
    };

    expect(summarizeBackup(backup)).toBe(
      "Schedules: 2 · Tags: 1 · Templates: 1 · Settings: yes",
    );
  });

  it("summarizes empty backups", () => {
    expect(
      summarizeBackup({
        version: 1,
        exported_at: date.toISOString(),
        user_id: "u1",
        settings: null,
        tags: [],
        templates: [],
        schedules: [],
      }),
    ).toBe("Schedules: 0 · Tags: 0 · Templates: 0 · Settings: no");
  });
});
