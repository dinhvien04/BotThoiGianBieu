import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, IsNull } from 'typeorm';
import { SchedulesService, CreateScheduleInput, UpdateSchedulePatch } from '../../src/schedules/schedules.service';
import { Schedule, ScheduleStatus, ScheduleItemType } from '../../src/schedules/entities/schedule.entity';

describe('SchedulesService', () => {
  let service: SchedulesService;
  let mockRepository: jest.Mocked<Repository<Schedule>>;

  const mockSchedule: Schedule = {
    id: 1,
    user_id: 'user123',
    item_type: 'task',
    title: 'Test Task',
    description: 'Test Description',
    start_time: new Date('2026-04-23T10:00:00Z'),
    end_time: new Date('2026-04-23T11:00:00Z'),
    status: 'pending',
    remind_at: new Date('2026-04-23T09:45:00Z'),
    is_reminded: false,
    acknowledged_at: null,
    end_notified_at: null,
    created_at: new Date('2026-04-20T08:00:00Z'),
    updated_at: new Date('2026-04-20T08:00:00Z'),
  };

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<SchedulesService>(SchedulesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a schedule with all fields', async () => {
      // Arrange
      const input: CreateScheduleInput = {
        user_id: 'user123',
        item_type: 'meeting',
        title: 'Team Meeting',
        description: 'Weekly sync',
        start_time: new Date('2026-04-23T10:00:00Z'),
        end_time: new Date('2026-04-23T11:00:00Z'),
        remind_at: new Date('2026-04-23T09:45:00Z'),
      };

      const createdSchedule = { ...mockSchedule, ...input };
      mockRepository.create.mockReturnValue(createdSchedule as any);
      mockRepository.save.mockResolvedValue(createdSchedule);

      // Act
      const result = await service.create(input);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith({
        user_id: input.user_id,
        item_type: input.item_type,
        title: input.title,
        description: input.description,
        start_time: input.start_time,
        end_time: input.end_time,
        remind_at: input.remind_at,
        is_reminded: false,
        acknowledged_at: null,
        end_notified_at: null,
        status: 'pending',
      });
      expect(mockRepository.save).toHaveBeenCalledWith(createdSchedule);
      expect(result).toEqual(createdSchedule);
    });

    it('should create a schedule with default values for optional fields', async () => {
      // Arrange
      const input: CreateScheduleInput = {
        user_id: 'user123',
        title: 'Simple Task',
        start_time: new Date('2026-04-23T10:00:00Z'),
      };

      const createdSchedule = {
        ...mockSchedule,
        ...input,
        item_type: 'task',
        description: null,
        end_time: null,
        remind_at: null,
      };
      mockRepository.create.mockReturnValue(createdSchedule as any);
      mockRepository.save.mockResolvedValue(createdSchedule as any);

      // Act
      const result = await service.create(input);

      // Assert
      expect(mockRepository.create).toHaveBeenCalledWith({
        user_id: input.user_id,
        item_type: 'task',
        title: input.title,
        description: null,
        start_time: input.start_time,
        end_time: null,
        remind_at: null,
        is_reminded: false,
        acknowledged_at: null,
        end_notified_at: null,
        status: 'pending',
      });
      expect(result.item_type).toBe('task');
      expect(result.description).toBeNull();
      expect(result.end_time).toBeNull();
      expect(result.remind_at).toBeNull();
    });

    it('should handle null description explicitly', async () => {
      // Arrange
      const input: CreateScheduleInput = {
        user_id: 'user123',
        title: 'Task',
        description: null,
        start_time: new Date('2026-04-23T10:00:00Z'),
      };

      const createdSchedule = { ...mockSchedule, ...input };
      mockRepository.create.mockReturnValue(createdSchedule as any);
      mockRepository.save.mockResolvedValue(createdSchedule);

      // Act
      const result = await service.create(input);

      // Assert
      expect(result.description).toBeNull();
    });
  });

  describe('findById', () => {
    it('should find schedule by id without userId filter', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockSchedule);

      // Act
      const result = await service.findById(1);

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockSchedule);
    });

    it('should find schedule by id with userId filter', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(mockSchedule);

      // Act
      const result = await service.findById(1, 'user123');

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, user_id: 'user123' },
      });
      expect(result).toEqual(mockSchedule);
    });

    it('should return null when schedule not found', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findById(999);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null when schedule exists but userId does not match', async () => {
      // Arrange
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.findById(1, 'wronguser');

      // Assert
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { id: 1, user_id: 'wronguser' },
      });
      expect(result).toBeNull();
    });
  });

  describe('findByDateRange', () => {
    it('should find schedules within date range', async () => {
      // Arrange
      const start = new Date('2026-04-23T00:00:00Z');
      const end = new Date('2026-04-23T23:59:59Z');
      const schedules = [mockSchedule, { ...mockSchedule, id: 2 }];
      mockRepository.find.mockResolvedValue(schedules);

      // Act
      const result = await service.findByDateRange('user123', start, end);

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          user_id: 'user123',
          start_time: Between(start, end),
        },
        order: { start_time: 'ASC' },
      });
      expect(result).toEqual(schedules);
    });

    it('should return empty array when no schedules in range', async () => {
      // Arrange
      const start = new Date('2026-05-01T00:00:00Z');
      const end = new Date('2026-05-01T23:59:59Z');
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findByDateRange('user123', start, end);

      // Assert
      expect(result).toEqual([]);
    });

    it('should order results by start_time ascending', async () => {
      // Arrange
      const start = new Date('2026-04-23T00:00:00Z');
      const end = new Date('2026-04-23T23:59:59Z');
      mockRepository.find.mockResolvedValue([]);

      // Act
      await service.findByDateRange('user123', start, end);

      // Assert
      const callArgs = mockRepository.find.mock.calls[0]?.[0];
      expect(callArgs?.order).toEqual({ start_time: 'ASC' });
    });
  });

  describe('findDueReminders', () => {
    it('should find schedules due for reminder', async () => {
      // Arrange
      const now = new Date('2026-04-23T09:50:00Z');
      const dueSchedules = [mockSchedule];
      mockRepository.find.mockResolvedValue(dueSchedules);

      // Act
      const result = await service.findDueReminders(now);

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          remind_at: LessThanOrEqual(now),
          acknowledged_at: IsNull(),
          status: 'pending',
        },
        relations: ['user', 'user.settings'],
        order: { remind_at: 'ASC' },
      });
      expect(result).toEqual(dueSchedules);
    });

    it('should not return acknowledged schedules', async () => {
      // Arrange
      const now = new Date('2026-04-23T09:50:00Z');
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findDueReminders(now);

      // Assert
      const whereClause = mockRepository.find.mock.calls[0]?.[0]?.where as any;
      expect(whereClause?.acknowledged_at).toEqual(IsNull());
      expect(result).toEqual([]);
    });

    it('should only return pending status schedules', async () => {
      // Arrange
      const now = new Date('2026-04-23T09:50:00Z');
      mockRepository.find.mockResolvedValue([]);

      // Act
      await service.findDueReminders(now);

      // Assert
      const whereClause = mockRepository.find.mock.calls[0]?.[0]?.where as any;
      expect(whereClause?.status).toBe('pending');
    });

    it('should include user and settings relations', async () => {
      // Arrange
      const now = new Date('2026-04-23T09:50:00Z');
      mockRepository.find.mockResolvedValue([]);

      // Act
      await service.findDueReminders(now);

      // Assert
      const callArgs = mockRepository.find.mock.calls[0]?.[0];
      expect(callArgs?.relations).toEqual(['user', 'user.settings']);
    });
  });

  describe('acknowledge', () => {
    it('should acknowledge a reminder with provided timestamp', async () => {
      // Arrange
      const now = new Date('2026-04-23T10:00:00Z');
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.acknowledge(1, now);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        acknowledged_at: now,
        remind_at: null,
        is_reminded: true,
      });
    });

    it('should acknowledge a reminder with default timestamp', async () => {
      // Arrange
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      const beforeCall = Date.now();

      // Act
      await service.acknowledge(1);

      // Assert
      const callArgs = mockRepository.update.mock.calls[0][1];
      const acknowledgedAt = (callArgs as any).acknowledged_at;
      expect(acknowledgedAt).toBeInstanceOf(Date);
      expect(acknowledgedAt.getTime()).toBeGreaterThanOrEqual(beforeCall);
      expect(callArgs).toHaveProperty('remind_at', null);
      expect(callArgs).toHaveProperty('is_reminded', true);
    });

    it('should clear remind_at when acknowledging', async () => {
      // Arrange
      const now = new Date('2026-04-23T10:00:00Z');
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.acknowledge(1, now);

      // Assert
      const callArgs = mockRepository.update.mock.calls[0][1];
      expect(callArgs).toHaveProperty('remind_at', null);
    });
  });

  describe('snooze', () => {
    it('should snooze reminder by specified minutes', async () => {
      // Arrange
      const now = new Date('2026-04-23T10:00:00Z');
      const minutes = 15;
      const expectedNextAt = new Date('2026-04-23T10:15:00Z');
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      const result = await service.snooze(1, minutes, now);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        remind_at: expectedNextAt,
        is_reminded: false,
      });
      expect(result).toEqual(expectedNextAt);
    });

    it('should snooze with default current time', async () => {
      // Arrange
      const minutes = 30;
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      const beforeCall = Date.now();

      // Act
      const result = await service.snooze(1, minutes);

      // Assert
      const expectedTime = beforeCall + minutes * 60 * 1000;
      expect(result.getTime()).toBeGreaterThanOrEqual(expectedTime - 100); // Allow 100ms tolerance
      expect(result.getTime()).toBeLessThanOrEqual(expectedTime + 100);
    });

    it('should reset is_reminded flag when snoozing', async () => {
      // Arrange
      const now = new Date('2026-04-23T10:00:00Z');
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.snooze(1, 10, now);

      // Assert
      const callArgs = mockRepository.update.mock.calls[0][1];
      expect(callArgs).toHaveProperty('is_reminded', false);
    });
  });

  describe('rescheduleAfterPing', () => {
    it('should reschedule reminder after ping', async () => {
      // Arrange
      const now = new Date('2026-04-23T10:00:00Z');
      const repeatMinutes = 5;
      const expectedNextAt = new Date('2026-04-23T10:05:00Z');
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.rescheduleAfterPing(1, repeatMinutes, now);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        remind_at: expectedNextAt,
        is_reminded: true,
      });
    });

    it('should set is_reminded to true after ping', async () => {
      // Arrange
      const now = new Date('2026-04-23T10:00:00Z');
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.rescheduleAfterPing(1, 10, now);

      // Assert
      const callArgs = mockRepository.update.mock.calls[0][1];
      expect(callArgs).toHaveProperty('is_reminded', true);
    });
  });

  describe('findDueEndNotifications', () => {
    it('should find schedules due for end notification', async () => {
      // Arrange
      const now = new Date('2026-04-23T11:00:00Z');
      const dueSchedules = [mockSchedule];
      mockRepository.find.mockResolvedValue(dueSchedules);

      // Act
      const result = await service.findDueEndNotifications(now);

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          end_time: LessThanOrEqual(now),
          end_notified_at: IsNull(),
          status: 'pending',
        },
        relations: ['user', 'user.settings'],
        order: { end_time: 'ASC' },
      });
      expect(result).toEqual(dueSchedules);
    });

    it('should not return already notified schedules', async () => {
      // Arrange
      const now = new Date('2026-04-23T11:00:00Z');
      mockRepository.find.mockResolvedValue([]);

      // Act
      await service.findDueEndNotifications(now);

      // Assert
      const whereClause = mockRepository.find.mock.calls[0]?.[0]?.where as any;
      expect(whereClause?.end_notified_at).toEqual(IsNull());
    });

    it('should only return pending status schedules', async () => {
      // Arrange
      const now = new Date('2026-04-23T11:00:00Z');
      mockRepository.find.mockResolvedValue([]);

      // Act
      await service.findDueEndNotifications(now);

      // Assert
      const whereClause = mockRepository.find.mock.calls[0]?.[0]?.where as any;
      expect(whereClause?.status).toBe('pending');
    });
  });

  describe('markEndNotified', () => {
    it('should mark schedule as end notified with provided timestamp', async () => {
      // Arrange
      const now = new Date('2026-04-23T11:00:00Z');
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.markEndNotified(1, now);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        end_notified_at: now,
      });
    });

    it('should mark schedule as end notified with default timestamp', async () => {
      // Arrange
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      const beforeCall = Date.now();

      // Act
      await service.markEndNotified(1);

      // Assert
      const callArgs = mockRepository.update.mock.calls[0][1];
      const endNotifiedAt = (callArgs as any).end_notified_at;
      expect(endNotifiedAt).toBeInstanceOf(Date);
      expect(endNotifiedAt.getTime()).toBeGreaterThanOrEqual(beforeCall);
    });
  });

  describe('markCompleted', () => {
    it('should mark schedule as completed with all fields', async () => {
      // Arrange
      const now = new Date('2026-04-23T11:00:00Z');
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.markCompleted(1, now);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        status: 'completed',
        remind_at: null,
        acknowledged_at: now,
        end_notified_at: now,
      });
    });

    it('should clear remind_at when marking completed', async () => {
      // Arrange
      const now = new Date('2026-04-23T11:00:00Z');
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.markCompleted(1, now);

      // Assert
      const callArgs = mockRepository.update.mock.calls[0][1];
      expect(callArgs).toHaveProperty('remind_at', null);
    });

    it('should use default timestamp when not provided', async () => {
      // Arrange
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      const beforeCall = Date.now();

      // Act
      await service.markCompleted(1);

      // Assert
      const callArgs = mockRepository.update.mock.calls[0][1] as any;
      expect(callArgs.acknowledged_at.getTime()).toBeGreaterThanOrEqual(beforeCall);
      expect(callArgs.end_notified_at.getTime()).toBeGreaterThanOrEqual(beforeCall);
    });
  });

  describe('updateStatus', () => {
    it('should update schedule status to completed', async () => {
      // Arrange
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.updateStatus(1, 'completed');

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        status: 'completed',
      });
    });

    it('should update schedule status to cancelled', async () => {
      // Arrange
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.updateStatus(1, 'cancelled');

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        status: 'cancelled',
      });
    });

    it('should update schedule status to pending', async () => {
      // Arrange
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.updateStatus(1, 'pending');

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        status: 'pending',
      });
    });
  });

  describe('update', () => {
    it('should update schedule with patch data', async () => {
      // Arrange
      const patch: UpdateSchedulePatch = {
        title: 'Updated Title',
        description: 'Updated Description',
        status: 'completed',
      };
      const updatedSchedule = { ...mockSchedule, ...patch };
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue(updatedSchedule);

      // Act
      const result = await service.update(1, patch);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, patch);
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(updatedSchedule);
    });

    it('should return current schedule when patch is empty', async () => {
      // Arrange
      const patch: UpdateSchedulePatch = {};
      mockRepository.findOne.mockResolvedValue(mockSchedule);

      // Act
      const result = await service.update(1, patch);

      // Assert
      expect(mockRepository.update).not.toHaveBeenCalled();
      expect(mockRepository.findOne).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result).toEqual(mockSchedule);
    });

    it('should update multiple fields at once', async () => {
      // Arrange
      const patch: UpdateSchedulePatch = {
        title: 'New Title',
        start_time: new Date('2026-04-24T10:00:00Z'),
        end_time: new Date('2026-04-24T11:00:00Z'),
        remind_at: new Date('2026-04-24T09:45:00Z'),
        status: 'pending',
      };
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue({ ...mockSchedule, ...patch });

      // Act
      await service.update(1, patch);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, patch);
    });

    it('should handle null values in patch', async () => {
      // Arrange
      const patch: UpdateSchedulePatch = {
        description: null,
        end_time: null,
        remind_at: null,
      };
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue({ ...mockSchedule, ...patch });

      // Act
      await service.update(1, patch);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(1, patch);
    });

    it('should return null when schedule not found after update', async () => {
      // Arrange
      const patch: UpdateSchedulePatch = { title: 'New Title' };
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue(null);

      // Act
      const result = await service.update(1, patch);

      // Assert
      expect(result).toBeNull();
    });
  });

  describe('delete', () => {
    it('should delete schedule by id', async () => {
      // Arrange
      mockRepository.delete.mockResolvedValue({ affected: 1 } as any);

      // Act
      await service.delete(1);

      // Assert
      expect(mockRepository.delete).toHaveBeenCalledWith(1);
    });

    it('should not throw error when deleting non-existent schedule', async () => {
      // Arrange
      mockRepository.delete.mockResolvedValue({ affected: 0 } as any);

      // Act & Assert
      await expect(service.delete(999)).resolves.not.toThrow();
    });
  });
});
