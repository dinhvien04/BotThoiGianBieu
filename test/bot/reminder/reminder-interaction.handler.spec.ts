import { Test, TestingModule } from '@nestjs/testing';
import { ReminderInteractionHandler } from 'src/reminder/reminder-interaction.handler';
import { InteractionRegistry } from 'src/bot/interactions/interaction-registry';
import { BotService } from 'src/bot/bot.service';
import { SchedulesService } from 'src/schedules/schedules.service';
import { UsersService } from 'src/users/users.service';
import { DateParser } from 'src/shared/utils/date-parser';
import { ButtonInteractionContext } from 'src/bot/interactions/interaction.types';
import { Schedule } from 'src/schedules/entities/schedule.entity';
import { User } from 'src/users/entities/user.entity';
import { UserSettings } from 'src/users/entities/user-settings.entity';

describe('ReminderInteractionHandler', () => {
  let handler: ReminderInteractionHandler;
  let mockRegistry: jest.Mocked<InteractionRegistry>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockBotService: jest.Mocked<BotService>;
  let mockDateParser: jest.Mocked<DateParser>;

  const mockSchedule: Schedule = {
    id: 1,
    user_id: 'user123',
    title: 'Test Task',
    start_time: new Date(),
    status: 'pending',
  } as any;

  const mockUser: User = {
    user_id: 'user123',
    settings: {
      default_remind_minutes: 30,
    } as UserSettings,
  } as any;

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockSchedulesService = {
      findById: jest.fn(),
      acknowledge: jest.fn(),
      snooze: jest.fn(),
      markCompleted: jest.fn(),
      spawnNextIfRecurring: jest.fn().mockResolvedValue(null),
    } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockBotService = {
      sendEphemeralInteractive: jest.fn().mockResolvedValue(undefined),
    } as any;
    mockDateParser = {
      formatVietnam: jest.fn((date) => date.toISOString()),
      formatMinutes: jest.fn((minutes: number) => `${minutes} phút`),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderInteractionHandler,
        { provide: InteractionRegistry, useValue: mockRegistry },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: BotService, useValue: mockBotService },
        { provide: DateParser, useValue: mockDateParser },
      ],
    }).compile();

    handler = module.get<ReminderInteractionHandler>(ReminderInteractionHandler);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct interactionId', () => {
      expect(handler.interactionId).toBe('reminder');
    });
  });

  describe('onModuleInit', () => {
    it('should register itself', () => {
      handler.onModuleInit();
      expect(mockRegistry.register).toHaveBeenCalledWith(handler);
    });
  });

  describe('handleButton', () => {
    let mockContext: ButtonInteractionContext;

    beforeEach(() => {
      mockContext = {
        event: {
          message_id: 'msg123',
          channel_id: 'channel123',
          button_id: 'reminder:ack:1',
          sender_id: 'bot123',
          user_id: 'user123',
          extra_data: '{}',
        },
        action: 'ack:1',
        clickerId: 'user123',
        channelId: 'channel123',
        formData: {},
        send: jest.fn(),
        reply: jest.fn(),
        deleteForm: jest.fn(),
        ephemeralSend: jest.fn(),
        deleteEphemeralForm: jest.fn(),
      };
    });

    it('should handle invalid button_id format', async () => {
      // Arrange
      mockContext.action = 'invalid';

      // Act
      await handler.handleButton(mockContext);

      // Assert - should not crash
      expect(mockSchedulesService.findById).not.toHaveBeenCalled();
    });

    it('should handle non-numeric schedule ID', async () => {
      // Arrange
      mockContext.action = 'ack:abc';

      // Act
      await handler.handleButton(mockContext);

      // Assert
      expect(mockSchedulesService.findById).not.toHaveBeenCalled();
    });

    it('should show error when schedule not found', async () => {
      // Arrange
      mockSchedulesService.findById.mockResolvedValue(null);

      // Act
      await handler.handleButton(mockContext);

      // Assert
      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Không tìm thấy'),
      );
      expect(mockContext.deleteForm).toHaveBeenCalled();
    });

    it('should reject when user is not schedule owner', async () => {
      // Arrange
      const otherUserSchedule = { ...mockSchedule, user_id: 'other_user' };
      mockSchedulesService.findById.mockResolvedValue(otherUserSchedule as any);

      // Act
      await handler.handleButton(mockContext);

      // Assert
      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('không có quyền'),
      );
    });

    describe('ack action', () => {
      it('should acknowledge reminder', async () => {
        // Arrange
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockSchedulesService.acknowledge.mockResolvedValue(true);

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockSchedulesService.acknowledge).toHaveBeenCalledWith(1);
        expect(mockContext.deleteForm).toHaveBeenCalled();
        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('Đã ghi nhận'),
        );
      });

      it('should reject stale acknowledge when schedule was already handled elsewhere', async () => {
        // Arrange
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockSchedulesService.acknowledge.mockResolvedValue(false);

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockContext.deleteForm).toHaveBeenCalled();
        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('đã được xử lý'),
        );
      });
    });

    describe('snooze action', () => {
      beforeEach(() => {
        mockContext.action = 'snooze:1';
      });

      it('should snooze reminder with user settings', async () => {
        // Arrange
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockUsersService.findByUserId.mockResolvedValue(mockUser);
        const nextAt = new Date();
        mockSchedulesService.snooze.mockResolvedValue(nextAt);

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockSchedulesService.snooze).toHaveBeenCalledWith(1, 30);
        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('Đã hoãn'),
        );
      });

      it('should reject stale snooze when schedule was acknowledged in another channel', async () => {
        // Arrange
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockUsersService.findByUserId.mockResolvedValue(mockUser);
        mockSchedulesService.snooze.mockResolvedValue(null);

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockContext.deleteForm).toHaveBeenCalled();
        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('không hoãn nữa'),
        );
      });

      it('should use default minutes when user settings not found', async () => {
        // Arrange
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockUsersService.findByUserId.mockResolvedValue(null);
        mockSchedulesService.snooze.mockResolvedValue(new Date());

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockSchedulesService.snooze).toHaveBeenCalledWith(1, 30);
      });

      it('should honor explicit minutes from button_id suffix', async () => {
        // Arrange
        mockContext.action = 'snooze:1:60';
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockSchedulesService.snooze.mockResolvedValue(new Date());

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockSchedulesService.snooze).toHaveBeenCalledWith(1, 60);
        // Should NOT need to hit users service when minutes are explicit
        expect(mockUsersService.findByUserId).not.toHaveBeenCalled();
      });

      it('should ignore invalid minutes suffix and fall back to user settings', async () => {
        // Arrange
        mockContext.action = 'snooze:1:abc';
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockUsersService.findByUserId.mockResolvedValue(mockUser);
        mockSchedulesService.snooze.mockResolvedValue(new Date());

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockSchedulesService.snooze).toHaveBeenCalledWith(1, 30);
      });

      it('should ignore zero minutes suffix and fall back to user settings', async () => {
        // Arrange
        mockContext.action = 'snooze:1:0';
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockUsersService.findByUserId.mockResolvedValue(mockUser);
        mockSchedulesService.snooze.mockResolvedValue(new Date());

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockSchedulesService.snooze).toHaveBeenCalledWith(1, 30);
      });
    });

    describe('done action', () => {
      beforeEach(() => {
        mockContext.action = 'done:1';
      });

      it('should mark schedule as completed', async () => {
        // Arrange
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockSchedulesService.markCompleted.mockResolvedValue();

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockSchedulesService.markCompleted).toHaveBeenCalledWith(1, expect.any(Date));
        expect(mockContext.deleteForm).toHaveBeenCalled();
        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('hoàn thành'),
        );
        expect(mockSchedulesService.spawnNextIfRecurring).not.toHaveBeenCalled();
      });

      it('should spawn next instance for recurring schedules and mention it', async () => {
        // Arrange
        const recurring = {
          ...mockSchedule,
          recurrence_type: 'daily',
          recurrence_interval: 1,
        };
        const next = {
          id: 99,
          start_time: new Date('2026-04-25T10:00:00Z'),
        };
        mockSchedulesService.findById.mockResolvedValue(recurring as any);
        mockSchedulesService.markCompleted.mockResolvedValue();
        mockSchedulesService.spawnNextIfRecurring.mockResolvedValue(next as any);

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockSchedulesService.spawnNextIfRecurring).toHaveBeenCalledWith(
          recurring,
          expect.any(Date),
        );
        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('lịch lặp kế tiếp #99'),
        );
      });

      it('should not call spawnNextIfRecurring for non-recurring schedules', async () => {
        mockSchedulesService.findById.mockResolvedValue({
          ...mockSchedule,
          recurrence_type: 'none',
        } as any);
        mockSchedulesService.markCompleted.mockResolvedValue();

        await handler.handleButton(mockContext);

        expect(mockSchedulesService.spawnNextIfRecurring).not.toHaveBeenCalled();
      });
    });

    describe('later action', () => {
      beforeEach(() => {
        mockContext.action = 'later:1';
      });

      it('should close notification without marking completed', async () => {
        // Arrange
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockSchedulesService.markCompleted).not.toHaveBeenCalled();
        expect(mockContext.deleteForm).toHaveBeenCalled();
        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('Đã đóng'),
        );
      });
    });

    it('should handle unknown action gracefully', async () => {
      // Arrange
      mockContext.action = 'unknown:1';
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);

      // Act
      await handler.handleButton(mockContext);

      // Assert - should not crash
      expect(mockContext.send).not.toHaveBeenCalled();
    });

    it('should handle deleteForm errors gracefully', async () => {
      // Arrange
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.acknowledge.mockResolvedValue(true);
      (mockContext.deleteForm as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      // Act & Assert - should not throw
      await expect(handler.handleButton(mockContext)).resolves.not.toThrow();
    });

    describe('custom snooze flow', () => {
      it('should open ephemeral form on custom action', async () => {
        mockContext.action = 'custom:1';
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockUsersService.findByUserId.mockResolvedValue(mockUser);

        await handler.handleButton(mockContext);

        expect(mockBotService.sendEphemeralInteractive).toHaveBeenCalledWith(
          'channel123',
          'user123',
          expect.any(Object),
          expect.any(Array),
        );
      });

      it('should fall back with hint when ephemeral form fails to open', async () => {
        mockContext.action = 'custom:1';
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockUsersService.findByUserId.mockResolvedValue(mockUser);
        (mockBotService.sendEphemeralInteractive as jest.Mock).mockRejectedValue(
          new Error('boom'),
        );

        await handler.handleButton(mockContext);

        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('*nhac-sau 1'),
        );
      });

      it('should snooze using formData.minutes on csub', async () => {
        mockContext.action = 'csub:1';
        mockContext.formData = { minutes: '45' };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockSchedulesService.snooze.mockResolvedValue(new Date('2099-01-01'));

        await handler.handleButton(mockContext);

        expect(mockSchedulesService.snooze).toHaveBeenCalledWith(1, 45);
        expect(mockContext.deleteEphemeralForm).toHaveBeenCalled();
        expect(mockContext.ephemeralSend).toHaveBeenCalledWith(
          expect.stringContaining('Đã hoãn'),
        );
      });

      it('should reject non-numeric minutes', async () => {
        mockContext.action = 'csub:1';
        mockContext.formData = { minutes: 'abc' };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);

        await handler.handleButton(mockContext);

        expect(mockSchedulesService.snooze).not.toHaveBeenCalled();
        expect(mockContext.ephemeralSend).toHaveBeenCalledWith(
          expect.stringContaining('không phải số phút hợp lệ'),
        );
      });

      it('should reject empty minutes', async () => {
        mockContext.action = 'csub:1';
        mockContext.formData = { minutes: '' };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);

        await handler.handleButton(mockContext);

        expect(mockSchedulesService.snooze).not.toHaveBeenCalled();
        expect(mockContext.ephemeralSend).toHaveBeenCalledWith(
          expect.stringContaining('(rỗng)'),
        );
      });

      it('should reject zero minutes', async () => {
        mockContext.action = 'csub:1';
        mockContext.formData = { minutes: '0' };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);

        await handler.handleButton(mockContext);

        expect(mockSchedulesService.snooze).not.toHaveBeenCalled();
        expect(mockContext.ephemeralSend).toHaveBeenCalled();
      });

      it('should reject minutes above 7 days cap', async () => {
        mockContext.action = 'csub:1';
        mockContext.formData = { minutes: '20000' };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);

        await handler.handleButton(mockContext);

        expect(mockSchedulesService.snooze).not.toHaveBeenCalled();
        expect(mockContext.ephemeralSend).toHaveBeenCalledWith(
          expect.stringContaining('Tối đa hoãn 7 ngày'),
        );
      });

      it('should send ephemeral info when schedule is already acknowledged on csub', async () => {
        mockContext.action = 'csub:1';
        mockContext.formData = { minutes: '20' };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockSchedulesService.snooze.mockResolvedValue(null);

        await handler.handleButton(mockContext);

        expect(mockContext.deleteEphemeralForm).toHaveBeenCalled();
        expect(mockContext.ephemeralSend).toHaveBeenCalledWith(
          expect.stringContaining('không hoãn nữa'),
        );
      });

      it('should just close form on ccancel', async () => {
        mockContext.action = 'ccancel:1';
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);

        await handler.handleButton(mockContext);

        expect(mockContext.deleteEphemeralForm).toHaveBeenCalled();
        expect(mockSchedulesService.snooze).not.toHaveBeenCalled();
      });
    });
  });
});
