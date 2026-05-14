import { Test, TestingModule } from '@nestjs/testing';
import { NhacSauCommand } from '../../src/bot/commands/nhac-sau.command';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { UsersService } from '../../src/users/users.service';
import { SchedulesService } from '../../src/schedules/schedules.service';
import { MessageFormatter } from '../../src/shared/utils/message-formatter';
import { DateParser } from '../../src/shared/utils/date-parser';
import { CommandContext } from '../../src/bot/commands/command.types';
import { User } from '../../src/users/entities/user.entity';
import { Schedule } from '../../src/schedules/entities/schedule.entity';

describe('NhacSauCommand', () => {
  let command: NhacSauCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;
  let mockDateParser: jest.Mocked<DateParser>;

  const mockUser: User = {
    user_id: 'user123',
    username: 'testuser',
    display_name: 'Test User',
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const makeSchedule = (overrides: Partial<Schedule> = {}): Schedule => ({
    id: 5,
    user_id: 'user123',
    item_type: 'task',
    title: 'Chuẩn bị demo',
    description: null,
    start_time: new Date('2026-04-26T09:00:00Z'),
    end_time: null,
    status: 'pending',
    remind_at: null,
    is_reminded: false,
    acknowledged_at: null,
    end_notified_at: null,
    created_at: new Date(),
    updated_at: new Date(),
    ...overrides,
  } as any);

  const buildContext = (args: string[]): CommandContext => ({
    message: {
      message_id: 'msg123',
      channel_id: 'channel123',
      sender_id: 'user123',
      username: 'testuser',
    },
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
      setReminder: jest.fn(),
    } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(),
    } as any;
    mockDateParser = {
      formatVietnam: jest.fn((d: Date) => d.toISOString()),
      formatMinutes: jest.fn((m: number) => `${m} phút`),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NhacSauCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
        { provide: DateParser, useValue: mockDateParser },
      ],
    }).compile();

    command = module.get(NhacSauCommand);
  });

  afterEach(() => jest.clearAllMocks());

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('nhac-sau');
      expect(command.aliases).toEqual(['nhacsau', 'remindin']);
      expect(command.category).toBe('🔔 NHẮC NHỞ');
      expect(command.syntax).toBe('nhac-sau <ID> <thời gian | khung>');
    });
  });

  describe('onModuleInit', () => {
    it('should register itself with the registry', () => {
      command.onModuleInit();
      expect(mockRegistry.register).toHaveBeenCalledWith(command);
    });
  });

  describe('execute', () => {
    it('should show not initialized when user missing', async () => {
      mockUsersService.findByUserId.mockResolvedValue(null);
      mockFormatter.formatNotInitialized.mockReturnValue('NOT_INIT');
      const ctx = buildContext(['5', '30p']);

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('NOT_INIT');
      expect(mockSchedulesService.setReminder).not.toHaveBeenCalled();
    });

    it('should reject missing arguments', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['5']);

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Sai cú pháp'),
      );
      expect(mockSchedulesService.setReminder).not.toHaveBeenCalled();
    });

    it('should reject non-numeric ID', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['abc', '30p']);

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('ID không hợp lệ'),
      );
      expect(mockSchedulesService.setReminder).not.toHaveBeenCalled();
    });

    it('should reject invalid duration', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['5', 'abc']);

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Thời gian không hợp lệ'),
      );
      expect(mockSchedulesService.setReminder).not.toHaveBeenCalled();
    });

    it('should return error when schedule not found', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(null);
      const ctx = buildContext(['5', '30p']);

      await command.execute(ctx);

      expect(mockSchedulesService.findById).toHaveBeenCalledWith(5, 'user123');
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Không tìm thấy lịch #5'),
      );
      expect(mockSchedulesService.setReminder).not.toHaveBeenCalled();
    });

    it('should reject completed schedule', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(
        makeSchedule({ status: 'completed' }),
      );
      const ctx = buildContext(['5', '30p']);

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('đã hoàn thành'),
      );
      expect(mockSchedulesService.setReminder).not.toHaveBeenCalled();
    });

    it('should set reminder to now + duration for a simple duration', async () => {
      jest.useFakeTimers();
      const fakeNow = new Date('2026-04-26T08:00:00Z');
      jest.setSystemTime(fakeNow);

      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(makeSchedule());
      mockSchedulesService.setReminder.mockResolvedValue(undefined);

      const ctx = buildContext(['5', '30p']);

      await command.execute(ctx);

      expect(mockSchedulesService.setReminder).toHaveBeenCalledTimes(1);
      const [id, remindAt] = mockSchedulesService.setReminder.mock.calls[0];
      expect(id).toBe(5);
      expect((remindAt as Date).getTime()).toBe(
        fakeNow.getTime() + 30 * 60 * 1000,
      );

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Đã đặt nhắc cho lịch #5'),
      );

      jest.useRealTimers();
    });

    it('should handle compound duration like 2h30p', async () => {
      jest.useFakeTimers();
      const fakeNow = new Date('2026-04-26T08:00:00Z');
      jest.setSystemTime(fakeNow);

      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(makeSchedule());
      const ctx = buildContext(['5', '2h30p']);

      await command.execute(ctx);

      const [, remindAt] = mockSchedulesService.setReminder.mock.calls[0];
      expect((remindAt as Date).getTime()).toBe(
        fakeNow.getTime() + 150 * 60 * 1000,
      );

      jest.useRealTimers();
    });

    it('should join space-separated duration args', async () => {
      jest.useFakeTimers();
      const fakeNow = new Date('2026-04-26T08:00:00Z');
      jest.setSystemTime(fakeNow);

      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(makeSchedule());
      const ctx = buildContext(['5', '30', 'phút']);

      await command.execute(ctx);

      const [, remindAt] = mockSchedulesService.setReminder.mock.calls[0];
      expect((remindAt as Date).getTime()).toBe(
        fakeNow.getTime() + 30 * 60 * 1000,
      );

      jest.useRealTimers();
    });

    it('should warn when remind_at lies after schedule end_time', async () => {
      jest.useFakeTimers();
      const fakeNow = new Date('2026-04-26T08:00:00Z');
      jest.setSystemTime(fakeNow);

      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(
        makeSchedule({
          end_time: new Date('2026-04-26T09:00:00Z'),
        }),
      );

      const ctx = buildContext(['5', '3h']);
      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('nằm SAU khi lịch đã kết thúc'),
      );

      jest.useRealTimers();
    });
  });
});
