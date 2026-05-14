import { Test, TestingModule } from '@nestjs/testing';
import { HoanThanhCommand } from 'src/bot/commands/hoan-thanh.command';
import { CommandRegistry } from 'src/bot/commands/command-registry';
import { UsersService } from 'src/users/users.service';
import { SchedulesService } from 'src/schedules/schedules.service';
import { SharesService } from 'src/schedules/shares.service';
import { UndoService } from 'src/schedules/undo.service';
import { DateParser } from 'src/shared/utils/date-parser';
import { CommandContext } from 'src/bot/commands/command.types';
import { User } from 'src/users/entities/user.entity';
import { Schedule } from 'src/schedules/entities/schedule.entity';

describe('HoanThanhCommand', () => {
  let command: HoanThanhCommand;
  let mockRegistry: jest.Mocked<CommandRegistry>;
  let mockUsersService: jest.Mocked<UsersService>;
  let mockSchedulesService: jest.Mocked<SchedulesService>;
  let mockDateParser: jest.Mocked<DateParser>;

  const mockUser: User = {
    user_id: 'user123',
    username: 'testuser',
  } as any;

  const mockSchedule: Schedule = {
    id: 1,
    user_id: 'user123',
    title: 'Test Task',
    start_time: new Date('2026-04-24T10:00:00Z'),
    end_time: new Date('2026-04-24T11:00:00Z'),
    status: 'pending',
  } as any;

  beforeEach(async () => {
    mockRegistry = { register: jest.fn() } as any;
    mockUsersService = { findByUserId: jest.fn() } as any;
    mockSchedulesService = {
      findById: jest.fn(),
      markCompleted: jest.fn(),
      spawnNextIfRecurring: jest.fn().mockResolvedValue(null),
    } as any;
    mockDateParser = {
      formatMinutes: jest.fn((min) => `${Math.abs(min)} phút`),
      formatVietnam: jest.fn((d: Date) => d.toISOString()),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HoanThanhCommand,
        { provide: CommandRegistry, useValue: mockRegistry },
        { provide: UsersService, useValue: mockUsersService },
        { provide: SchedulesService, useValue: mockSchedulesService },
        {
          provide: SharesService,
          useValue: { canEdit: jest.fn().mockResolvedValue(true) } as any,
        },
        { provide: UndoService, useValue: { record: jest.fn() } as any },
        { provide: DateParser, useValue: mockDateParser },
      ],
    }).compile();

    command = module.get<HoanThanhCommand>(HoanThanhCommand);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('metadata', () => {
    it('should have correct command metadata', () => {
      expect(command.name).toBe('hoan-thanh');
      expect(command.description).toBe('Đánh dấu hoàn thành công việc');
      expect(command.category).toBe('✏️ QUẢN LÝ LỊCH');
      expect(command.syntax).toBe('hoan-thanh <ID>');
      expect(command.example).toBe('hoan-thanh 123');
    });
  });

  describe('execute', () => {
    let mockContext: CommandContext;

    beforeEach(() => {
      mockContext = {
        message: {
          message_id: 'msg123',
          channel_id: 'channel123',
          sender_id: 'user123',
        },
        rawArgs: '1',
        prefix: '*',
        args: ['1'],
        reply: jest.fn(),
      } as any;
    });

    it('should show syntax error when no ID provided', async () => {
      // Arrange
      mockContext.args = [];

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Cú pháp'),
      );
    });

    it('should show syntax error for invalid ID', async () => {
      // Arrange
      mockContext.args = ['abc'];

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Cú pháp'),
      );
    });

    it('should show not initialized when user not found', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(null);

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('chưa khởi tạo'),
      );
    });

    it('should show error when schedule not found', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(null);

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.findById).toHaveBeenCalledWith(1);
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Không tìm thấy'),
      );
    });

    it('should show message when schedule already completed', async () => {
      // Arrange
      const completedSchedule = { ...mockSchedule, status: 'completed' };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(completedSchedule as any);

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('đã hoàn thành từ trước'),
      );
      expect(mockSchedulesService.markCompleted).not.toHaveBeenCalled();
    });

    it('should reject cancelled schedule', async () => {
      // Arrange
      const cancelledSchedule = { ...mockSchedule, status: 'cancelled' };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(cancelledSchedule as any);

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('đã bị hủy'),
      );
      expect(mockSchedulesService.markCompleted).not.toHaveBeenCalled();
    });

    it('should mark schedule as completed successfully', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.markCompleted).toHaveBeenCalledWith(
        1,
        expect.any(Date),
      );
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('ĐÃ HOÀN THÀNH'),
      );
    });

    it('should spawn next instance and mention it when recurring', async () => {
      const recurring = {
        ...mockSchedule,
        recurrence_type: 'weekly',
        recurrence_interval: 1,
      } as any;
      const next = {
        id: 2,
        start_time: new Date('2026-05-01T10:00:00Z'),
      };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(recurring);
      mockSchedulesService.markCompleted.mockResolvedValue();
      mockSchedulesService.spawnNextIfRecurring.mockResolvedValue(next as any);

      await command.execute(mockContext);

      expect(mockSchedulesService.spawnNextIfRecurring).toHaveBeenCalledWith(
        recurring,
        expect.any(Date),
      );
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('lịch lặp kế tiếp'),
      );
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('#2'),
      );
    });

    it('should include schedule title in success message', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Test Task'),
      );
    });

    it('should show timing note for early completion', async () => {
      // Arrange
      const futureSchedule = {
        ...mockSchedule,
        end_time: new Date(Date.now() + 3600000), // 1 hour in future
      };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(futureSchedule as any);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Sớm hơn'),
      );
    });

    it('should show timing note for late completion', async () => {
      // Arrange
      const pastSchedule = {
        ...mockSchedule,
        end_time: new Date(Date.now() - 3600000), // 1 hour in past
      };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(pastSchedule as any);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Trễ'),
      );
    });

    it('should handle schedule without end_time', async () => {
      // Arrange
      const noEndSchedule = { ...mockSchedule, end_time: null };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(noEndSchedule as any);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.markCompleted).toHaveBeenCalled();
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('ĐÃ HOÀN THÀNH'),
      );
    });

    it('should handle zero ID', async () => {
      // Arrange
      mockContext.args = ['0'];

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Cú pháp'),
      );
    });

    it('should handle negative ID', async () => {
      // Arrange
      mockContext.args = ['-1'];

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Cú pháp'),
      );
    });

    it('should handle very large ID', async () => {
      // Arrange
      mockContext.args = ['999999999'];
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(null);

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.findById).toHaveBeenCalledWith(999999999);
    });

    it('should handle decimal ID', async () => {
      // Arrange
      mockContext.args = ['1.5'];

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Cú pháp'),
      );
    });

    it('should handle ID with spaces', async () => {
      // Arrange
      mockContext.args = [' 1 '];

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Cú pháp'),
      );
    });

    it('should handle multiple arguments', async () => {
      // Arrange
      mockContext.args = ['1', 'extra'];

      // Act
      await command.execute(mockContext);

      // Assert
      // Should still work with first arg
      expect(mockUsersService.findByUserId).toHaveBeenCalled();
    });

    it('should handle service error during findById', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockRejectedValue(new Error('DB error'));

      // Act & Assert
      await expect(command.execute(mockContext)).rejects.toThrow('DB error');
    });

    it('should handle service error during markCompleted', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.markCompleted.mockRejectedValue(new Error('Update failed'));

      // Act & Assert
      await expect(command.execute(mockContext)).rejects.toThrow('Update failed');
    });

    it('should show congratulations message', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Làm tốt lắm'),
      );
    });

    it('should include schedule ID in message', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('#1'),
      );
    });

    it('should work with different user IDs', async () => {
      // Arrange
      const user2 = { ...mockUser, user_id: 'user456' };
      mockContext.message.sender_id = 'user456';
      mockUsersService.findByUserId.mockResolvedValue(user2);
      mockSchedulesService.findById.mockResolvedValue({ ...mockSchedule, user_id: 'user456' } as any);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockUsersService.findByUserId).toHaveBeenCalledWith('user456');
      expect(mockSchedulesService.findById).toHaveBeenCalledWith(1);
    });

    it('should handle schedule with very long title', async () => {
      // Arrange
      const longTitle = 'A'.repeat(500);
      const longSchedule = { ...mockSchedule, title: longTitle };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(longSchedule as any);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining(longTitle),
      );
    });

    it('should handle schedule with special characters in title', async () => {
      // Arrange
      const specialSchedule = {
        ...mockSchedule,
        title: '🎉 Test @#$%^&* <script>',
      };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(specialSchedule as any);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.markCompleted).toHaveBeenCalled();
    });

    it('should handle completion exactly at end_time', async () => {
      // Arrange
      const now = new Date();
      const exactSchedule = {
        ...mockSchedule,
        end_time: now,
      };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(exactSchedule as any);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('đúng giờ'),
      );
    });

    it('should handle completion way before start_time', async () => {
      // Arrange
      const futureSchedule = {
        ...mockSchedule,
        start_time: new Date(Date.now() + 86400000), // 1 day in future
        end_time: null,
      };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(futureSchedule as any);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('trước cả giờ bắt đầu'),
      );
    });

    it('should handle completion way after end_time', async () => {
      // Arrange
      const pastSchedule = {
        ...mockSchedule,
        end_time: new Date(Date.now() - 86400000), // 1 day in past
      };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(pastSchedule as any);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockContext.reply).toHaveBeenCalledWith(
        expect.stringContaining('Trễ'),
      );
    });

    it('should call dateParser.formatMinutes for timing', async () => {
      // Arrange
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(mockSchedule);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockDateParser.formatMinutes).toHaveBeenCalled();
    });

    it('should handle different schedule item types', async () => {
      // Arrange
      const meeting = { ...mockSchedule, item_type: 'meeting' };
      mockUsersService.findByUserId.mockResolvedValue(mockUser);
      mockSchedulesService.findById.mockResolvedValue(meeting as any);
      mockSchedulesService.markCompleted.mockResolvedValue();

      // Act
      await command.execute(mockContext);

      // Assert
      expect(mockSchedulesService.markCompleted).toHaveBeenCalled();
    });
  });
});
