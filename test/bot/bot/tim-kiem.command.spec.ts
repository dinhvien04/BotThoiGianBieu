import { Test, TestingModule } from '@nestjs/testing';
import { TimKiemCommand } from 'src/bot/commands/tim-kiem.command';
import { CommandRegistry } from 'src/bot/commands/command-registry';
import { UsersService } from 'src/users/users.service';
import { SchedulesService } from 'src/schedules/schedules.service';
import { MessageFormatter } from 'src/shared/utils/message-formatter';
import { CommandContext } from 'src/bot/commands/command.types';
import { User } from 'src/users/entities/user.entity';
import { Schedule } from 'src/schedules/entities/schedule.entity';

describe('TimKiemCommand', () => {
  let command: TimKiemCommand;
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
    mockSchedulesService = { search: jest.fn() } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(),
      formatScheduleDigest: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TimKiemCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<TimKiemCommand>(TimKiemCommand);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('tim-kiem');
      expect(command.aliases).toEqual(['timkiem', 'search']);
      expect(command.category).toBe('📅 XEM LỊCH');
      expect(command.syntax).toBe('tim-kiem <từ khoá> [trang]');
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
      const ctx = buildContext(['abc']);

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith('NOT_INIT');
      expect(mockSchedulesService.search).not.toHaveBeenCalled();
    });

    it('should require at least one keyword arg', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext();

      await command.execute(ctx);

      expect(mockSchedulesService.search).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Thiếu từ khoá'),
      );
    });

    it('should search with single-word keyword', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.search.mockResolvedValue({
        items: [makeSchedule(1)],
        total: 1,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST');
      const ctx = buildContext(['họp']);

      await command.execute(ctx);

      expect(mockSchedulesService.search).toHaveBeenCalledWith(
        'user123',
        'họp',
        10,
        0,
      );
      expect(ctx.reply).toHaveBeenCalledWith('DIGEST');
    });

    it('should join multi-word keyword', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.search.mockResolvedValue({
        items: [makeSchedule(1)],
        total: 1,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST');
      const ctx = buildContext(['họp', 'khách', 'hàng']);

      await command.execute(ctx);

      expect(mockSchedulesService.search).toHaveBeenCalledWith(
        'user123',
        'họp khách hàng',
        10,
        0,
      );
    });

    it('should interpret trailing numeric arg as page when there are other keyword args', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.search.mockResolvedValue({
        items: [makeSchedule(11)],
        total: 25,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST');
      const ctx = buildContext(['họp', '2']);

      await command.execute(ctx);

      expect(mockSchedulesService.search).toHaveBeenCalledWith(
        'user123',
        'họp',
        10,
        10,
      );
    });

    it('should treat a sole numeric arg as the keyword (not a page)', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.search.mockResolvedValue({
        items: [],
        total: 0,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST');
      const ctx = buildContext(['2026']);

      await command.execute(ctx);

      expect(mockSchedulesService.search).toHaveBeenCalledWith(
        'user123',
        '2026',
        10,
        0,
      );
    });

    it('should render empty digest when no results', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.search.mockResolvedValue({
        items: [],
        total: 0,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST_EMPTY');
      const ctx = buildContext(['abc']);

      await command.execute(ctx);

      expect(mockFormatter.formatScheduleDigest).toHaveBeenCalledWith(
        [],
        'Kết quả tìm: "abc"',
        expect.objectContaining({
          emptyMessage: expect.stringContaining('Không tìm thấy lịch nào chứa "abc"'),
        }),
      );
      expect(ctx.reply).toHaveBeenCalledWith('DIGEST_EMPTY');
    });

    it('should reject page beyond total pages', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.search.mockResolvedValue({
        items: [],
        total: 5,
      });
      const ctx = buildContext(['abc', '3']);

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Trang 3 vượt quá'),
      );
    });

    it('should include footer with next page hint when more pages exist', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.search.mockResolvedValue({
        items: [makeSchedule(1)],
        total: 25,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST');
      const ctx = buildContext(['abc']);

      await command.execute(ctx);

      const call = mockFormatter.formatScheduleDigest.mock.calls[0];
      const opts = call?.[2] as { footer?: string };
      expect(opts.footer).toContain('Tổng 25 kết quả');
      expect(opts.footer).toContain('trang 1/3');
      expect(opts.footer).toContain('*tim-kiem abc 2');
    });

    it('should omit next-page hint on last page', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.search.mockResolvedValue({
        items: [makeSchedule(1)],
        total: 3,
      });
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST');
      const ctx = buildContext(['abc']);

      await command.execute(ctx);

      const call = mockFormatter.formatScheduleDigest.mock.calls[0];
      const opts = call?.[2] as { footer?: string };
      expect(opts.footer).toContain('trang 1/1');
      expect(opts.footer).not.toContain('trang tiếp theo');
    });
  });
});
