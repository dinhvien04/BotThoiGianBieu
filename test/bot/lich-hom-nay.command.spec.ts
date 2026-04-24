import { Test, TestingModule } from '@nestjs/testing';
import { LichHomNayCommand } from '../../src/bot/commands/lich-hom-nay.command';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { UsersService } from '../../src/users/users.service';
import { ScheduleService } from '../../src/schedules/schedule.service';
import { MessageFormatter } from '../../src/shared/utils/message-formatter';
import { CommandContext } from '../../src/bot/commands/command.types';
import { User } from '../../src/users/entities/user.entity';
import { Schedule } from '../../src/schedules/entities/schedule.entity';

describe('LichHomNayCommand', () => {
  let command: LichHomNayCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<ScheduleService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = {
    user_id: 'user123',
    username: 'testuser',
    display_name: 'Test User',
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const mockSchedule: Schedule = {
    id: 1,
    user_id: 'user123',
    item_type: 'task',
    title: 'Test Task',
    description: 'Test Description',
    start_time: new Date('2026-04-24T10:00:00Z'),
    end_time: new Date('2026-04-24T11:00:00Z'),
    status: 'pending',
    remind_at: null,
    is_reminded: false,
    acknowledged_at: null,
    end_notified_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  beforeEach(async () => {
    mockRegistry = {
      register: jest.fn(),
    } as any;

    mockUsersService = {
      findByUserId: jest.fn(),
    } as any;

    mockSchedulesService = {
      findByDateRange: jest.fn(),
    } as any;

    mockFormatter = {
      formatNotInitialized: jest.fn(),
      formatScheduleList: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LichHomNayCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ScheduleService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<LichHomNayCommand>(LichHomNayCommand);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('lich-hom-nay');
      expect(command.description).toBe('Xem lịch hôm nay');
      expect(command.category).toBe('📅 Xem lịch');
      expect(command.syntax).toBe('lich-hom-nay');
    });
  });

  describe('onModuleInit', () => {
    it('should register itself with the registry', () => {
      command.onModuleInit();
      expect(mockRegistry.register).toHaveBeenCalledWith(command);
    });
  });

  describe('execute', () => {
    let mockContext: CommandContext;

    beforeEach(() => {
      mockContext = {
        message: {
          message_id: 'msg123',
          channel_id: 'channel123',
          sender_id: 'user123',
          username: 'testuser',
        },
        rawArgs: '',
        prefix: '*',
        args: [],
        reply: jest.fn(),
        send: jest.fn(),
        sendDM: jest.fn(),
        ephemeralReply: jest.fn(),
      };
    });

    it('should show not initialized message when user not found', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(null);
      mockFormatter.formatNotInitialized.mockReturnValue('Not initialized message');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockUsersService.findByUserId).toHaveBeenCalledWith('user123');
      expect(mockFormatter.formatNotInitialized).toHaveBeenCalledWith('*');
      expect(mockContext.reply).toHaveBeenCalledWith('Not initialized message');
    });

    it('should show today schedules for initialized user', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([mockSchedule]);
      mockFormatter.formatScheduleList.mockReturnValue('Schedule list');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockUsersService.findByUserId).toHaveBeenCalledWith('user123');
      expect(mockSchedulesService.findByDateRange).toHaveBeenCalledWith(
        'user123',
        expect.any(Date),
        expect.any(Date),
      );
      expect(mockFormatter.formatScheduleList).toHaveBeenCalledWith(
        [mockSchedule],
        'Lịch hôm nay',
      );
      expect(mockContext.reply).toHaveBeenCalledWith('Schedule list');
    });

    it('should show empty list when no schedules today', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockFormatter.formatScheduleList.mockReturnValue('No schedules');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.findByDateRange).toHaveBeenCalled();
      expect(mockFormatter.formatScheduleList).toHaveBeenCalledWith([], 'Lịch hôm nay');
      expect(mockContext.reply).toHaveBeenCalledWith('No schedules');
    });

    it('should use correct date range for today', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockFormatter.formatScheduleList.mockReturnValue('');

      // Act
      await command.execute(mockContext);

      // Assert
      const callArgs = mockSchedulesService.findByDateRange.mock.calls[0];
      const startDate = callArgs[1] as Date;
      const endDate = callArgs[2] as Date;

      // Start should be 00:00:00
      expect(startDate.getHours()).toBe(0);
      expect(startDate.getMinutes()).toBe(0);
      expect(startDate.getSeconds()).toBe(0);

      // End should be 23:59:59
      expect(endDate.getHours()).toBe(23);
      expect(endDate.getMinutes()).toBe(59);
      expect(endDate.getSeconds()).toBe(59);

      // Same day
      expect(startDate.getDate()).toBe(endDate.getDate());
      expect(startDate.getMonth()).toBe(endDate.getMonth());
      expect(startDate.getFullYear()).toBe(endDate.getFullYear());
    });

    it('should handle multiple schedules', async () => {
      // Arrange
      const schedule2 = { ...mockSchedule, id: 2, title: 'Task 2' };
      const schedule3 = { ...mockSchedule, id: 3, title: 'Task 3' };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([mockSchedule, schedule2, schedule3]);
      mockFormatter.formatScheduleList.mockReturnValue('3 schedules');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatScheduleList).toHaveBeenCalledWith(
        [mockSchedule, schedule2, schedule3],
        'Lịch hôm nay',
      );
    });

    it('should handle different schedule types', async () => {
      // Arrange
      const meeting = { ...mockSchedule, id: 2, item_type: 'meeting' as const, title: 'Meeting' };
      const event = { ...mockSchedule, id: 3, item_type: 'event' as const, title: 'Event' };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([mockSchedule, meeting, event]);
      mockFormatter.formatScheduleList.mockReturnValue('Mixed schedules');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.findByDateRange).toHaveBeenCalled();
      expect(mockFormatter.formatScheduleList).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ item_type: 'task' }),
          expect.objectContaining({ item_type: 'meeting' }),
          expect.objectContaining({ item_type: 'event' }),
        ]),
        'Lịch hôm nay',
      );
    });

    it('should handle different schedule statuses', async () => {
      // Arrange
      const completed = { ...mockSchedule, id: 2, status: 'completed' as const };
      const cancelled = { ...mockSchedule, id: 3, status: 'cancelled' as const };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([mockSchedule, completed, cancelled]);
      mockFormatter.formatScheduleList.mockReturnValue('Mixed status');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatScheduleList).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ status: 'pending' }),
          expect.objectContaining({ status: 'completed' }),
          expect.objectContaining({ status: 'cancelled' }),
        ]),
        'Lịch hôm nay',
      );
    });

    it('should handle schedules with no end_time', async () => {
      // Arrange
      const noEndTime = { ...mockSchedule, end_time: null };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([noEndTime]);
      mockFormatter.formatScheduleList.mockReturnValue('No end time');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatScheduleList).toHaveBeenCalledWith(
        [expect.objectContaining({ end_time: null })],
        'Lịch hôm nay',
      );
    });

    it('should handle schedules with reminders', async () => {
      // Arrange
      const withReminder = {
        ...mockSchedule,
        remind_at: new Date('2026-04-24T09:45:00Z'),
        is_reminded: true,
      };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([withReminder]);
      mockFormatter.formatScheduleList.mockReturnValue('With reminder');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatScheduleList).toHaveBeenCalledWith(
        [expect.objectContaining({ is_reminded: true })],
        'Lịch hôm nay',
      );
    });

    it('should handle service errors gracefully', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockRejectedValue(new Error('Database error'));

      // Act & Assert
      await expect(command.execute(mockContext)).rejects.toThrow('Database error');
    });

    it('should handle user service errors', async () => {
      // Arrange
      mockUsersService.findByUserId.mockRejectedValue(new Error('User service error'));

      // Act & Assert
      await expect(command.execute(mockContext)).rejects.toThrow('User service error');
    });

    it('should handle formatter errors', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([mockSchedule]);
      mockFormatter.formatScheduleList.mockImplementation(() => {
        throw new Error('Formatter error');
      });

      // Act & Assert
      await expect(command.execute(mockContext)).rejects.toThrow('Formatter error');
    });

    it('should handle reply errors', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockFormatter.formatScheduleList.mockReturnValue('List');
      (mockContext.reply as jest.Mock).mockRejectedValue(new Error('Reply failed'));

      // Act & Assert
      await expect(command.execute(mockContext)).rejects.toThrow('Reply failed');
    });

    it('should work with different user IDs', async () => {
      // Arrange
      const user2 = { ...mockUser, user_id: 'user456' };
      mockContext.message.sender_id = 'user456';
      mockUsersService.findByUserId.mockResolvedValue(user2);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockFormatter.formatScheduleList.mockReturnValue('Empty');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockUsersService.findByUserId).toHaveBeenCalledWith('user456');
      expect(mockSchedulesService.findByDateRange).toHaveBeenCalledWith(
        'user456',
        expect.any(Date),
        expect.any(Date),
      );
    });

    it('should work with different prefixes', async () => {
      // Arrange
      mockContext.prefix = '!';
      mockUsersService.findByUserId.mockResolvedValue(null);
      mockFormatter.formatNotInitialized.mockReturnValue('Not init');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatNotInitialized).toHaveBeenCalledWith('!');
    });

    it('should handle schedules at midnight', async () => {
      // Arrange
      const midnightSchedule = {
        ...mockSchedule,
        start_time: new Date('2026-04-24T00:00:00Z'),
      };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([midnightSchedule]);
      mockFormatter.formatScheduleList.mockReturnValue('Midnight');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatScheduleList).toHaveBeenCalled();
    });

    it('should handle schedules at end of day', async () => {
      // Arrange
      const endOfDaySchedule = {
        ...mockSchedule,
        start_time: new Date('2026-04-24T23:59:00Z'),
      };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([endOfDaySchedule]);
      mockFormatter.formatScheduleList.mockReturnValue('End of day');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatScheduleList).toHaveBeenCalled();
    });

    it('should handle very long schedule titles', async () => {
      // Arrange
      const longTitle = 'A'.repeat(500);
      const longSchedule = { ...mockSchedule, title: longTitle };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([longSchedule]);
      mockFormatter.formatScheduleList.mockReturnValue('Long title');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatScheduleList).toHaveBeenCalledWith(
        [expect.objectContaining({ title: longTitle })],
        'Lịch hôm nay',
      );
    });

    it('should handle schedules with special characters in title', async () => {
      // Arrange
      const specialSchedule = {
        ...mockSchedule,
        title: '🎉 Test @#$%^&* <script>alert("xss")</script>',
      };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([specialSchedule]);
      mockFormatter.formatScheduleList.mockReturnValue('Special chars');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatScheduleList).toHaveBeenCalled();
    });

    it('should handle user with null username', async () => {
      // Arrange
      const userNoUsername = { ...mockUser, username: null };
      mockUsersService.findByUserId.mockResolvedValue(userNoUsername as any);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockFormatter.formatScheduleList.mockReturnValue('Empty');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.findByDateRange).toHaveBeenCalled();
    });

    it('should handle user with null display_name', async () => {
      // Arrange
      const userNoDisplay = { ...mockUser, display_name: null };
      mockUsersService.findByUserId.mockResolvedValue(userNoDisplay as any);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockFormatter.formatScheduleList.mockReturnValue('Empty');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.findByDateRange).toHaveBeenCalled();
    });
  });
});

