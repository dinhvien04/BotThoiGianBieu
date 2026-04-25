import { Test, TestingModule } from '@nestjs/testing';
import { SapToiCommand } from '../../src/bot/commands/sap-toi.command';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { UsersService } from '../../src/users/users.service';
import { SchedulesService } from '../../src/schedules/schedules.service';
import { MessageFormatter } from '../../src/shared/utils/message-formatter';
import { CommandContext } from '../../src/bot/commands/command.types';
import { User } from '../../src/users/entities/user.entity';
import { Schedule } from '../../src/schedules/entities/schedule.entity';

describe('SapToiCommand', () => {
  let command: SapToiCommand;
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

  const mockSchedule: Schedule = {
    id: 1,
    user_id: 'user123',
    item_type: 'task',
    title: 'Upcoming Task',
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
  } as any;

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
    mockSchedulesService = { findUpcoming: jest.fn() } as any;
    mockFormatter = {
      formatNotInitialized: jest.fn(),
      formatScheduleDigest: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SapToiCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<SapToiCommand>(SapToiCommand);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('sap-toi');
      expect(command.aliases).toEqual(['saptoi', 'next']);
      expect(command.category).toBe('📅 XEM LỊCH');
      expect(command.syntax).toBe('sap-toi [số_lượng]');
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

      expect(mockFormatter.formatNotInitialized).toHaveBeenCalledWith('*');
      expect(ctx.reply).toHaveBeenCalledWith('NOT_INIT');
      expect(mockSchedulesService.findUpcoming).not.toHaveBeenCalled();
    });

    it('should use default limit 5 when no arg given', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findUpcoming.mockResolvedValue([mockSchedule]);
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST');
      const ctx = buildContext();

      await command.execute(ctx);

      expect(mockSchedulesService.findUpcoming).toHaveBeenCalledWith(
        'user123',
        expect.any(Date),
        5,
      );
      expect(mockFormatter.formatScheduleDigest).toHaveBeenCalledWith(
        [mockSchedule],
        'Lịch sắp tới',
        expect.objectContaining({ emptyMessage: expect.any(String) }),
      );
      expect(ctx.reply).toHaveBeenCalledWith('DIGEST');
    });

    it('should honor custom limit', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findUpcoming.mockResolvedValue([]);
      mockFormatter.formatScheduleDigest.mockReturnValue('EMPTY');
      const ctx = buildContext(['7']);

      await command.execute(ctx);

      expect(mockSchedulesService.findUpcoming).toHaveBeenCalledWith(
        'user123',
        expect.any(Date),
        7,
      );
    });

    it('should reject non-numeric limit', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['abc']);

      await command.execute(ctx);

      expect(mockSchedulesService.findUpcoming).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Số lượng không hợp lệ'),
      );
    });

    it('should reject zero and negative limits', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['0']);

      await command.execute(ctx);

      expect(mockSchedulesService.findUpcoming).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Số lượng không hợp lệ'),
      );
    });

    it('should reject limit above MAX_LIMIT (20)', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      const ctx = buildContext(['21']);

      await command.execute(ctx);

      expect(mockSchedulesService.findUpcoming).not.toHaveBeenCalled();
      expect(ctx.reply).toHaveBeenCalledWith(
        expect.stringContaining('Số lượng không hợp lệ'),
      );
    });

    it('should render empty message when no upcoming schedules', async () => {
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findUpcoming.mockResolvedValue([]);
      mockFormatter.formatScheduleDigest.mockReturnValue('DIGEST_EMPTY');
      const ctx = buildContext();

      await command.execute(ctx);

      expect(mockFormatter.formatScheduleDigest).toHaveBeenCalledWith(
        [],
        'Lịch sắp tới',
        expect.objectContaining({
          emptyMessage: expect.stringContaining('pending sắp tới'),
          footer: undefined,
        }),
      );
      expect(ctx.reply).toHaveBeenCalledWith('DIGEST_EMPTY');
    });
  });
});
