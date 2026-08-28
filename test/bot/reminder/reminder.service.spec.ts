import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { DataSource } from 'typeorm';
import { ReminderService, REMINDER_INTERACTION_ID } from 'src/reminder/reminder.service';
import { SchedulesService } from 'src/schedules/schedules.service';
import { BotService } from 'src/bot/bot.service';
import { DateParser } from 'src/shared/utils/date-parser';
import { Schedule } from 'src/schedules/entities/schedule.entity';
import { User } from 'src/users/entities/user.entity';
import { UserSettings } from 'src/users/entities/user-settings.entity';
import { UsersService } from 'src/users/users.service';

describe('ReminderService', () => {
  let service: ReminderService;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockBotService: jest.Mocked<BotService>;
  let mockDateParser: jest.Mocked<DateParser>;
  let mockUsersService: jest.Mocked<UsersService>;

  const mockUser: User = {
    user_id: 'user123',
    username: 'testuser',
    display_name: 'Test User',
    created_at: new Date(),
    updated_at: new Date(),
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_until: null,
    priority: 'normal',
    recurrence_parent_id: null,
    is_pinned: false,
    is_hidden: false,
  } as any;

  const mockSettings: UserSettings = {
    user_id: 'user123',
    timezone: 'Asia/Ho_Chi_Minh',
    default_remind_minutes: 15,
    default_channel_id: 'channel123',
    notify_via_dm: false,
    created_at: new Date(),
    updated_at: new Date(),
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_until: null,
    priority: 'normal',
    recurrence_parent_id: null,
    is_pinned: false,
    is_hidden: false,
  } as any;

  const mockSchedule: Schedule = {
    id: 1,
    user_id: 'user123',
    item_type: 'task',
    title: 'Test Task',
    description: 'Test Description',
    start_time: new Date('2026-04-23T10:00:00Z'),
    end_time: new Date('2026-04-23T11:00:00Z'),
    status: 'pending',
    remind_at: new Date('2026-04-23T09:45:00Z'),
    is_reminded: false,
    acknowledged_at: null,
    end_notified_at: null,
    created_at: new Date('2026-04-20T08:00:00Z'),
    updated_at: new Date('2026-04-20T08:00:00Z'),
    user: mockUser,
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_until: null,
    priority: 'normal',
    recurrence_parent_id: null,
    is_pinned: false,
    is_hidden: false,
  };

  beforeEach(async () => {
    mockSchedulesService = {
      findDueReminders: jest.fn(),
      findDueEndNotifications: jest.fn(),
      rescheduleAfterPing: jest.fn(),
      markEndNotified: jest.fn(),
      deferEndNotification: jest.fn(),
      findByDateRange: jest.fn(),
      findOverdue: jest.fn(),
    } as any;

    mockBotService = {
      sendMessage: jest.fn(),
      sendDmInteractive: jest.fn(),
      sendBuzzInteractive: jest.fn(),
      sendDirectMessage: jest.fn(),
    } as any;

    mockUsersService = {
      findActiveWithSettings: jest.fn(),
    } as any;

    mockDateParser = {
      formatVietnam: jest.fn((date: Date) => date.toISOString()),
      formatMinutes: jest.fn((n: number) => `${n} phút`),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderService,
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: BotService, useValue: mockBotService },
        { provide: DateParser, useValue: mockDateParser },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
      ],
    }).compile();

    service = module.get<ReminderService>(ReminderService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('tick', () => {
    it('should process due start reminders', async () => {
      // Arrange
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockSchedulesService.findDueReminders).toHaveBeenCalledWith(expect.any(Date));
      expect(mockBotService.sendBuzzInteractive).toHaveBeenCalledWith(
        'channel123',
        expect.any(Object),
        expect.any(Array),
        expect.stringContaining('@testuser'),
        expect.any(Array),
      );
      expect(mockSchedulesService.rescheduleAfterPing).toHaveBeenCalledWith(
        1,
        15,
        expect.any(Date),
      );
    });

    it('should process due end notifications', async () => {
      // Arrange
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.markEndNotified.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockSchedulesService.findDueEndNotifications).toHaveBeenCalledWith(expect.any(Date));
      expect(mockBotService.sendBuzzInteractive).toHaveBeenCalled();
      expect(mockSchedulesService.markEndNotified).toHaveBeenCalledWith(1, expect.any(Date));
    });

    it('should skip tick if previous tick is still running', async () => {
      // Arrange
      mockSchedulesService.findDueReminders.mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve([]), 100)),
      );
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);

      // Act
      const tick1 = service.tick();
      const tick2 = service.tick(); // Should be skipped

      await tick1;
      await tick2;

      // Assert
      expect(mockSchedulesService.findDueReminders).toHaveBeenCalledTimes(1);
    });

    it('should skip tick when advisory lock query throws (fail closed)', async () => {
      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockRejectedValue(new Error('Connection lost')),
        release: jest.fn().mockResolvedValue(undefined),
      };
      const mockDataSource = {
        isInitialized: true,
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      };

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReminderService,
          { provide: SchedulesService, useValue: mockSchedulesService },
          { provide: BotService, useValue: mockBotService },
          { provide: DateParser, useValue: mockDateParser },
          { provide: UsersService, useValue: mockUsersService },
          { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
          { provide: DataSource, useValue: mockDataSource },
        ],
      }).compile();

      const serviceWithDb = module.get<ReminderService>(ReminderService);
      await serviceWithDb.tick();

      expect(mockSchedulesService.findDueReminders).not.toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should still unlock and release QueryRunner when reminder processing throws', async () => {
      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockImplementation((queryStr: string) => {
          if (queryStr.includes('pg_try_advisory_lock')) {
            return Promise.resolve([{ locked: true }]);
          }
          if (queryStr.includes('pg_advisory_unlock')) {
            return Promise.resolve();
          }
          return Promise.resolve([]);
        }),
        release: jest.fn().mockResolvedValue(undefined),
      };
      const mockDataSource = {
        isInitialized: true,
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      };

      mockSchedulesService.findDueReminders.mockRejectedValue(new Error('Database select failure'));

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReminderService,
          { provide: SchedulesService, useValue: mockSchedulesService },
          { provide: BotService, useValue: mockBotService },
          { provide: DateParser, useValue: mockDateParser },
          { provide: UsersService, useValue: mockUsersService },
          { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
          { provide: DataSource, useValue: mockDataSource },
        ],
      }).compile();

      const serviceWithDb = module.get<ReminderService>(ReminderService);
      await serviceWithDb.tick();

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_unlock($1)',
        [81001],
      );
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should release QueryRunner even if advisory unlock throws', async () => {
      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockImplementation((queryStr: string) => {
          if (queryStr.includes('pg_try_advisory_lock')) {
            return Promise.resolve([{ locked: true }]);
          }
          if (queryStr.includes('pg_advisory_unlock')) {
            return Promise.reject(new Error('Unlock failed'));
          }
          return Promise.resolve([]);
        }),
        release: jest.fn().mockResolvedValue(undefined),
      };
      const mockDataSource = {
        isInitialized: true,
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      };

      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReminderService,
          { provide: SchedulesService, useValue: mockSchedulesService },
          { provide: BotService, useValue: mockBotService },
          { provide: DateParser, useValue: mockDateParser },
          { provide: UsersService, useValue: mockUsersService },
          { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
          { provide: DataSource, useValue: mockDataSource },
        ],
      }).compile();

      const serviceWithDb = module.get<ReminderService>(ReminderService);
      await serviceWithDb.tick();

      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should release advisory lock after tick completes', async () => {
      const mockQueryRunner = {
        connect: jest.fn().mockResolvedValue(undefined),
        query: jest.fn().mockImplementation((queryStr: string) => {
          if (queryStr.includes('pg_try_advisory_lock')) {
            return Promise.resolve([{ locked: true }]);
          }
          if (queryStr.includes('pg_advisory_unlock')) {
            return Promise.resolve();
          }
          return Promise.resolve([]);
        }),
        release: jest.fn().mockResolvedValue(undefined),
      };
      const mockDataSource = {
        isInitialized: true,
        createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
      };

      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);

      const module: TestingModule = await Test.createTestingModule({
        providers: [
          ReminderService,
          { provide: SchedulesService, useValue: mockSchedulesService },
          { provide: BotService, useValue: mockBotService },
          { provide: DateParser, useValue: mockDateParser },
          { provide: UsersService, useValue: mockUsersService },
          { provide: ConfigService, useValue: { get: jest.fn(() => undefined) } },
          { provide: DataSource, useValue: mockDataSource },
        ],
      }).compile();

      const serviceWithDb = module.get<ReminderService>(ReminderService);
      await serviceWithDb.tick();

      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'SELECT pg_try_advisory_lock($1) as locked',
        [81001],
      );
      expect(mockQueryRunner.query).toHaveBeenCalledWith(
        'SELECT pg_advisory_unlock($1)',
        [81001],
      );
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should handle errors in start reminder gracefully', async () => {
      // Arrange
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockBotService.sendBuzzInteractive.mockRejectedValue(new Error('Send failed'));

      // Act & Assert
      await expect(service.tick()).resolves.not.toThrow();
      expect(mockSchedulesService.findDueReminders).toHaveBeenCalled();
    });

    it('should handle errors in end notification gracefully', async () => {
      // Arrange
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([scheduleWithSettings]);
      mockBotService.sendBuzzInteractive.mockRejectedValue(new Error('Send failed'));

      // Act & Assert
      await expect(service.tick()).resolves.not.toThrow();
      expect(mockSchedulesService.findDueEndNotifications).toHaveBeenCalled();
    });

    it('should process multiple reminders in one tick', async () => {
      // Arrange
      const schedule1 = { ...mockSchedule, id: 1, user: { ...mockUser, settings: mockSettings } };
      const schedule2 = { ...mockSchedule, id: 2, user: { ...mockUser, settings: mockSettings } };
      mockSchedulesService.findDueReminders.mockResolvedValue([schedule1, schedule2]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockBotService.sendBuzzInteractive).toHaveBeenCalledTimes(2);
      expect(mockSchedulesService.rescheduleAfterPing).toHaveBeenCalledTimes(2);
    });

    it('should reset running flag after tick completes', async () => {
      // Arrange
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);

      // Act
      await service.tick();
      await service.tick(); // Should not be skipped

      // Assert
      expect(mockSchedulesService.findDueReminders).toHaveBeenCalledTimes(2);
    });

    it('should reset running flag even if tick handles an infrastructure error', async () => {
      // Arrange
      mockSchedulesService.findDueReminders.mockRejectedValue(new Error('Database error'));

      // Act
      await expect(service.tick()).resolves.not.toThrow();

      // Second tick should not be skipped
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      await service.tick();

      // Assert
      expect(mockSchedulesService.findDueReminders).toHaveBeenCalledTimes(2);
    });

    it('should back off after transient database infrastructure errors', async () => {
      const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(1_000);
      const err = Object.assign(new Error('getaddrinfo ENOTFOUND db.example.test'), {
        code: 'ENOTFOUND',
      });
      mockSchedulesService.findDueReminders.mockRejectedValue(err);

      await service.tick();

      mockSchedulesService.findDueReminders.mockClear();
      await service.tick();

      expect(mockSchedulesService.findDueReminders).not.toHaveBeenCalled();
      nowSpy.mockRestore();
    });
  });

  describe('dispatch', () => {
    it('should send via DM when notify_via_dm is true', async () => {
      // Arrange
      // Mode "DM only" = notify_via_dm=true + notify_via_channel=false
      const dmSettings = { ...mockSettings, notify_via_dm: true, notify_via_channel: false };
      const scheduleWithDm = { ...mockSchedule, user: { ...mockUser, settings: dmSettings } };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithDm]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendDmInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockBotService.sendDmInteractive).toHaveBeenCalledWith(
        'user123',
        expect.any(Object),
        expect.any(Array),
        undefined,
        true,
      );
      expect(mockBotService.sendBuzzInteractive).not.toHaveBeenCalled();
    });

    it('should send via channel when notify_via_dm is false and channel is set', async () => {
      // Arrange
      const scheduleWithChannel = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithChannel]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockBotService.sendBuzzInteractive).toHaveBeenCalledWith(
        'channel123',
        expect.any(Object),
        expect.any(Array),
        expect.stringContaining('@testuser'),
        expect.any(Array),
      );
      expect(mockBotService.sendDmInteractive).not.toHaveBeenCalled();
    });

    it('should prefer the schedule channel over the default settings channel', async () => {
      const scheduleWithOwnChannel = {
        ...mockSchedule,
        channel_id: 'schedule-channel',
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithOwnChannel]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      await service.tick();

      expect(mockBotService.sendBuzzInteractive).toHaveBeenCalledTimes(1);
      expect(mockBotService.sendBuzzInteractive).toHaveBeenCalledWith(
        'schedule-channel',
        expect.any(Object),
        expect.any(Array),
        expect.stringContaining('@testuser'),
        expect.any(Array),
      );
    });

    it('should use the schedule channel when settings have no default channel', async () => {
      const noChannelSettings = { ...mockSettings, default_channel_id: null };
      const scheduleWithOwnChannel = {
        ...mockSchedule,
        channel_id: 'schedule-channel',
        user: { ...mockUser, settings: noChannelSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithOwnChannel]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      await service.tick();

      expect(mockBotService.sendBuzzInteractive).toHaveBeenCalledWith(
        'schedule-channel',
        expect.any(Object),
        expect.any(Array),
        expect.stringContaining('@testuser'),
        expect.any(Array),
      );
      expect(mockBotService.sendDmInteractive).not.toHaveBeenCalled();
    });

    it('should send interactive reminders to multiple configured channels', async () => {
      // Arrange
      const multiChannelSettings = {
        ...mockSettings,
        default_channel_id: 'channel123, channel456 channel789',
      };
      const scheduleWithChannel = {
        ...mockSchedule,
        user: { ...mockUser, settings: multiChannelSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithChannel]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockBotService.sendBuzzInteractive).toHaveBeenCalledTimes(3);
      expect(mockBotService.sendBuzzInteractive).toHaveBeenNthCalledWith(
        1,
        'channel123',
        expect.any(Object),
        expect.any(Array),
        expect.any(String),
        expect.any(Array),
      );
      expect(mockBotService.sendBuzzInteractive).toHaveBeenNthCalledWith(
        2,
        'channel456',
        expect.any(Object),
        expect.any(Array),
        expect.any(String),
        expect.any(Array),
      );
      expect(mockBotService.sendBuzzInteractive).toHaveBeenNthCalledWith(
        3,
        'channel789',
        expect.any(Object),
        expect.any(Array),
        expect.any(String),
        expect.any(Array),
      );
    });

    it('should send channel buttons and plain DM text in both mode', async () => {
      // Arrange
      const bothSettings = {
        ...mockSettings,
        notify_via_dm: true,
        notify_via_channel: true,
      };
      const scheduleWithBoth = { ...mockSchedule, user: { ...mockUser, settings: bothSettings } };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithBoth]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);
      mockBotService.sendDirectMessage.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockBotService.sendBuzzInteractive).toHaveBeenCalledWith(
        'channel123',
        expect.any(Object),
        expect.any(Array),
        expect.stringContaining('@testuser'),
        expect.any(Array),
      );
      expect(mockBotService.sendDirectMessage).toHaveBeenCalledWith(
        'user123',
        expect.stringContaining('Vui lòng bấm xác nhận/hoãn ở message trong channel.'),
      );
      expect(mockBotService.sendDmInteractive).not.toHaveBeenCalled();
    });

    it('should not fallback to DM when user disabled DM and channel is not set, backing off with normal snooze', async () => {
      // Arrange
      const noChannelSettings = { ...mockSettings, default_channel_id: null, default_remind_minutes: 15 };
      const scheduleNoChannel = {
        ...mockSchedule,
        user: { ...mockUser, settings: noChannelSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleNoChannel]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();

      // Act
      await service.tick();

      // Assert
      expect(mockBotService.sendDmInteractive).not.toHaveBeenCalled();
      expect(mockBotService.sendBuzzInteractive).not.toHaveBeenCalled();
      expect(mockSchedulesService.rescheduleAfterPing).toHaveBeenCalledWith(
        1,
        15,
        expect.any(Date),
      );
    });

    it('should retry quickly on transient delivery failures for start reminders', async () => {
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockRejectedValue(new Error('Network transient error'));

      await service.tick();

      expect(mockSchedulesService.rescheduleAfterPing).toHaveBeenCalledWith(
        1,
        2,
        expect.any(Date),
      );
    });

    it('should handle end notification delivery outcomes (delivered, transient failure, no-route)', async () => {
      const deliveredSchedule = {
        ...mockSchedule,
        id: 10,
        user: { ...mockUser, settings: mockSettings },
      };
      const transientFailSchedule = {
        ...mockSchedule,
        id: 20,
        user: { ...mockUser, settings: mockSettings },
      };
      const noRouteSchedule = {
        ...mockSchedule,
        id: 30,
        user: { ...mockUser, settings: { ...mockSettings, default_channel_id: null } },
      };

      // 1. Delivered
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([deliveredSchedule]);
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);
      await service.tick();
      expect(mockSchedulesService.markEndNotified).toHaveBeenCalledWith(10, expect.any(Date));

      // 2. Transient failure
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([transientFailSchedule]);
      mockBotService.sendBuzzInteractive.mockRejectedValue(new Error('Network error'));
      await service.tick();
      expect(mockSchedulesService.deferEndNotification).toHaveBeenCalledWith(20, 2, expect.any(Date));

      // 3. No route
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([noRouteSchedule]);
      await service.tick();
      expect(mockSchedulesService.deferEndNotification).toHaveBeenCalledWith(30, 15, expect.any(Date));
    });

    it('should fallback to DM when settings are undefined', async () => {
      // Arrange
      const scheduleNoSettings = { ...mockSchedule, user: mockUser };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleNoSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendDmInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockBotService.sendDmInteractive).toHaveBeenCalledWith(
        'user123',
        expect.any(Object),
        expect.any(Array),
        undefined,
        true,
      );
    });
  });

  describe('daily digest', () => {
    it('should send today and overdue digest to configured channel', async () => {
      const now = new Date('2026-04-23T01:00:00Z');
      const todaySchedule = {
        ...mockSchedule,
        id: 2,
        title: 'Today Task',
        start_time: new Date('2026-04-23T10:00:00Z'),
      };
      const overdueSchedule = {
        ...mockSchedule,
        id: 3,
        title: 'Overdue Task',
        start_time: new Date('2026-04-22T10:00:00Z'),
      };

      mockUsersService.findActiveWithSettings.mockResolvedValue([
        { ...mockUser, settings: mockSettings } as any,
      ]);
      mockSchedulesService.findByDateRange.mockResolvedValue([todaySchedule]);
      mockSchedulesService.findOverdue.mockResolvedValue({
        items: [overdueSchedule],
        total: 1,
      });
      mockBotService.sendMessage.mockResolvedValue(undefined);

      await service.sendDailyDigest(now);

      expect(mockSchedulesService.findByDateRange).toHaveBeenCalledWith(
        'user123',
        expect.any(Date),
        expect.any(Date),
      );
      expect(mockSchedulesService.findOverdue).toHaveBeenCalledWith('user123', now, 5, 0);
      expect(mockBotService.sendMessage).toHaveBeenCalledTimes(1);
      const [channelId, text] = mockBotService.sendMessage.mock.calls[0];
      expect(channelId).toBe('channel123');
      expect(text).toContain('Today Task');
      expect(text).toContain('Overdue Task');
    });

    it('should skip digest when user has no upcoming or overdue schedules', async () => {
      const now = new Date('2026-04-23T01:00:00Z');
      mockUsersService.findActiveWithSettings.mockResolvedValue([
        { ...mockUser, settings: mockSettings } as any,
      ]);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockSchedulesService.findOverdue.mockResolvedValue({ items: [], total: 0 });

      await service.sendDailyDigest(now);

      expect(mockBotService.sendMessage).not.toHaveBeenCalled();
      expect(mockBotService.sendDirectMessage).not.toHaveBeenCalled();
    });
  });

  describe('start reminder embed', () => {
    it('should include schedule details in embed', async () => {
      // Arrange
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      const embedCall = mockBotService.sendBuzzInteractive.mock.calls[0][1];
      expect(embedCall).toBeDefined();
      expect(mockDateParser.formatVietnam).toHaveBeenCalledWith(mockSchedule.start_time);
    });

    it('should include end_time if present', async () => {
      // Arrange
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockDateParser.formatVietnam).toHaveBeenCalledWith(mockSchedule.end_time);
    });

    it('should handle schedule without end_time', async () => {
      // Arrange
      const scheduleNoEnd = {
        ...mockSchedule,
        end_time: null,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleNoEnd]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.tick()).resolves.not.toThrow();
    });

    it('should handle schedule without description', async () => {
      // Arrange
      const scheduleNoDesc = {
        ...mockSchedule,
        description: null,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleNoDesc]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.tick()).resolves.not.toThrow();
    });
  });

  describe('start reminder buttons', () => {
    it('should include acknowledge and snooze buttons', async () => {
      // Arrange
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      const buttonsCall = mockBotService.sendBuzzInteractive.mock.calls[0][2];
      expect(buttonsCall).toBeDefined();
      expect(Array.isArray(buttonsCall)).toBe(true);
    });

    it('should retry fast (2 min) when dispatch returns false (e.g. all routes reject)', async () => {
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockRejectedValue(new Error('Network offline'));

      await service.tick();

      expect(mockSchedulesService.rescheduleAfterPing).toHaveBeenCalledWith(
        1,
        2, // Fast retry interval
        expect.any(Date),
      );
    });

    it('should not mark end notified when dispatch fails', async () => {
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([scheduleWithSettings]);
      mockBotService.sendBuzzInteractive.mockRejectedValue(new Error('Network offline'));

      await service.tick();

      expect(mockSchedulesService.markEndNotified).not.toHaveBeenCalled();
    });

    it('should use custom snooze minutes from settings', async () => {
      // Arrange
      const customSettings = { ...mockSettings, default_remind_minutes: 45 };
      const scheduleCustom = { ...mockSchedule, user: { ...mockUser, settings: customSettings } };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleCustom]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockSchedulesService.rescheduleAfterPing).toHaveBeenCalledWith(
        1,
        45,
        expect.any(Date),
      );
    });

    it('should use default snooze minutes when settings not available', async () => {
      // Arrange
      const scheduleNoSettings = { ...mockSchedule, user: mockUser };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleNoSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendDmInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockSchedulesService.rescheduleAfterPing).toHaveBeenCalledWith(
        1,
        30,
        expect.any(Date),
      );
    });
  });

  describe('end notification embed', () => {
    it('should include schedule details in end notification', async () => {
      // Arrange
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.markEndNotified.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      const embedCall = mockBotService.sendBuzzInteractive.mock.calls[0][1];
      expect(embedCall).toBeDefined();
      expect(mockDateParser.formatVietnam).toHaveBeenCalledWith(mockSchedule.end_time);
    });

    it('should handle schedule without end_time in end notification', async () => {
      // Arrange
      const scheduleNoEnd = {
        ...mockSchedule,
        end_time: null,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([scheduleNoEnd]);
      mockSchedulesService.markEndNotified.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act & Assert
      await expect(service.tick()).resolves.not.toThrow();
    });
  });

  describe('end notification buttons', () => {
    it('should include done and later buttons', async () => {
      // Arrange
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.markEndNotified.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      const buttonsCall = mockBotService.sendBuzzInteractive.mock.calls[0][2];
      expect(buttonsCall).toBeDefined();
      expect(Array.isArray(buttonsCall)).toBe(true);
    });
  });

  describe('rescheduleAfterPing', () => {
    it('should reschedule reminder after sending', async () => {
      // Arrange
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockSchedulesService.rescheduleAfterPing).toHaveBeenCalledWith(
        1,
        15,
        expect.any(Date),
      );
    });
  });

  describe('markEndNotified', () => {
    it('should mark schedule as end notified after sending', async () => {
      // Arrange
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.markEndNotified.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      // Act
      await service.tick();

      // Assert
      expect(mockSchedulesService.markEndNotified).toHaveBeenCalledWith(1, expect.any(Date));
    });
  });

  describe('mention payload', () => {
    it('should pass @username + mention array to channel send', async () => {
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      await service.tick();

      const call = mockBotService.sendBuzzInteractive.mock.calls[0];
      expect(call[3]).toBe('@testuser ');
      const mentions = call[4] as Array<{
        user_id: string;
        username: string;
        s: number;
        e: number;
      }>;
      expect(mentions).toHaveLength(1);
      expect(mentions[0]).toMatchObject({
        user_id: 'user123',
        username: 'testuser',
        s: 0,
        e: 9, // length of '@testuser'
      });
    });

    it('should pass undefined mention when user has no username', async () => {
      const userNoName = { ...mockUser, username: null };
      const scheduleNoName = { ...mockSchedule, user: { ...userNoName, settings: mockSettings } };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleNoName]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      await service.tick();

      const call = mockBotService.sendBuzzInteractive.mock.calls[0];
      expect(call[3]).toBeUndefined();
      expect(call[4]).toBeUndefined();
    });
  });

  describe('custom snooze button on start reminder', () => {
    it('should include reminder:custom button on start reminder', async () => {
      const scheduleWithSettings = {
        ...mockSchedule,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockSchedulesService.rescheduleAfterPing.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockResolvedValue(undefined);

      await service.tick();

      const call = mockBotService.sendBuzzInteractive.mock.calls[0];
      const components = call[2] as Array<{ id?: string }>;
      const ids = components.map((c) => c.id);
      expect(ids).toEqual(expect.arrayContaining(['reminder:custom:1']));
    });
  });

  describe('calculateEndNotificationRetryMinutes', () => {
    it('progressively backs off transient failures (2m -> 5m -> 15m -> 30m -> 60m)', () => {
      expect(service.calculateEndNotificationRetryMinutes('transient-failure', 0)).toBe(2);
      expect(service.calculateEndNotificationRetryMinutes('transient-failure', 1)).toBe(5);
      expect(service.calculateEndNotificationRetryMinutes('transient-failure', 2)).toBe(15);
      expect(service.calculateEndNotificationRetryMinutes('transient-failure', 3)).toBe(30);
      expect(service.calculateEndNotificationRetryMinutes('transient-failure', 4)).toBe(60);
      expect(service.calculateEndNotificationRetryMinutes('transient-failure', 10)).toBe(60);
    });

    it('progressively backs off no-route failures (15m -> 30m -> 60m -> 120m -> 360m)', () => {
      expect(service.calculateEndNotificationRetryMinutes('no-route', 0, 15)).toBe(15);
      expect(service.calculateEndNotificationRetryMinutes('no-route', 1, 15)).toBe(30);
      expect(service.calculateEndNotificationRetryMinutes('no-route', 2, 15)).toBe(60);
      expect(service.calculateEndNotificationRetryMinutes('no-route', 3, 15)).toBe(120);
      expect(service.calculateEndNotificationRetryMinutes('no-route', 4, 15)).toBe(360);
      expect(service.calculateEndNotificationRetryMinutes('no-route', 10, 15)).toBe(360);
    });

    it('respects user baseSnoozeMinutes if larger than 15 for first no-route attempt', () => {
      expect(service.calculateEndNotificationRetryMinutes('no-route', 0, 45)).toBe(45);
    });
  });

  describe('end notification retry dispatch progression', () => {
    it('defers with transient failure progression using current end_notification_attempts', async () => {
      const scheduleTransient = {
        ...mockSchedule,
        end_notification_attempts: 2,
        user: { ...mockUser, settings: mockSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([scheduleTransient]);
      mockSchedulesService.deferEndNotification.mockResolvedValue();
      mockBotService.sendBuzzInteractive.mockRejectedValue(new Error('Network temporary drop'));

      await service.tick();

      // attempt count 2 -> index 2 -> 15 minutes
      expect(mockSchedulesService.deferEndNotification).toHaveBeenCalledWith(
        1,
        15,
        expect.any(Date),
      );
      expect(mockSchedulesService.markEndNotified).not.toHaveBeenCalled();
    });

    it('defers with no-route progression using current end_notification_attempts', async () => {
      const noRouteSettings = {
        ...mockSettings,
        notify_via_dm: false,
        notify_via_channel: false,
      };
      const scheduleNoRoute = {
        ...mockSchedule,
        channel_id: null,
        end_notification_attempts: 1,
        user: { ...mockUser, settings: noRouteSettings },
      };
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([scheduleNoRoute]);
      mockSchedulesService.deferEndNotification.mockResolvedValue();

      await service.tick();

      // attempt count 1 -> index 1 -> 30 minutes
      expect(mockSchedulesService.deferEndNotification).toHaveBeenCalledWith(
        1,
        30,
        expect.any(Date),
      );
      expect(mockSchedulesService.markEndNotified).not.toHaveBeenCalled();
    });
  });

  describe('REMINDER_INTERACTION_ID constant', () => {
    it('should export correct interaction ID', () => {
      expect(REMINDER_INTERACTION_ID).toBe('reminder');
    });
  });
});
