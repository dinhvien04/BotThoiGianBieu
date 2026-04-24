import { Test, TestingModule } from '@nestjs/testing';
import { ReminderService, REMINDER_INTERACTION_ID } from '../../src/reminder/reminder.service';
import { SchedulesService } from '../../src/schedules/schedules.service';
import { BotService } from '../../src/bot/bot.service';
import { DateParser } from '../../src/shared/utils/date-parser';
import { Schedule } from '../../src/schedules/entities/schedule.entity';
import { User } from '../../src/users/entities/user.entity';
import { UserSettings } from '../../src/users/entities/user-settings.entity';

describe('ReminderService', () => {
  let service: ReminderService;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockBotService: jest.Mocked<BotService>;
  let mockDateParser: jest.Mocked<DateParser>;

  const mockUser: User = {
    user_id: 'user123',
    username: 'testuser',
    display_name: 'Test User',
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const mockSettings: UserSettings = {
    user_id: 'user123',
    timezone: 'Asia/Ho_Chi_Minh',
    default_remind_minutes: 15,
    default_channel_id: 'channel123',
    notify_via_dm: false,
    created_at: new Date(),
    updated_at: new Date(),
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
  };

  beforeEach(async () => {
    mockSchedulesService = {
      findDueReminders: jest.fn(),
      findDueEndNotifications: jest.fn(),
      rescheduleAfterPing: jest.fn(),
      markEndNotified: jest.fn(),
    } as any;

    mockBotService = {
      sendDmInteractive: jest.fn(),
      sendBuzzInteractive: jest.fn(),
      sendDirectMessage: jest.fn(),
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
      const scheduleWithSettings = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
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
      );
      expect(mockSchedulesService.rescheduleAfterPing).toHaveBeenCalledWith(
        1,
        15,
        expect.any(Date),
      );
    });

    it('should process due end notifications', async () => {
      // Arrange
      const scheduleWithSettings = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
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

    it('should handle errors in start reminder gracefully', async () => {
      // Arrange
      const scheduleWithSettings = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleWithSettings]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      mockBotService.sendBuzzInteractive.mockRejectedValue(new Error('Send failed'));

      // Act & Assert
      await expect(service.tick()).resolves.not.toThrow();
      expect(mockSchedulesService.findDueReminders).toHaveBeenCalled();
    });

    it('should handle errors in end notification gracefully', async () => {
      // Arrange
      const scheduleWithSettings = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
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

    it('should reset running flag even if tick throws error', async () => {
      // Arrange
      mockSchedulesService.findDueReminders.mockRejectedValue(new Error('Database error'));

      // Act
      await expect(service.tick()).rejects.toThrow('Database error');
      
      // Second tick should not be skipped
      mockSchedulesService.findDueReminders.mockResolvedValue([]);
      mockSchedulesService.findDueEndNotifications.mockResolvedValue([]);
      await service.tick();

      // Assert
      expect(mockSchedulesService.findDueReminders).toHaveBeenCalledTimes(2);
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
      const scheduleWithChannel = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
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
      );
      expect(mockBotService.sendBuzzInteractive).toHaveBeenNthCalledWith(
        2,
        'channel456',
        expect.any(Object),
        expect.any(Array),
      );
      expect(mockBotService.sendBuzzInteractive).toHaveBeenNthCalledWith(
        3,
        'channel789',
        expect.any(Object),
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
      );
      expect(mockBotService.sendDirectMessage).toHaveBeenCalledWith(
        'user123',
        expect.stringContaining('Vui lòng bấm xác nhận/hoãn ở message trong channel.'),
      );
      expect(mockBotService.sendDmInteractive).not.toHaveBeenCalled();
    });

    it('should fallback to DM when channel is not set', async () => {
      // Arrange
      const noChannelSettings = { ...mockSettings, default_channel_id: null };
      const scheduleNoChannel = { ...mockSchedule, user: { ...mockUser, settings: noChannelSettings } };
      mockSchedulesService.findDueReminders.mockResolvedValue([scheduleNoChannel]);
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

  describe('start reminder embed', () => {
    it('should include schedule details in embed', async () => {
      // Arrange
      const scheduleWithSettings = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
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
      const scheduleWithSettings = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
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
      const scheduleWithSettings = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
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
      expect(mockSchedulesService.rescheduleAfterPing).toHaveBeenCalledWith(1, 45, expect.any(Date));
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
      expect(mockSchedulesService.rescheduleAfterPing).toHaveBeenCalledWith(1, 30, expect.any(Date));
    });
  });

  describe('end notification embed', () => {
    it('should include schedule details in end notification', async () => {
      // Arrange
      const scheduleWithSettings = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
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
      const scheduleWithSettings = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
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
      const scheduleWithSettings = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
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
      const scheduleWithSettings = { ...mockSchedule, user: { ...mockUser, settings: mockSettings } };
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

  describe('REMINDER_INTERACTION_ID constant', () => {
    it('should export correct interaction ID', () => {
      expect(REMINDER_INTERACTION_ID).toBe('reminder');
    });
  });
});
