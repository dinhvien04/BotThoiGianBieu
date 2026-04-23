import { Test, TestingModule } from '@nestjs/testing';
import { SuaLichCommand } from '../../src/bot/commands/sua-lich.command';
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

describe('SuaLichCommand', () => {
  let command: SuaLichCommand;
  let usersService: UsersService;
  let schedulesService: SchedulesService;
  let botService: BotService;
  let dateParser: DateParser;

  const mockCommandRegistry = { register: jest.fn() };
  const mockInteractionRegistry = { register: jest.fn() };
  const mockBotService = { sendInteractive: jest.fn() };
  const mockUsersService = { findByUserId: jest.fn() };
  const mockSchedulesService = {
    findById: jest.fn(),
    update: jest.fn(),
  };
  const mockDateParser = {
    toDatetimeLocalVietnam: jest.fn(),
    parseVietnamLocal: jest.fn(),
    formatVietnam: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SuaLichCommand,
        { provide: CommandRegistry, useValue: mockCommandRegistry },
        { provide: InteractionRegistry, useValue: mockInteractionRegistry },
        { provide: BotService, useValue: mockBotService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: DateParser, useValue: mockDateParser },
      ],
    }).compile();

    command = module.get<SuaLichCommand>(SuaLichCommand);
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
      expect(command.name).toBe('sua-lich');
      expect(command.description).toBe('Chỉnh sửa lịch');
      expect(command.category).toBe('✏️ QUẢN LÝ LỊCH');
      expect(command.syntax).toBe('sua-lich <ID>');
      expect(command.example).toBe('sua-lich 123');
      expect(command.interactionId).toBe('sua-lich');
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
          content: { t: '*sua-lich 5' },
        },
        args: ['5'],
        rawArgs: '5',
        prefix: '*',
        reply: jest.fn(),
        send: jest.fn(),
        sendDM: jest.fn(),
      };
    });

    it('should reject if no ID provided', async () => {
      mockContext.args = [];

      await command.execute(mockContext);

      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Cú pháp'),
      );
    });

    it('should reject if invalid ID format', async () => {
      mockContext.args = ['abc'];

      await command.execute(mockContext);

      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Cú pháp'),
      );
    });

    it('should reject if user not initialized', async () => {
      mockUsersService.findByUserId.mockResolvedValue(null);

      await command.execute(mockContext);

      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('chưa khởi tạo tài khoản'),
      );
    });

    it('should reject if schedule not found', async () => {
      const mockUser: User = { user_id: '789' } as User;
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(null);

      await command.execute(mockContext);

      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Không tìm thấy lịch'),
      );
    });

    it('should send edit form for valid schedule', async () => {
      const mockUser: User = { user_id: '789' } as User;
      const mockSchedule: Schedule = {
        id: 5,
        user_id: '789',
        title: 'Test Schedule',
        item_type: 'task',
        status: 'pending',
        start_time: new Date('2026-04-25T10:00'),
        end_time: null,
        description: 'Test',
      } as Schedule;

      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockDateParser.toDatetimeLocalVietnam.mockReturnValue('2026-04-25T10:00');

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
    let mockSchedule: Schedule;

    beforeEach(() => {
      mockContext = {
        action: 'confirm:5',
        formData: {},
        clickerId: '789',
        send: jest.fn(),
        deleteForm: jest.fn(),
      } as any;

      mockSchedule = {
        id: 5,
        user_id: '789',
        title: 'Original Title',
        description: 'Original Description',
        item_type: 'task',
        start_time: new Date('2026-04-25T10:00'),
        end_time: null,
        status: 'pending',
      } as Schedule;
    });

    it('should handle cancel action', async () => {
      mockContext.action = 'cancel:5';

      await command.handleButton(mockContext);

      expect(mockContext.deleteForm).toHaveBeenCalled();
      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Đã hủy sửa lịch'),
      );
    });

    it('should reject if schedule not found', async () => {
      mockSchedulesService.findById.mockResolvedValue(null);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Không tìm thấy lịch'),
      );
      expect(mockSchedulesService.update).not.toHaveBeenCalled();
    });

    it('should reject if user does not own schedule', async () => {
      mockSchedule.user_id = 'different-user';
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('không có quyền sửa'),
      );
      expect(mockSchedulesService.update).not.toHaveBeenCalled();
    });

    it('should reject if title is empty', async () => {
      mockContext.formData = { title: '' };
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Thiếu tiêu đề'),
      );
      expect(mockSchedulesService.update).not.toHaveBeenCalled();
    });

    it('should reject invalid item type', async () => {
      mockContext.formData = {
        title: 'New Title',
        item_type: 'invalid_type',
      };
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Loại lịch không hợp lệ'),
      );
    });

    it('should reject invalid start time', async () => {
      mockContext.formData = {
        title: 'New Title',
        start_time: 'invalid-date',
      };
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockDateParser.parseVietnamLocal.mockReturnValue(null);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Thời gian bắt đầu không hợp lệ'),
      );
    });

    it('should reject past start time', async () => {
      const pastDate = new Date(Date.now() - 1000);
      mockContext.formData = {
        title: 'New Title',
        start_time: '2020-01-01T10:00',
      };
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockDateParser.parseVietnamLocal.mockReturnValue(pastDate);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('phải ở tương lai'),
      );
    });

    it('should reject end time before start time', async () => {
      const startTime = new Date('2026-04-25T10:00');
      const endTime = new Date('2026-04-25T09:00');

      mockContext.formData = {
        title: 'New Title',
        start_time: '2026-04-25T10:00',
        end_time: '2026-04-25T09:00',
      };
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockDateParser.parseVietnamLocal
        .mockReturnValueOnce(startTime)
        .mockReturnValueOnce(endTime);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('phải sau thời gian bắt đầu'),
      );
    });

    it('should handle no changes', async () => {
      mockContext.formData = {
        title: 'Original Title',
        description: 'Original Description',
        item_type: 'task',
      };
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Không có thay đổi nào'),
      );
      expect(mockSchedulesService.update).not.toHaveBeenCalled();
    });

    it('should update title successfully', async () => {
      const updatedSchedule = { ...mockSchedule, title: 'New Title' };
      mockContext.formData = { title: 'New Title' };

      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.update.mockResolvedValue(updatedSchedule);
      mockDateParser.formatVietnam.mockReturnValue('25/04/2026 10:00');

      await command.handleButton(mockContext);

      expect(mockSchedulesService.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({ title: 'New Title' }),
      );
      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('ĐÃ CẬP NHẬT LỊCH'),
      );
    });

    it('should update start time and recalculate remind_at', async () => {
      const newStartTime = new Date('2026-04-26T10:00');
      const mockUser: User = {
        user_id: '789',
        settings: { default_remind_minutes: 30 } as UserSettings,
      } as User;

      mockContext.formData = {
        title: 'Original Title',
        start_time: '2026-04-26T10:00',
      };

      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockDateParser.parseVietnamLocal.mockReturnValue(newStartTime);
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.update.mockResolvedValue({
        ...mockSchedule,
        start_time: newStartTime,
      });
      mockDateParser.formatVietnam.mockReturnValue('26/04/2026 10:00');

      await command.handleButton(mockContext);

      expect(mockSchedulesService.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          start_time: newStartTime,
          remind_at: expect.any(Date),
          acknowledged_at: null,
          is_reminded: false,
        }),
      );
    });

    it('should remove end_time when set to empty', async () => {
      mockSchedule.end_time = new Date('2026-04-25T11:00');
      mockContext.formData = {
        title: 'Original Title',
        end_time: '',
      };

      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.update.mockResolvedValue({
        ...mockSchedule,
        end_time: null,
      });
      mockDateParser.formatVietnam.mockReturnValue('25/04/2026 10:00');

      await command.handleButton(mockContext);

      expect(mockSchedulesService.update).toHaveBeenCalledWith(
        5,
        expect.objectContaining({
          end_time: null,
          end_notified_at: null,
        }),
      );
    });

    it('should handle update failure', async () => {
      mockContext.formData = { title: 'New Title' };

      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.update.mockResolvedValue(null);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Lỗi khi cập nhật lịch'),
      );
    });
  });
});
