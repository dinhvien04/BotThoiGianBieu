import { Test, TestingModule } from '@nestjs/testing';
import { ThemLichCommand } from '../../src/bot/commands/them-lich.command';
import { CommandRegistry } from '../../src/bot/commands/command-registry';
import { InteractionRegistry } from '../../src/bot/interactions/interaction-registry';
import { BotService } from '../../src/bot/bot.service';
import { UsersService } from '../../src/users/users.service';
import { SchedulesService } from '../../src/schedules/schedules.service';
import { DateParser } from '../../src/shared/utils/date-parser';
import { CommandContext } from '../../src/bot/commands/command.types';
import { ButtonInteractionContext } from '../../src/bot/interactions/interaction.types';
import { User } from '../../src/users/entities/user.entity';
import { UserSettings } from '../../src/users/entities/user-settings.entity';
import { Schedule } from '../../src/schedules/entities/schedule.entity';

describe('ThemLichCommand', () => {
  let command: ThemLichCommand;
  let usersService: UsersService;
  let schedulesService: SchedulesService;
  let botService: BotService;
  let dateParser: DateParser;

  const mockCommandRegistry = { register: jest.fn() };
  const mockInteractionRegistry = { register: jest.fn() };
  const mockBotService = { sendInteractive: jest.fn() };
  const mockUsersService = { findByUserId: jest.fn() };
  const mockSchedulesService = { create: jest.fn() };
  const mockDateParser = {
    toDatetimeLocalVietnam: jest.fn(),
    toDateInputVietnam: jest.fn(),
    formatVietnamTime: jest.fn(),
    parseVietnamLocal: jest.fn(),
    formatVietnam: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ThemLichCommand,
        { provide: CommandRegistry, useValue: mockCommandRegistry },
        { provide: InteractionRegistry, useValue: mockInteractionRegistry },
        { provide: BotService, useValue: mockBotService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: DateParser, useValue: mockDateParser },
      ],
    }).compile();

    command = module.get<ThemLichCommand>(ThemLichCommand);
    usersService = module.get<UsersService>(UsersService);
    schedulesService = module.get<SchedulesService>(SchedulesService);
    botService = module.get<BotService>(BotService);
    dateParser = module.get<DateParser>(DateParser);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(command).toBeDefined();
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('them-lich');
      expect(command.description).toBe('Thêm lịch mới');
      expect(command.category).toBe('✏️ QUẢN LÝ LỊCH');
      expect(command.syntax).toBe('them-lich');
      expect(command.interactionId).toBe('them-lich');
    });
  });

  describe('onModuleInit', () => {
    it('should register in both registries', () => {
      command.onModuleInit();
      expect(mockCommandRegistry.register).toHaveBeenCalledWith(command);
      expect(mockInteractionRegistry.register).toHaveBeenCalledWith(command);
    });
  });

  describe('execute - text command', () => {
    let mockContext: CommandContext;

    beforeEach(() => {
      mockContext = {
        message: {
          message_id: '123',
          channel_id: '456',
          sender_id: '789',
          content: { t: '*them-lich' },
        },
        args: [],
        rawArgs: '',
        prefix: '*',
        reply: jest.fn(),
        send: jest.fn(),
        sendDM: jest.fn(),
        ephemeralReply: jest.fn(),
      };
    });

    it('should reject if user not initialized', async () => {
      mockUsersService.findByUserId.mockResolvedValue(null);

      await command.execute(mockContext);

      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('chưa khởi tạo tài khoản'),
      );
      expect(mockBotService.sendInteractive).not.toHaveBeenCalled();
    });

    it('should send interactive form for initialized user', async () => {
      const mockUser: User = {
        user_id: '789',
        username: 'testuser',
        display_name: 'Test User',
        created_at: new Date(),
        updated_at: new Date(),
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_until: null,
    recurrence_parent_id: null,
      } as User;

      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockDateParser.toDateInputVietnam.mockReturnValue('2026-04-25');
      mockDateParser.formatVietnamTime.mockReturnValue('10:00');

      await command.execute(mockContext);

      expect(mockBotService.sendInteractive).toHaveBeenCalledWith(
        '456',
        expect.any(Object),
        expect.any(Object),
      );
    });
  });

  describe('handleButton - interaction', () => {
    let mockContext: ButtonInteractionContext;

    beforeEach(() => {
      mockContext = {
        action: 'confirm',
        formData: {},
        clickerId: '789',
        send: jest.fn(),
        deleteForm: jest.fn(),
      } as any;
    });

    it('should handle cancel action', async () => {
      mockContext.action = 'cancel';

      await command.handleButton(mockContext);

      expect(mockContext.deleteForm).toHaveBeenCalled();
      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Đã hủy'),
      );
    });

    it('should validate required title', async () => {
      mockContext.formData = {
        title: '',
        item_type: 'task',
        start_date: '2026-04-25',
        start_time: '10:00',
        end_date: '2026-04-25',
        end_time: '11:00',
      };

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Thiếu tiêu đề'),
      );
      expect(mockSchedulesService.create).not.toHaveBeenCalled();
    });

    it('should validate invalid item type', async () => {
      mockContext.formData = {
        title: 'Test',
        item_type: 'invalid_type',
        start_date: '2026-04-25',
        start_time: '10:00',
        end_date: '2026-04-25',
        end_time: '11:00',
      };

      mockDateParser.parseVietnamLocal.mockReturnValue(new Date('2026-04-25T10:00'));

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Loại lịch không hợp lệ'),
      );
    });

    it('should validate invalid start time', async () => {
      mockContext.formData = {
        title: 'Test',
        item_type: 'task',
        start_date: 'invalid-date',
        start_time: '10:00',
        end_date: '2026-04-25',
        end_time: '11:00',
      };

      mockDateParser.parseVietnamLocal.mockReturnValue(null);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Thời gian bắt đầu không hợp lệ'),
      );
    });

    it('should validate start time must be in future', async () => {
      const pastDate = new Date(Date.now() - 1000);
      mockContext.formData = {
        title: 'Test',
        item_type: 'task',
        start_date: '2020-01-01',
        start_time: '10:00',
        end_date: '2020-01-01',
        end_time: '11:00',
      };

      mockDateParser.parseVietnamLocal.mockReturnValue(pastDate);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('phải ở tương lai'),
      );
    });

    it('should validate end time must be after start time', async () => {
      const startTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() - 60 * 60 * 1000); // Before start

      mockContext.formData = {
        title: 'Test',
        item_type: 'task',
        start_date: '2026-04-25',
        start_time: '10:00',
        end_date: '2026-04-25',
        end_time: '09:00',
      };

      mockDateParser.parseVietnamLocal
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('phải sau thời gian bắt đầu'),
      );
    });

    it('should create schedule successfully', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      const mockUser: User = {
        user_id: '789',
        settings: {
          default_remind_minutes: 30,
        } as UserSettings,
      } as User;

      const mockSchedule: Schedule = {
        id: 1,
        user_id: '789',
        item_type: 'task',
        title: 'Test Schedule',
        description: 'Test description',
        start_time: startTime,
        end_time: endTime,
        status: 'pending',
        remind_at: new Date(startTime.getTime() - 30 * 60 * 1000),
        is_reminded: false,
        created_at: new Date(),
        updated_at: new Date(),
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_until: null,
    recurrence_parent_id: null,
      } as Schedule;

      mockContext.formData = {
        title: 'Test Schedule',
        description: 'Test description',
        item_type: 'task',
        start_date: '2099-04-25',
        start_time: '10:00',
        end_date: '2099-04-25',
        end_time: '11:00',
      };

      mockDateParser.parseVietnamLocal
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.create.mockResolvedValue(mockSchedule);
      mockDateParser.formatVietnam.mockReturnValue('25/04/2026 10:00');

      await command.handleButton(mockContext);

      expect(mockSchedulesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: '789',
          item_type: 'task',
          title: 'Test Schedule',
          description: 'Test description',
          start_time: startTime,
        }),
      );

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('ĐÃ THÊM LỊCH THÀNH CÔNG'),
      );
    });

    it('should handle user not initialized during button click', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      mockContext.formData = {
        title: 'Test',
        item_type: 'task',
        start_date: '2099-04-25',
        start_time: '10:00',
        end_date: '2099-04-25',
        end_time: '11:00',
      };

      mockDateParser.parseVietnamLocal
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      mockUsersService.findByUserId.mockResolvedValue(null);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('chưa khởi tạo tài khoản'),
      );
      expect(mockSchedulesService.create).not.toHaveBeenCalled();
    });

    it('should create recurring schedule with daily type and default interval', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      const mockUser: User = {
        user_id: '789',
        settings: { default_remind_minutes: 30 } as UserSettings,
      } as User;
      const mockSchedule: Schedule = {
        id: 1,
        user_id: '789',
        item_type: 'task',
        title: 'Daily Standup',
        start_time: startTime,
        end_time: endTime,
      } as Schedule;

      mockContext.formData = {
        title: 'Daily Standup',
        item_type: 'task',
        start_date: '2099-04-25',
        start_time: '10:00',
        end_date: '2099-04-25',
        end_time: '11:00',
        recurrence_type: 'daily',
        recurrence_interval: '1',
      };

      mockDateParser.parseVietnamLocal
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.create.mockResolvedValue(mockSchedule);
      mockDateParser.formatVietnam.mockReturnValue('25/04/2099 10:00');

      await command.handleButton(mockContext);

      expect(mockSchedulesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence_type: 'daily',
          recurrence_interval: 1,
          recurrence_until: null,
        }),
      );
      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('🔁'),
      );
    });

    it('should create recurring schedule with weekly + interval + until', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      const untilDate = new Date(startTime.getTime() + 30 * 24 * 60 * 60 * 1000);
      const mockUser: User = {
        user_id: '789',
        settings: { default_remind_minutes: 30 } as UserSettings,
      } as User;
      const mockSchedule: Schedule = {
        id: 1,
        user_id: '789',
        item_type: 'meeting',
        title: 'Weekly Sync',
        start_time: startTime,
        end_time: endTime,
      } as Schedule;

      mockContext.formData = {
        title: 'Weekly Sync',
        item_type: 'meeting',
        start_date: '2099-04-25',
        start_time: '10:00',
        end_date: '2099-04-25',
        end_time: '11:00',
        recurrence_type: 'weekly',
        recurrence_interval: '2',
        recurrence_until: '2099-05-25',
      };

      mockDateParser.parseVietnamLocal
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime)
        .mockReturnValueOnce(untilDate);
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.create.mockResolvedValue(mockSchedule);
      mockDateParser.formatVietnam.mockReturnValue('25/04/2099 10:00');

      await command.handleButton(mockContext);

      expect(mockSchedulesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          recurrence_type: 'weekly',
          recurrence_interval: 2,
          recurrence_until: untilDate,
        }),
      );
    });

    it('should reject invalid recurrence interval', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      mockContext.formData = {
        title: 'Bad',
        item_type: 'task',
        start_date: '2099-04-25',
        start_time: '10:00',
        end_date: '2099-04-25',
        end_time: '11:00',
        recurrence_type: 'daily',
        recurrence_interval: '0',
      };

      mockDateParser.parseVietnamLocal
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Khoảng lặp không hợp lệ'),
      );
      expect(mockSchedulesService.create).not.toHaveBeenCalled();
    });

    it('should reject recurrence until before start_time', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      const beforeStart = new Date(startTime.getTime() - 60 * 60 * 1000);

      mockContext.formData = {
        title: 'Bad',
        item_type: 'task',
        start_date: '2099-04-25',
        start_time: '10:00',
        end_date: '2099-04-25',
        end_time: '11:00',
        recurrence_type: 'weekly',
        recurrence_interval: '1',
        recurrence_until: '2000-01-01',
      };

      mockDateParser.parseVietnamLocal
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime)
        .mockReturnValueOnce(beforeStart);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('phải SAU ngày bắt đầu'),
      );
      expect(mockSchedulesService.create).not.toHaveBeenCalled();
    });

    it('should reject invalid recurrence_until date format', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      mockContext.formData = {
        title: 'Bad',
        item_type: 'task',
        start_date: '2099-04-25',
        start_time: '10:00',
        end_date: '2099-04-25',
        end_time: '11:00',
        recurrence_type: 'monthly',
        recurrence_interval: '1',
        recurrence_until: 'garbage',
      };

      mockDateParser.parseVietnamLocal
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime)
        .mockReturnValueOnce(null);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Ngày dừng lặp không hợp lệ'),
      );
      expect(mockSchedulesService.create).not.toHaveBeenCalled();
    });

    it('should reject invalid recurrence_type value', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);

      mockContext.formData = {
        title: 'Bad',
        item_type: 'task',
        start_date: '2099-04-25',
        start_time: '10:00',
        end_date: '2099-04-25',
        end_time: '11:00',
        recurrence_type: 'yearly',
      };

      mockDateParser.parseVietnamLocal
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Kiểu lặp không hợp lệ'),
      );
      expect(mockSchedulesService.create).not.toHaveBeenCalled();
    });

    it('should create schedule with end time', async () => {
      const startTime = new Date(Date.now() + 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
      const mockUser: User = {
        user_id: '789',
        settings: { default_remind_minutes: 30 } as UserSettings,
      } as User;

      const mockSchedule: Schedule = {
        id: 1,
        user_id: '789',
        item_type: 'meeting',
        title: 'Test Meeting',
        start_time: startTime,
        end_time: endTime,
      } as Schedule;

      mockContext.formData = {
        title: 'Test Meeting',
        item_type: 'meeting',
        start_date: '2026-04-25',
        start_time: '10:00',
        end_date: '2026-04-25',
        end_time: '11:00',
      };

      mockDateParser.parseVietnamLocal
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.create.mockResolvedValue(mockSchedule);
      mockDateParser.formatVietnam.mockReturnValue('25/04/2026 10:00');

      await command.handleButton(mockContext);

      expect(mockSchedulesService.create).toHaveBeenCalledWith(
        expect.objectContaining({
          end_time: endTime,
        }),
      );
    });
  });
});

