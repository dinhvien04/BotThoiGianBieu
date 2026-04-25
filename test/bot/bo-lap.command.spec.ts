import { Test, TestingModule } from '@nestjs/testing';
import { BoLapCommand } from '../../src/bot/commands/bo-lap.command';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { UsersService } from '../../src/users/users.service';
import { SchedulesService } from '../../src/schedules/schedules.service';
import { MessageFormatter } from '../../src/shared/utils/message-formatter';
import { CommandContext } from '../../src/bot/commands/command.types';
import { User } from '../../src/users/entities/user.entity';
import { Schedule } from '../../src/schedules/entities/schedule.entity';

describe('BoLapCommand', () => {
  let command: BoLapCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockFormatter: jest.Mocked<MessageFormatter>;

  const mockUser: User = { user_id: 'user123' } as any;

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
      recurrence_type: 'weekly',
      recurrence_interval: 1,
      recurrence_until: null,
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
      clearRecurrence: jest.fn(),
    } as any;
    mockFormatter = { formatNotInitialized: jest.fn(() => 'NOT_INIT') } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoLapCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: MessageFormatter, useValue: mockFormatter },
      ],
    }).compile();

    command = module.get<BoLapCommand>(BoLapCommand);
  });

  afterEach(() => jest.clearAllMocks());

  it('should expose metadata', () => {
    expect(command.name).toBe('bo-lap');
    expect(command.aliases).toEqual(['bolap', 'unrepeat']);
  });

  it('should register itself on module init', () => {
    command.onModuleInit();
    expect(mockRegistry.register).toHaveBeenCalledWith(command);
  });

  it('should warn when user not initialized', async () => {
    mockUsersService.findByUserId.mockResolvedValue(null);
    const ctx = buildContext(['5']);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith('NOT_INIT');
  });

  it('should warn when args count != 1', async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext([]);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Sai cú pháp'));
  });

  it('should warn on invalid ID', async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    const ctx = buildContext(['abc']);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('ID không hợp lệ'));
  });

  it('should warn when schedule not found', async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(null);
    const ctx = buildContext(['5']);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('Không tìm thấy'));
    expect(mockSchedulesService.clearRecurrence).not.toHaveBeenCalled();
  });

  it('should inform when already not recurring', async () => {
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(
      makeSchedule({ recurrence_type: 'none' }),
    );
    const ctx = buildContext(['5']);
    await command.execute(ctx);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('không đang lặp'),
    );
    expect(mockSchedulesService.clearRecurrence).not.toHaveBeenCalled();
  });

  it('should clear recurrence and reply success with previous rule', async () => {
    const schedule = makeSchedule({
      recurrence_type: 'weekly',
      recurrence_interval: 2,
    });
    mockUsersService.findByUserId.mockResolvedValue(mockUser);
    mockSchedulesService.findById.mockResolvedValue(schedule);
    mockSchedulesService.clearRecurrence.mockResolvedValue({
      ...schedule,
      recurrence_type: 'none',
      recurrence_interval: 1,
    });

    const ctx = buildContext(['5']);
    await command.execute(ctx);

    expect(mockSchedulesService.clearRecurrence).toHaveBeenCalledWith(5);
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Mỗi 2 tuần'),
    );
    expect(ctx.reply).toHaveBeenCalledWith(
      expect.stringContaining('Đã tắt lặp'),
    );
  });
});
