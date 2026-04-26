import { Test, TestingModule } from '@nestjs/testing';
import { DanhSachCommand } from '../../src/bot/commands/danh-sach.command';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { UsersService } from '../../src/users/users.service';
import { SchedulesService } from '../../src/schedules/schedules.service';
import { MessageFormatter } from '../../src/shared/utils/message-formatter';
import { CommandContext } from '../../src/bot/commands/command.types';
import { User } from '../../src/users/entities/user.entity';
import { Schedule } from '../../src/schedules/entities/schedule.entity';

describe('DanhSachCommand', () => {
  let command: DanhSachCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = {
    user_id: 'user123',
    username: 'testuser',
    display_name: 'Test User',
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const makeSchedule = (id: number): Schedule => ({
    id,
    user_id: 'user123',
    item_type: 'task',
    title: `Task ${id}`,
    description: null,
    start_time: new Date('2026-04-24T10:00:00Z'),
    end_time: null,
    status: 'pending',
    remind_at: null,
    is_reminded: false,
    acknowledged_at: null,
    end_notified_at: null,
    created_at: new Date(),
    updated_at: new Date(),
  } as any);

  const buildContext = (args: string[] = []): CommandContext => ({
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
    mockSchedulesService = { findAllPending: jest.fn() } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(),
      formatScheduleDigest: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DanhSachCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<DanhSachCommand>(DanhSachCommand);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('danh-sach');
      expect(command.aliases).toEqual(['danhsach', 'pending', 'list']);
      expect(command.category).toBe('📅 XEM LỊCH');
      expect(command.syntax).toBe('danh-sach [trang] [--uutien cao|vua|thap]');
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
      const ctx = buildContext();

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('NOT_INIT');
      expect(mockSchedulesService.findAllPending).not.toHaveBeenCalled();
    });

    it('should default to page 1 with limit 10 offset 0', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findAllPending.mockResolvedValue({
        items: [makeSchedule(1)],
        total: 1,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST');
      const ctx = buildContext();

      await command.execute(ctx);

      expect(mockSchedulesService.findAllPending).toHaveBeenCalledWith(
        'user123',
        10,
        0,
        undefined,
      );
      expect(ctx.reply).toHaveBeenCalledWith('DIGEST');
    });

    it('should compute offset from page argument', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findAllPending.mockResolvedValue({
        items: [makeSchedule(11)],
        total: 25,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST');
      const ctx = buildContext(['2']);

      await command.execute(ctx);

      expect(mockSchedulesService.findAllPending).toHaveBeenCalledWith(
        'user123',
        10,
        10,
        undefined,
      );
    });

    it('should render empty state when user has no pending schedules', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findAllPending.mockResolvedValue({
        items: [],
        total: 0,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST_EMPTY');
      const ctx = buildContext();

      await command.execute(ctx);

      expect(mockFormatter.formatScheduleDigest).toHaveBeenCalledWith(
        [],
        'Danh sách lịch chờ',
        expect.objectContaining({
          emptyMessage: expect.stringContaining('không có lịch nào đang chờ'),
        }),
      );
      expect(ctx.reply).toHaveBeenCalledWith('DIGEST_EMPTY');
    });

    it('should reject non-numeric page', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['abc']);

      await command.execute(ctx);

      expect(mockSchedulesService.findAllPending).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Trang không hợp lệ'),
      );
    });

    it('should reject zero or negative page', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['0']);

      await command.execute(ctx);

      expect(mockSchedulesService.findAllPending).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Trang không hợp lệ'),
      );
    });

    it('should reject page beyond total pages', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findAllPending.mockResolvedValue({
        items: [],
        total: 5,
      });
      const ctx = buildContext(['3']);

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Trang 3 vượt quá'),
      );
    });

    it('should include pagination footer when more pages exist', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findAllPending.mockResolvedValue({
        items: [makeSchedule(1)],
        total: 25,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST_WITH_NEXT');
      const ctx = buildContext(['1']);

      await command.execute(ctx);

      const callArgs = mockFormatter.formatScheduleDigest.mock.calls[0];
      expect(callArgs).toBeDefined();
      const opts = callArgs?.[2] as { footer?: string };
      expect(opts.footer).toContain('Tổng 25 lịch pending');
      expect(opts.footer).toContain('trang 1/3');
      expect(opts.footer).toContain('*danh-sach 2');
    });

    it('should omit next-page hint on last page', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findAllPending.mockResolvedValue({
        items: [makeSchedule(21)],
        total: 25,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST_LAST');
      const ctx = buildContext(['3']);

      await command.execute(ctx);

      const callArgs = mockFormatter.formatScheduleDigest.mock.calls[0];
      const opts = callArgs?.[2] as { footer?: string };
      expect(opts.footer).toContain('trang 3/3');
      expect(opts.footer).not.toContain('trang tiếp theo');
    });
  });
});
