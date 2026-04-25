import { Test, TestingModule } from '@nestjs/testing';
import { LichNgayCommand } from '../../src/bot/commands/lich-ngay.command';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { UsersService } from '../../src/users/users.service';
import { ScheduleService } from '../../src/schedules/schedule.service';
import { MessageFormatter } from '../../src/shared/utils/message-formatter';
import { CommandContext } from '../../src/bot/commands/command.types';
import { User } from '../../src/users/entities/user.entity';
import { Schedule } from '../../src/schedules/entities/schedule.entity';

describe('LichNgayCommand', () => {
  let command: LichNgayCommand;
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
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_until: null,
    recurrence_parent_id: null,
  } as any;

  const mockSchedule: Schedule = {
    id: 1,
    user_id: 'user123',
    item_type: 'task',
    title: 'Test Task',
    start_time: new Date('2026-04-24T10:00:00Z'),
    end_time: new Date('2026-04-24T11:00:00Z'),
    status: 'pending',
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
      formatInvalidDate: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LichNgayCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: ScheduleService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<LichNgayCommand>(LichNgayCommand);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('lich-ngay');
      expect(command.description).toBe('Xem lịch theo ngày');
      expect(command.category).toBe('📅 Xem lịch');
      expect(command.syntax).toBe('lich-ngay [DD-MM-YYYY]');
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
      mockFormatter.formatNotInitialized.mockReturnValue('Not initialized');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatNotInitialized).toHaveBeenCalledWith('*');
      expect(mockContext.reply).toHaveBeenCalledWith('Not initialized');
    });

    it('should show today schedules when no date provided', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([mockSchedule]);
      mockFormatter.formatScheduleList.mockReturnValue('Schedule list');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.findByDateRange).toHaveBeenCalled();
      expect(mockFormatter.formatScheduleList).toHaveBeenCalledWith(
        [mockSchedule],
        'Lịch ngày hôm nay',
      );
    });

    it('should show schedules for specific date', async () => {
      // Arrange
      mockContext.rawArgs = '24-4-2026';
      mockContext.args = ['24-4-2026'];
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([mockSchedule]);
      mockFormatter.formatScheduleList.mockReturnValue('Schedule list');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.findByDateRange).toHaveBeenCalled();
      expect(mockFormatter.formatScheduleList).toHaveBeenCalledWith(
        [mockSchedule],
        expect.stringContaining('Lịch ngày'),
      );
    });

    it('should show error for invalid date format', async () => {
      // Arrange
      mockContext.rawArgs = 'invalid-date';
      mockContext.args = ['invalid-date'];
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockFormatter.formatInvalidDate.mockReturnValue('Invalid date');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatInvalidDate).toHaveBeenCalledWith(
        'invalid-date',
        '*',
        'lich-ngay',
      );
      expect(mockContext.reply).toHaveBeenCalledWith('Invalid date');
    });

    it('should show error for multiple arguments', async () => {
      // Arrange
      mockContext.rawArgs = '24-4-2026 extra';
      mockContext.args = ['24-4-2026', 'extra'];
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockFormatter.formatInvalidDate.mockReturnValue('Invalid date');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatInvalidDate).toHaveBeenCalled();
      expect(mockContext.reply).toHaveBeenCalledWith('Invalid date');
    });

    it('should parse Vietnamese date format correctly', async () => {
      // Arrange
      mockContext.rawArgs = '1-1-2026';
      mockContext.args = ['1-1-2026'];
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockFormatter.formatScheduleList.mockReturnValue('Empty');

      // Act
      await command.execute(mockContext);

      // Assert
      const callArgs = mockSchedulesService.findByDateRange.mock.calls[0];
      const startDate = callArgs[1] as Date;
      expect(startDate.getDate()).toBe(1);
      expect(startDate.getMonth()).toBe(0); // January
      expect(startDate.getFullYear()).toBe(2026);
    });
  });
});

