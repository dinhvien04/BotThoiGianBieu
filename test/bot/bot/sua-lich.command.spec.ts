import { Test, TestingModule } from '@nestjs/testing';
import { SuaLichCommand } from 'src/bot/commands/sua-lich.command';
import { CommandRegistry } from 'src/bot/commands/command-registry';
import { InteractionRegistry } from 'src/bot/interactions/interaction-registry';
import { BotService } from 'src/bot/bot.service';
import { UsersService } from 'src/users/users.service';
import { SchedulesService } from 'src/schedules/schedules.service';
import { SharesService } from 'src/schedules/shares.service';
import { DateParser } from 'src/shared/utils/date-parser';
import { CommandContext } from 'src/bot/commands/command.types';
import { ButtonInteractionContext } from 'src/bot/interactions/interaction.types';
import { User } from 'src/users/entities/user.entity';
import { UserSettings } from 'src/users/entities/user-settings.entity';
import { Schedule } from 'src/schedules/entities/schedule.entity';

describe('SuaLichCommand', () => {
  let command: SuaLichCommand;

  const mockCommandRegistry = { register: jest.fn() };
  const mockInteractionRegistry = { register: jest.fn() };
  const mockBotService = { sendInteractive: jest.fn() };
  const mockUsersService = { findByUserId: jest.fn() };
  const mockSchedulesService = {
    findById: jest.fn(),
    update: jest.fn(),
  };
  const mockSharesService = {
    canEdit: jest.fn(),
  };
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
        SuaLichCommand,
        { provide: CommandRegistry, useValue: mockCommandRegistry },
        { provide: InteractionRegistry, useValue: mockInteractionRegistry },
        { provide: BotService, useValue: mockBotService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: SharesService, useValue: mockSharesService },
        { provide: DateParser, useValue: mockDateParser },
      ],
    }).compile();

    command = module.get<SuaLichCommand>(SuaLichCommand);

    jest.clearAllMocks();
    mockSharesService.canEdit.mockResolvedValue(true);
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
        ephemeralReply: jest.fn(),
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
        recurrence_type: 'none',
        recurrence_interval: 1,
        recurrence_until: null,
        priority: "normal",
        recurrence_parent_id: null,
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
      mockSharesService.canEdit.mockResolvedValue(false);

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
        start_date: 'invalid-date',
        start_time: '10:00',
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
        start_date: '2020-01-01',
        start_time: '10:00',
      };
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockDateParser.parseVietnamLocal.mockReturnValue(pastDate);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('phải ở tương lai'),
      );
    });

    it('should reject end time before start time', async () => {
      const startTime = new Date(Date.now() + 2 * 60 * 60 * 1000);
      const endTime = new Date(startTime.getTime() - 60 * 60 * 1000);

      mockContext.formData = {
        title: 'New Title',
        start_date: '2099-04-25',
        start_time: '10:00',
        end_date: '2099-04-25',
        end_time: '09:00',
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
      const newStartTime = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const mockUser: User = {
        user_id: '789',
        settings: { default_remind_minutes: 30 } as UserSettings,
      } as User;

      mockContext.formData = {
        title: 'Original Title',
        start_date: '2099-04-26',
        start_time: '10:00',
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

    it('should reject incomplete end time input', async () => {
      mockSchedule.end_time = new Date('2026-04-25T11:00');
      mockContext.formData = {
        title: 'Original Title',
        end_time: '',
      };

      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockDateParser.formatVietnam.mockReturnValue('25/04/2026 10:00');

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Thiếu ngày hoặc giờ kết thúc'),
      );
      expect(mockSchedulesService.update).not.toHaveBeenCalled();
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

    describe('recurrence', () => {
      it('should enable daily recurrence on a non-recurring schedule', async () => {
        mockContext.formData = {
          recurrence_type: 'daily',
          recurrence_interval: '1',
        };
        const updated = {
          ...mockSchedule,
          recurrence_type: 'daily',
          recurrence_interval: 1,
        };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockSchedulesService.update.mockResolvedValue(updated);
        mockDateParser.formatVietnam.mockReturnValue('25/04/2026 10:00');

        await command.handleButton(mockContext);

        expect(mockSchedulesService.update).toHaveBeenCalledWith(
          5,
          expect.objectContaining({
            recurrence_type: 'daily',
          }),
        );
        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('Hàng ngày'),
        );
      });

      it('should change recurrence interval and until on an already recurring schedule', async () => {
        mockSchedule.recurrence_type = 'weekly';
        mockSchedule.recurrence_interval = 1;
        mockSchedule.recurrence_until = null;

        const untilDate = new Date('2099-12-31T23:59');
        mockContext.formData = {
          recurrence_type: 'weekly',
          recurrence_interval: '2',
          recurrence_until: '2099-12-31',
        };
        const updated = {
          ...mockSchedule,
          recurrence_interval: 2,
          recurrence_until: untilDate,
        };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockDateParser.parseVietnamLocal.mockReturnValueOnce(untilDate);
        mockSchedulesService.update.mockResolvedValue(updated);
        mockDateParser.formatVietnam.mockReturnValue('31/12/2099');

        await command.handleButton(mockContext);

        expect(mockSchedulesService.update).toHaveBeenCalledWith(
          5,
          expect.objectContaining({
            recurrence_interval: 2,
            recurrence_until: untilDate,
          }),
        );
        // type không thay đổi → không có trong patch
        const patchArg = (mockSchedulesService.update as jest.Mock).mock.calls[0][1];
        expect(patchArg.recurrence_type).toBeUndefined();
      });

      it('should turn off recurrence when type changed to none', async () => {
        mockSchedule.recurrence_type = 'monthly';
        mockSchedule.recurrence_interval = 3;
        mockSchedule.recurrence_until = new Date('2099-12-31');

        mockContext.formData = {
          recurrence_type: 'none',
        };
        const updated = {
          ...mockSchedule,
          recurrence_type: 'none',
          recurrence_interval: 1,
          recurrence_until: null,
        };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockSchedulesService.update.mockResolvedValue(updated);

        await command.handleButton(mockContext);

        expect(mockSchedulesService.update).toHaveBeenCalledWith(
          5,
          expect.objectContaining({
            recurrence_type: 'none',
            recurrence_interval: 1,
            recurrence_until: null,
          }),
        );
        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('đã tắt'),
        );
      });

      it('should clear recurrence_until when until input is empty on recurring schedule', async () => {
        mockSchedule.recurrence_type = 'weekly';
        mockSchedule.recurrence_interval = 1;
        mockSchedule.recurrence_until = new Date('2099-12-31');

        mockContext.formData = {
          recurrence_type: 'weekly',
          recurrence_interval: '1',
          recurrence_until: '',
        };
        const updated = {
          ...mockSchedule,
          recurrence_until: null,
        };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockSchedulesService.update.mockResolvedValue(updated);

        await command.handleButton(mockContext);

        expect(mockSchedulesService.update).toHaveBeenCalledWith(
          5,
          expect.objectContaining({ recurrence_until: null }),
        );
      });

      it('should reject invalid recurrence interval', async () => {
        mockContext.formData = {
          recurrence_type: 'daily',
          recurrence_interval: '0',
        };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);

        await command.handleButton(mockContext);

        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('Khoảng lặp không hợp lệ'),
        );
        expect(mockSchedulesService.update).not.toHaveBeenCalled();
      });

      it('should reject recurrence_until before start_time', async () => {
        const beforeStart = new Date('2020-01-01');
        mockContext.formData = {
          recurrence_type: 'weekly',
          recurrence_interval: '1',
          recurrence_until: '2020-01-01',
        };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockDateParser.parseVietnamLocal.mockReturnValueOnce(beforeStart);

        await command.handleButton(mockContext);

        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('phải SAU ngày bắt đầu'),
        );
        expect(mockSchedulesService.update).not.toHaveBeenCalled();
      });

      it('should reject invalid recurrence_until format', async () => {
        mockContext.formData = {
          recurrence_type: 'weekly',
          recurrence_interval: '1',
          recurrence_until: 'garbage',
        };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);
        mockDateParser.parseVietnamLocal.mockReturnValueOnce(null);

        await command.handleButton(mockContext);

        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('Ngày dừng lặp không hợp lệ'),
        );
        expect(mockSchedulesService.update).not.toHaveBeenCalled();
      });

      it('should reject invalid recurrence_type', async () => {
        mockContext.formData = {
          recurrence_type: 'yearly',
        };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);

        await command.handleButton(mockContext);

        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('Kiểu lặp không hợp lệ'),
        );
        expect(mockSchedulesService.update).not.toHaveBeenCalled();
      });

      it('should not produce a recurrence patch when fields match current values', async () => {
        mockSchedule.recurrence_type = 'weekly';
        mockSchedule.recurrence_interval = 2;

        mockContext.formData = {
          title: 'Original Title',
          recurrence_type: 'weekly',
          recurrence_interval: '2',
        };
        mockSchedulesService.findById.mockResolvedValue(mockSchedule);

        await command.handleButton(mockContext);

        expect(mockContext.send).toHaveBeenCalledWith(
          expect.stringContaining('Không có thay đổi nào'),
        );
        expect(mockSchedulesService.update).not.toHaveBeenCalled();
      });
    });
  });
});

