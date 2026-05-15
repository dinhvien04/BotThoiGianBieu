import { Test, TestingModule } from '@nestjs/testing';
import { XoaLichCommand } from 'src/bot/commands/xoa-lich.command';
import { CommandRegistry } from 'src/bot/commands/command-registry';
import { InteractionRegistry } from 'src/bot/interactions/interaction-registry';
import { BotService } from 'src/bot/bot.service';
import { UsersService } from 'src/users/users.service';
import { SchedulesService } from 'src/schedules/schedules.service';
import { UndoService } from 'src/schedules/undo.service';
import { DateParser } from 'src/shared/utils/date-parser';
import { CommandContext } from 'src/bot/commands/command.types';
import { ButtonInteractionContext } from 'src/bot/interactions/interaction.types';
import { User } from 'src/users/entities/user.entity';
import { Schedule } from 'src/schedules/entities/schedule.entity';

describe('XoaLichCommand', () => {
  let command: XoaLichCommand;

  const mockCommandRegistry = { register: jest.fn() };
  const mockInteractionRegistry = { register: jest.fn() };
  const mockBotService = { sendInteractive: jest.fn() };
  const mockUsersService = { findByUserId: jest.fn() };
  const mockSchedulesService = {
    findById: jest.fn(),
    delete: jest.fn(),
  };
  const mockDateParser = { formatVietnam: jest.fn() };
  const mockUndoService = { record: jest.fn() };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        XoaLichCommand,
        { provide: CommandRegistry, useValue: mockCommandRegistry },
        { provide: InteractionRegistry, useValue: mockInteractionRegistry },
        { provide: BotService, useValue: mockBotService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        { provide: UndoService, useValue: mockUndoService },
        { provide: DateParser, useValue: mockDateParser },
      ],
    }).compile();

    command = module.get<XoaLichCommand>(XoaLichCommand);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(command).toBeDefined();
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('xoa-lich');
      expect(command.description).toBe('Xóa lịch');
      expect(command.category).toBe('✏️ QUẢN LÝ LỊCH');
      expect(command.syntax).toBe('xoa-lich <ID>');
      expect(command.example).toBe('xoa-lich 123');
      expect(command.interactionId).toBe('xoa-lich');
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
          content: { t: '*xoa-lich 5' },
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
      const mockUser: User = { user_id: '789' } as unknown as User;
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(null);

      await command.execute(mockContext);

      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Không tìm thấy lịch'),
      );
    });

    it('should send confirmation form for valid schedule', async () => {
      const mockUser: User = { user_id: '789' } as unknown as User;
      const mockSchedule: Schedule = {
        id: 5,
        user_id: '789',
        title: 'Test Schedule',
        item_type: 'task',
        status: 'pending',
        start_time: new Date(),
        end_time: null,
        description: 'Test',
      } as Schedule;

      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockDateParser.formatVietnam.mockReturnValue('25/04/2026 10:00');

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
        action: 'confirm:5',
        formData: {},
        clickerId: '789',
        send: jest.fn(),
        deleteForm: jest.fn(),
      } as any;
    });

    it('should handle cancel action', async () => {
      mockContext.action = 'cancel:5';

      await command.handleButton(mockContext);

      expect(mockContext.deleteForm).toHaveBeenCalled();
      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Đã hủy xóa lịch'),
      );
    });

    it('should reject if schedule not found', async () => {
      mockSchedulesService.findById.mockResolvedValue(null);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Không tìm thấy lịch'),
      );
      expect(mockSchedulesService.delete).not.toHaveBeenCalled();
    });

    it('should reject if user does not own schedule', async () => {
      const mockSchedule: Schedule = {
        id: 5,
        user_id: 'different-user',
        title: 'Test',
      } as Schedule;

      mockSchedulesService.findById.mockResolvedValue(mockSchedule);

      await command.handleButton(mockContext);

      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('không có quyền xóa'),
      );
      expect(mockSchedulesService.delete).not.toHaveBeenCalled();
    });

    it('should delete schedule successfully', async () => {
      const mockSchedule: Schedule = {
        id: 5,
        user_id: '789',
        title: 'Test Schedule',
        item_type: 'task',
        status: 'pending',
      } as Schedule;

      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.delete.mockResolvedValue(undefined);

      await command.handleButton(mockContext);

      expect(mockSchedulesService.delete).toHaveBeenCalledWith(5);
      expect(mockContext.deleteForm).toHaveBeenCalled();
      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Đã xóa lịch'),
      );
      expect(mockContext.send).toHaveBeenCalledWith(
        expect.stringContaining('Test Schedule'),
      );
    });

    it('should handle invalid action format', async () => {
      mockContext.action = 'invalid';

      await command.handleButton(mockContext);

      expect(mockSchedulesService.findById).not.toHaveBeenCalled();
      expect(mockSchedulesService.delete).not.toHaveBeenCalled();
    });

    it('should handle invalid ID in action', async () => {
      mockContext.action = 'confirm:abc';

      await command.handleButton(mockContext);

      expect(mockSchedulesService.findById).not.toHaveBeenCalled();
    });

    it('should handle form deletion errors gracefully', async () => {
      const mockSchedule: Schedule = {
        id: 5,
        user_id: '789',
        title: 'Test',
      } as Schedule;

      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.delete.mockResolvedValue(undefined);
      mockContext.deleteForm = jest.fn().mockRejectedValue(new Error('Cannot delete'));

      await command.handleButton(mockContext);

      // Should not throw error
      expect(mockSchedulesService.delete).toHaveBeenCalled();
      expect(mockContext.send).toHaveBeenCalled();
    });
  });
});

