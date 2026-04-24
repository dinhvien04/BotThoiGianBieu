import { Test, TestingModule } from '@nestjs/testing';
import { ReminderInteractionHandler } from '../../src/reminder/reminder-interaction.handler';
import { InteractionRegistry } from '../../src/bot/interactions/interaction-registry';
import { SchedulesService } from '../../src/schedules/schedules.service';
import { UsersService } from '../../src/users/users.service';
import { DateParser } from '../../src/shared/utils/date-parser';
import { ButtonInteractionContext } from '../../src/bot/interactions/interaction.types';
import { Schedule } from '../../src/schedules/entities/schedule.entity';
import { User } from '../../src/users/entities/user.entity';
import { UserSettings } from '../../src/users/entities/user-settings.entity';

describe('ReminderInteractionHandler', () => {
  let handler: ReminderInteractionHandler;
  let mockRegistry: jest.Mocked<InteractionRegistry>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockUsersService: jest.Mocked<UsersService>;
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
    } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockDateParser = {
      formatVietnam: jest.fn((date) => date.toISOString()),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReminderInteractionHandler,
        { provide: InteractionRegistry, useValue: mockRegistry },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: UsersService, useValue: mockUsersService },
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
        mockSchedulesService.acknowledge.mockResolvedValue();

        // Act
        await handler.handleButton(mockContext);

        // Assert
        expect(mockSchedulesService.acknowledge).toHaveBeenCalledWith(1);
        expect(mockContext.deleteForm).toHaveBeenCalled();
        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('Đã ghi nhận'),
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
        expect(mockSchedulesService.markCompleted).toHaveBeenCalledWith(1);
        expect(mockContext.deleteForm).toHaveBeenCalled();
        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('hoàn thành'),
        );
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
      mockSchedulesService.acknowledge.mockResolvedValue();
      (mockContext.deleteForm as jest.Mock).mockRejectedValue(new Error('Delete failed'));

      // Act & Assert - should not throw
      await expect(handler.handleButton(mockContext)).resolves.not.toThrow();
    });
  });
});
