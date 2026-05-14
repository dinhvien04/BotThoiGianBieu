import { Test, TestingModule } from '@nestjs/testing';
import {
  LichTuanCommand,
  LichTuanTruocCommand,
  LichTuanSauCommand,
} from 'src/bot/commands/lich-tuan.command';
import { CommandRegistry } from 'src/bot/commands/command-registry';
import { UsersService } from 'src/users/users.service';
import { SchedulesService } from 'src/schedules/schedules.service';
import { MessageFormatter } from 'src/shared/utils/message-formatter';
import { CommandContext } from 'src/bot/commands/command.types';
import { User } from 'src/users/entities/user.entity';

describe('LichTuanCommand', () => {
  let command: LichTuanCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = {
    user_id: 'user123',
    username: 'testuser',
    display_name: 'Test User',
  } as any;

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSchedulesService = { findByDateRange: jest.fn() } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(),
      formatWeeklySchedule: jest.fn(),
      formatInvalidDate: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LichTuanCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<LichTuanCommand>(LichTuanCommand);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('lich-tuan');
      expect(command.description).toBe('Xem lịch tuần này hoặc tuần chứa ngày được nhập');
      expect(command.category).toBe('📅 Xem lịch');
      expect(command.syntax).toBe('lich-tuan [DD-MM-YYYY]');
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

    it('should show this week schedules when no date provided', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockFormatter.formatWeeklySchedule.mockReturnValue('Weekly schedule');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.findByDateRange).toHaveBeenCalled();
      expect(mockFormatter.formatWeeklySchedule).toHaveBeenCalledWith(
        [],
        'Lịch tuần này',
        expect.any(Date),
      );
    });

    it('should show week containing specific date', async () => {
      // Arrange
      mockContext.rawArgs = '24-4-2026';
      mockContext.args = ['24-4-2026'];
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockFormatter.formatWeeklySchedule.mockReturnValue('Weekly schedule');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatWeeklySchedule).toHaveBeenCalledWith(
        [],
        expect.stringContaining('Lịch tuần chứa ngày'),
        expect.any(Date),
      );
    });

    it('should show error for invalid date', async () => {
      // Arrange
      mockContext.rawArgs = 'invalid';
      mockContext.args = ['invalid'];
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockFormatter.formatInvalidDate.mockReturnValue('Invalid date');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatInvalidDate).toHaveBeenCalled();
    });
  });
});

describe('LichTuanTruocCommand', () => {
  let command: LichTuanTruocCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = { user_id: 'user123' } as any;

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSchedulesService = { findByDateRange: jest.fn() } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(),
      formatWeeklySchedule: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LichTuanTruocCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<LichTuanTruocCommand>(LichTuanTruocCommand);
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('lich-tuan-truoc');
      expect(command.description).toBe('Xem lịch tuần trước');
      expect(command.syntax).toBe('lich-tuan-truoc');
    });
  });

  describe('execute', () => {
    it('should show last week schedules', async () => {
      // Arrange
      const mockContext: CommandContext = {
        message: { message_id: 'msg', channel_id: 'ch', sender_id: 'user123' },
        rawArgs: '',
        prefix: '*',
        args: [],
        reply: jest.fn(),
      } as any;

      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockFormatter.formatWeeklySchedule.mockReturnValue('Last week');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatWeeklySchedule).toHaveBeenCalledWith(
        [],
        'Lịch tuần trước',
        expect.any(Date),
      );
    });

    it('should reject arguments', async () => {
      // Arrange
      const mockContext: CommandContext = {
        message: { message_id: 'msg', channel_id: 'ch', sender_id: 'user123' },
        rawArgs: 'extra',
        prefix: '*',
        args: ['extra'],
        reply: jest.fn(),
      } as any;

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('không nhận tham số'),
      );
    });
  });
});

describe('LichTuanSauCommand', () => {
  let command: LichTuanSauCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = { user_id: 'user123' } as any;

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSchedulesService = { findByDateRange: jest.fn() } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(),
      formatWeeklySchedule: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LichTuanSauCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<LichTuanSauCommand>(LichTuanSauCommand);
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('lich-tuan-sau');
      expect(command.description).toBe('Xem lịch tuần sau');
      expect(command.syntax).toBe('lich-tuan-sau');
    });
  });

  describe('execute', () => {
    it('should show next week schedules', async () => {
      // Arrange
      const mockContext: CommandContext = {
        message: { message_id: 'msg', channel_id: 'ch', sender_id: 'user123' },
        rawArgs: '',
        prefix: '*',
        args: [],
        reply: jest.fn(),
      } as any;

      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findByDateRange.mockResolvedValue([]);
      mockFormatter.formatWeeklySchedule.mockReturnValue('Next week');

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockFormatter.formatWeeklySchedule).toHaveBeenCalledWith(
        [],
        'Lịch tuần sau',
        expect.any(Date),
      );
    });

    it('should reject arguments', async () => {
      // Arrange
      const mockContext: CommandContext = {
        message: { message_id: 'msg', channel_id: 'ch', sender_id: 'user123' },
        rawArgs: 'extra',
        prefix: '*',
        args: ['extra'],
        reply: jest.fn(),
      } as any;

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('không nhận tham số'),
      );
    });
  });
});

