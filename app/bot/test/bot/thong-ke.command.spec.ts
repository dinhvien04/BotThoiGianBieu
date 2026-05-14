import { Test, TestingModule } from '@nestjs/testing';
import { ThongKeCommand } from '../../src/bot/commands/thong-ke.command';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { UsersService } from '../../src/users/users.service';
import {
  ScheduleStatistics,
  SchedulesService,
} from '../../src/schedules/schedules.service';
import { CommandContext } from '../../src/bot/commands/command.types';
import { User } from '../../src/users/entities/user.entity';

describe('ThongKeCommand', () => {
  let command: ThongKeCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;

  const mockUser: User = {
    user_id: 'user123',
    username: 'testuser',
    display_name: 'Test User',
    created_at: new Date(),
    updated_at: new Date(),
  } as any;

  const buildContext = (args: string[] = []): CommandContext => ({
    message: {
      message_id: 'msg123',
      channel_id: 'channel123',
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

  const buildStats = (overrides: Partial<ScheduleStatistics> = {}): ScheduleStatistics => ({
    total: 0,
    byStatus: { pending: 0, completed: 0, cancelled: 0 },
    byItemType: { task: 0, meeting: 0, event: 0, reminder: 0 },
    byPriority: { low: 0, normal: 0, high: 0 },
    topHours: [],
    recurringActiveCount: 0,
    ...overrides,
  });

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSchedulesService = { getStatistics: jest.fn() } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThongKeCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
      ],
    }).compile();

    command = module.get(ThongKeCommand);
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('thong-ke');
      expect(command.aliases).toContain('thongke');
      expect(command.aliases).toContain('stats');
      expect(command.category).toBe('📅 XEM LỊCH');
    });
  });

  describe('onModuleInit', () => {
    it('should register itself', () => {
      command.onModuleInit();
      expect(mockRegistry.register).toHaveBeenCalledWith(command);
    });
  });

  describe('execute', () => {
    it('should reject if user not initialized', async () => {
      mockUsersService.findByUserId.mockResolvedValue(null);
      const ctx = buildContext();

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('chưa khởi tạo tài khoản'),
      );
      expect(mockSchedulesService.getStatistics).not.toHaveBeenCalled();
    });

    it('should reject invalid range argument', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['quy']);

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Khoảng thống kê không hợp lệ'),
      );
      expect(mockSchedulesService.getStatistics).not.toHaveBeenCalled();
    });

    it('should default to 30-day range when no arg', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.getStatistics.mockResolvedValue(buildStats());
      const ctx = buildContext();

      await command.execute(ctx);

      expect(mockSchedulesService.getStatistics).toHaveBeenCalledTimes(1);
      const [userId, start, end] = mockSchedulesService.getStatistics.mock.calls[0];
      expect(userId).toBe('user123');
      expect(start).not.toBeNull();
      expect(end).not.toBeNull();
      // 30 days span (with start of day → end of day)
      const span = (end as Date).getTime() - (start as Date).getTime();
      expect(span).toBeGreaterThan(28 * 86400_000);
      expect(span).toBeLessThan(31 * 86400_000);
    });

    it('should pass null range for "all"', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.getStatistics.mockResolvedValue(buildStats());
      const ctx = buildContext(['all']);

      await command.execute(ctx);

      const [, start, end] = mockSchedulesService.getStatistics.mock.calls[0];
      expect(start).toBeNull();
      expect(end).toBeNull();
    });

    it('should accept "tuan" / "week" aliases', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.getStatistics.mockResolvedValue(buildStats());

      await command.execute(buildContext(['week']));
      await command.execute(buildContext(['tuan']));

      expect(mockSchedulesService.getStatistics).toHaveBeenCalledTimes(2);
      const span1 =
        (mockSchedulesService.getStatistics.mock.calls[0][2] as Date).getTime() -
        (mockSchedulesService.getStatistics.mock.calls[0][1] as Date).getTime();
      expect(span1).toBeGreaterThan(5 * 86400_000);
      expect(span1).toBeLessThan(8 * 86400_000);
    });

    it('should render empty-state message when no schedules', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.getStatistics.mockResolvedValue(buildStats());
      const ctx = buildContext();

      await command.execute(ctx);

      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Không có lịch nào'),
      );
    });

    it('should render full statistics with completion rate', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.getStatistics.mockResolvedValue(
        buildStats({
          total: 10,
          byStatus: { pending: 4, completed: 5, cancelled: 1 },
          byItemType: { task: 6, meeting: 3, event: 1, reminder: 0 },
          topHours: [
            { hour: 9, count: 4 },
            { hour: 14, count: 3 },
          ],
          recurringActiveCount: 2,
        }),
      );
      const ctx = buildContext();

      await command.execute(ctx);

      const message = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
      expect(message).toContain('Tổng số lịch');
      expect(message).toContain('10');
      expect(message).toContain('Tỉ lệ hoàn thành');
      expect(message).toContain('83.3%');
      expect(message).toContain('Top giờ bận nhất');
      expect(message).toContain('09:00');
      expect(message).toContain('14:00');
      expect(message).toContain('Lịch lặp đang hoạt động');
      expect(message).toContain('2');
    });

    it('should not display completion rate when no finished schedules', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.getStatistics.mockResolvedValue(
        buildStats({
          total: 3,
          byStatus: { pending: 3, completed: 0, cancelled: 0 },
          byItemType: { task: 3, meeting: 0, event: 0, reminder: 0 },
          topHours: [{ hour: 8, count: 3 }],
        }),
      );
      const ctx = buildContext();

      await command.execute(ctx);

      const message = (ctx.reply as jest.Mock).mock.calls[0][0] as string;
      expect(message).not.toContain('Tỉ lệ hoàn thành');
      expect(message).toContain('Tổng số lịch');
    });

    it('should pass through "year" and "all" aliases without error', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.getStatistics.mockResolvedValue(buildStats());

      await command.execute(buildContext(['year']));
      await command.execute(buildContext(['nam']));
      await command.execute(buildContext(['tat-ca']));

      expect(mockSchedulesService.getStatistics).toHaveBeenCalledTimes(3);
    });
  });
});
