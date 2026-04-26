import { Test, TestingModule } from '@nestjs/testing';
import { LichLapCommand } from '../../src/bot/commands/lich-lap.command';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { UsersService } from '../../src/users/users.service';
import { SchedulesService } from '../../src/schedules/schedules.service';
import { MessageFormatter } from '../../src/shared/utils/message-formatter';
import { DateParser } from '../../src/shared/utils/date-parser';
import { CommandContext } from '../../src/bot/commands/command.types';
import { User } from '../../src/users/entities/user.entity';
import { Schedule } from '../../src/schedules/entities/schedule.entity';

describe('LichLapCommand', () => {
  let command: LichLapCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;
  let mockDateParser: jest.Mocked<DateParser>;

  const mockUser: User = {
    user_id: 'user123',
    username: 'testuser',
  } as any;

  const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule =>
    ({
      id: 5,
      user_id: 'user123',
      item_type: 'task',
      title: 'Họp tuần',
      description: null,
      start_time: new Date('2026-04-24T10:00:00Z'),
      end_time: null,
      status: 'pending',
      remind_at: null,
      is_reminded: false,
      acknowledged_at: null,
      end_notified_at: null,
      recurrence_type: 'none',
      recurrence_interval: 1,
      recurrence_until: null,
      priority: "normal",
      recurrence_parent_id: null,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides,
    }) as any;

  const buildContext = (args: string[]): CommandContext => ({
    message: {
      message_id: 'msg',
      channel_id: 'ch',
      sender_id: 'user123',
      username: 'testuser',
    } as any,
    rawArgs: args.join(' '),
    prefix: '*',
    args,
    reply: jest.fn(),
    send: jest.fn(),
    sendDM: jest.fn(),
    ephemeralReply: jest.fn(),
  });

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSchedulesService = {
      findById: jest.fn(),
      setRecurrence: jest.fn(),
    } as any;
    mockFormatter = { formatNotInitialized: jest.fn(() => 'NOT_INIT') } as any;
    mockDateParser = {
      parseVietnamLocal: jest.fn(),
      formatVietnam: jest.fn((d: Date, _withTime = true) => d.toISOString()),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LichLapCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
        { provide: DateParser, useValue: mockDateParser },
      ],
    }).compile();

    command = module.get<LichLapCommand>(LichLapCommand);
  });

  afterEach(() => jest.clearAllMocks());

  describe('metadata', () => {
    it('should expose name, aliases, category, syntax', () => {
      expect(command.name).toBe('lich-lap');
      expect(command.aliases).toEqual(['lichlap', 'recur']);
      expect(command.category).toBe('✏️ QUẢN LÝ LỊCH');
      expect(command.syntax).toContain('daily|weekly|monthly');
    });

    it('should register itself on module init', () => {
      command.onModuleInit();
      expect(mockRegistry.register).toHaveBeenCalledWith(command);
    });
  });

  describe('execute', () => {
    it('should warn when user not initialized', async () => {
      mockUsersService.findByUserId.mockResolvedValue(null);
      const ctx = buildContext(['5', 'daily']);
      await command.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith('NOT_INIT');
    });

    it('should warn when args too few', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['5']);
      await command.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Sai cú pháp'));
    });

    it('should warn on invalid ID', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['abc', 'daily']);
      await command.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('ID không hợp lệ'));
    });

    it('should warn on unknown recurrence type', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['5', 'yearly']);
      await command.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Kiểu lặp không hợp lệ'),
      );
    });

    it('should reject "none" and suggest *bo-lap', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['5', 'none']);
      await command.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('bo-lap'));
    });

    it('should warn when schedule not found', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(null);
      const ctx = buildContext(['5', 'daily']);
      await command.execute(ctx);
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Không tìm thấy'));
    });

    it('should enable daily recurrence with default interval', async () => {
      const schedule = makeSchedule();
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(schedule);
      mockSchedulesService.setRecurrence.mockResolvedValue(schedule);

      const ctx = buildContext(['5', 'daily']);
      await command.execute(ctx);

      expect(mockSchedulesService.setRecurrence).toHaveBeenCalledWith(5, {
        type: 'daily',
        interval: 1,
        until: null,
      });
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Hàng ngày'),
      );
    });

    it('should enable weekly recurrence with interval', async () => {
      const schedule = makeSchedule();
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(schedule);
      mockSchedulesService.setRecurrence.mockResolvedValue(schedule);

      const ctx = buildContext(['5', 'weekly', '2']);
      await command.execute(ctx);

      expect(mockSchedulesService.setRecurrence).toHaveBeenCalledWith(5, {
        type: 'weekly',
        interval: 2,
        until: null,
      });
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Mỗi 2 tuần'),
      );
    });

    it('should parse --den argument and set recurrence_until', async () => {
      const schedule = makeSchedule();
      const until = new Date('2026-12-31T00:00:00Z');
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(schedule);
      mockSchedulesService.setRecurrence.mockResolvedValue(schedule);
      mockDateParser.parseVietnamLocal.mockReturnValue(until);

      const ctx = buildContext(['5', 'monthly', '--den', '31/12/2026']);
      await command.execute(ctx);

      expect(mockSchedulesService.setRecurrence).toHaveBeenCalledWith(5, {
        type: 'monthly',
        interval: 1,
        until,
      });
    });

    it('should reject --den in the past (<= start_time)', async () => {
      const schedule = makeSchedule({ start_time: new Date('2026-04-24T10:00:00Z') });
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(schedule);
      mockDateParser.parseVietnamLocal.mockReturnValue(new Date('2026-04-20T00:00:00Z'));

      const ctx = buildContext(['5', 'weekly', '--den', '20/04/2026']);
      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('phải SAU ngày bắt đầu'),
      );
      expect(mockSchedulesService.setRecurrence).not.toHaveBeenCalled();
    });

    it('should reject invalid --den date format', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockDateParser.parseVietnamLocal.mockReturnValue(null);

      const ctx = buildContext(['5', 'daily', '--den', 'garbage']);
      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Ngày dừng lặp không hợp lệ'),
      );
    });

    it('should reject negative interval', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);

      const ctx = buildContext(['5', 'daily', '-2']);
      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Interval không hợp lệ'),
      );
    });

    it('should accept Vietnamese recurrence types', async () => {
      const schedule = makeSchedule();
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(schedule);
      mockSchedulesService.setRecurrence.mockResolvedValue(schedule);

      const ctx = buildContext(['5', 'tuần']);
      await command.execute(ctx);

      expect(mockSchedulesService.setRecurrence).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ type: 'weekly' }),
      );
    });
  });
});
