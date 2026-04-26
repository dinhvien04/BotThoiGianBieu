import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, IsNull, ILike, MoreThanOrEqual } from 'typeorm';
import { SchedulesService, CreateScheduleInput, UpdateSchedulePatch } from '../../src/schedules/schedules.service';
import { Schedule } from '../../src/schedules/entities/schedule.entity';

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
    recurrence_type: 'none',
    recurrence_interval: 1,
    recurrence_until: null,
    recurrence_parent_id: null,
  };

  beforeEach(async () => {
    mockRepository = {
      create: jest.fn(),
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      findAndCount: jest.fn(),
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
        recurrence_type: 'none',
        recurrence_interval: 1,
        recurrence_until: null,
        recurrence_parent_id: null,
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
        recurrence_type: 'none',
        recurrence_interval: 1,
        recurrence_until: null,
        recurrence_parent_id: null,
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

  describe('search', () => {
    it('should search schedules by keyword across title and description', async () => {
      // Arrange
      mockRepository.findAndCount.mockResolvedValue([[mockSchedule], 1]);

      // Act
      const result = await service.search('user123', 'Team');

      // Assert
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: [
          { user_id: 'user123', title: ILike('%Team%') },
          { user_id: 'user123', description: ILike('%Team%') },
        ],
        order: { start_time: 'ASC', id: 'ASC' },
        take: 10,
        skip: 0,
      });
      expect(result).toEqual({ items: [mockSchedule], total: 1 });
    });

    it('should apply custom limit and offset for pagination', async () => {
      // Arrange
      mockRepository.findAndCount.mockResolvedValue([[], 25]);

      // Act
      await service.search('user123', 'demo', 5, 10);

      // Assert
      const call = mockRepository.findAndCount.mock.calls[0]?.[0];
      expect(call?.take).toBe(5);
      expect(call?.skip).toBe(10);
    });

    it('should return empty result when no matches', async () => {
      // Arrange
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      const result = await service.search('user123', 'nothing');

      // Assert
      expect(result).toEqual({ items: [], total: 0 });
    });

    it('should pass keyword containing spaces unchanged', async () => {
      // Arrange
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      await service.search('user123', 'họp khách hàng');

      // Assert
      const call = mockRepository.findAndCount.mock.calls[0]?.[0];
      expect(call?.where).toEqual([
        { user_id: 'user123', title: ILike('%họp khách hàng%') },
        { user_id: 'user123', description: ILike('%họp khách hàng%') },
      ]);
    });
  });

  describe('findUpcoming', () => {
    it('should return pending schedules with start_time >= now, ordered asc', async () => {
      // Arrange
      const now = new Date('2026-04-23T09:00:00Z');
      mockRepository.find.mockResolvedValue([mockSchedule]);

      // Act
      const result = await service.findUpcoming('user123', now);

      // Assert
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: {
          user_id: 'user123',
          status: 'pending',
          start_time: MoreThanOrEqual(now),
        },
        order: { start_time: 'ASC', id: 'ASC' },
        take: 5,
      });
      expect(result).toEqual([mockSchedule]);
    });

    it('should honor custom limit', async () => {
      // Arrange
      const now = new Date('2026-04-23T09:00:00Z');
      mockRepository.find.mockResolvedValue([]);

      // Act
      await service.findUpcoming('user123', now, 12);

      // Assert
      const call = mockRepository.find.mock.calls[0]?.[0];
      expect(call?.take).toBe(12);
    });

    it('should return empty array when no upcoming schedules', async () => {
      // Arrange
      mockRepository.find.mockResolvedValue([]);

      // Act
      const result = await service.findUpcoming(
        'user123',
        new Date('2030-01-01T00:00:00Z'),
      );

      // Assert
      expect(result).toEqual([]);
    });
  });

  describe('findAllPending', () => {
    it('should return all pending schedules for a user with pagination', async () => {
      // Arrange
      mockRepository.findAndCount.mockResolvedValue([[mockSchedule], 1]);

      // Act
      const result = await service.findAllPending('user123');

      // Assert
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { user_id: 'user123', status: 'pending' },
        order: { start_time: 'ASC', id: 'ASC' },
        take: 10,
        skip: 0,
      });
      expect(result).toEqual({ items: [mockSchedule], total: 1 });
    });

    it('should honor custom limit and offset', async () => {
      // Arrange
      mockRepository.findAndCount.mockResolvedValue([[], 25]);

      // Act
      await service.findAllPending('user123', 5, 10);

      // Assert
      const call = mockRepository.findAndCount.mock.calls[0]?.[0];
      expect(call?.take).toBe(5);
      expect(call?.skip).toBe(10);
    });

    it('should return zero total when user has no pending schedules', async () => {
      // Arrange
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      // Act
      const result = await service.findAllPending('user123');

      // Assert
      expect(result).toEqual({ items: [], total: 0 });
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
      const result = await service.acknowledge(1, now);

      // Assert
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 1, acknowledged_at: IsNull(), status: 'pending' },
        {
          acknowledged_at: now,
          remind_at: null,
          is_reminded: true,
        },
      );
      expect(result).toBe(true);
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

    it('should return false when reminder was already handled', async () => {
      // Arrange
      mockRepository.update.mockResolvedValue({ affected: 0 } as any);

      // Act
      const result = await service.acknowledge(1);

      // Assert
      expect(result).toBe(false);
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
      expect(mockRepository.update).toHaveBeenCalledWith(
        { id: 1, acknowledged_at: IsNull(), status: 'pending' },
        {
          remind_at: expectedNextAt,
          is_reminded: false,
        },
      );
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
      if (!result) throw new Error('Expected snooze to return next reminder time');
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

    it('should return null when reminder was already acknowledged', async () => {
      // Arrange
      mockRepository.update.mockResolvedValue({ affected: 0 } as any);

      // Act
      const result = await service.snooze(1, 10);

      // Assert
      expect(result).toBeNull();
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

  describe('getStatistics', () => {
    const mkItem = (overrides: Partial<Schedule>): Schedule =>
      ({
        ...mockSchedule,
        ...overrides,
      } as Schedule);

    it('should return zeros when user has no schedules', async () => {
      mockRepository.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const stats = await service.getStatistics(
        'user123',
        new Date('2026-01-01'),
        new Date('2026-01-31'),
      );

      expect(stats.total).toBe(0);
      expect(stats.byStatus).toEqual({ pending: 0, completed: 0, cancelled: 0 });
      expect(stats.byItemType).toEqual({ task: 0, meeting: 0, event: 0, reminder: 0 });
      expect(stats.topHours).toEqual([]);
      expect(stats.recurringActiveCount).toBe(0);
    });

    it('should aggregate counts by status, type, and hour', async () => {
      const items = [
        mkItem({ id: 1, status: 'completed', item_type: 'task', start_time: new Date(2026, 3, 1, 9, 0) }),
        mkItem({ id: 2, status: 'completed', item_type: 'task', start_time: new Date(2026, 3, 2, 9, 30) }),
        mkItem({ id: 3, status: 'pending', item_type: 'meeting', start_time: new Date(2026, 3, 3, 14, 0) }),
        mkItem({ id: 4, status: 'cancelled', item_type: 'event', start_time: new Date(2026, 3, 4, 14, 0) }),
        mkItem({ id: 5, status: 'pending', item_type: 'reminder', start_time: new Date(2026, 3, 5, 9, 0) }),
      ];
      mockRepository.find.mockResolvedValueOnce(items).mockResolvedValueOnce([]);

      const stats = await service.getStatistics('user123', null, null);

      expect(stats.total).toBe(5);
      expect(stats.byStatus).toEqual({ pending: 2, completed: 2, cancelled: 1 });
      expect(stats.byItemType).toEqual({ task: 2, meeting: 1, event: 1, reminder: 1 });
      expect(stats.topHours[0]).toEqual({ hour: 9, count: 3 });
      expect(stats.topHours[1]).toEqual({ hour: 14, count: 2 });
    });

    it('should count active recurring schedules (pending + future or null until)', async () => {
      const now = new Date('2026-04-15');
      mockRepository.find
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          mkItem({ id: 10, status: 'pending', recurrence_type: 'weekly', recurrence_until: null }),
          mkItem({
            id: 11,
            status: 'pending',
            recurrence_type: 'daily',
            recurrence_until: new Date('2026-12-31'),
          }),
          mkItem({
            id: 12,
            status: 'pending',
            recurrence_type: 'monthly',
            recurrence_until: new Date('2026-01-01'),
          }),
          mkItem({ id: 13, status: 'pending', recurrence_type: 'none' }),
        ]);

      const stats = await service.getStatistics('user123', null, null, now);

      expect(stats.recurringActiveCount).toBe(2);
    });

    it('should use Between filter when both start and end provided', async () => {
      mockRepository.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);
      const start = new Date('2026-01-01');
      const end = new Date('2026-01-31');

      await service.getStatistics('user123', start, end);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user123', start_time: Between(start, end) },
      });
    });

    it('should query without date filter for all-time', async () => {
      mockRepository.find.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      await service.getStatistics('user123', null, null);

      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user_id: 'user123' },
      });
    });

    it('should limit topHours to 3 entries', async () => {
      const items = Array.from({ length: 5 }, (_, i) =>
        mkItem({ id: i + 1, start_time: new Date(2026, 3, 1, i + 1, 0) }),
      );
      mockRepository.find.mockResolvedValueOnce(items).mockResolvedValueOnce([]);

      const stats = await service.getStatistics('user123', null, null);

      expect(stats.topHours).toHaveLength(3);
    });
  });

  describe('setRecurrence', () => {
    it('should update recurrence_type, interval, and until', async () => {
      const until = new Date('2026-12-31T00:00:00Z');
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue({
        ...mockSchedule,
        recurrence_type: 'weekly',
        recurrence_interval: 2,
        recurrence_until: until,
      } as Schedule);

      const result = await service.setRecurrence(1, {
        type: 'weekly',
        interval: 2,
        until,
      });

      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        recurrence_type: 'weekly',
        recurrence_interval: 2,
        recurrence_until: until,
      });
      expect(result?.recurrence_type).toBe('weekly');
    });

    it('should default interval to 1 and until to null when omitted', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue(mockSchedule);

      await service.setRecurrence(1, { type: 'daily' });

      expect(mockRepository.update).toHaveBeenCalledWith(1, {
        recurrence_type: 'daily',
        recurrence_interval: 1,
        recurrence_until: null,
      });
    });
  });

  describe('clearRecurrence', () => {
    it('should reset recurrence fields to defaults', async () => {
      mockRepository.update.mockResolvedValue({ affected: 1 } as any);
      mockRepository.findOne.mockResolvedValue(mockSchedule);

      await service.clearRecurrence(5);

      expect(mockRepository.update).toHaveBeenCalledWith(5, {
        recurrence_type: 'none',
        recurrence_interval: 1,
        recurrence_until: null,
      });
    });
  });

  describe('spawnNextIfRecurring', () => {
    const baseRecurring: Schedule = {
      ...mockSchedule,
      id: 10,
      start_time: new Date('2026-04-20T10:00:00Z'),
      end_time: new Date('2026-04-20T11:00:00Z'),
      remind_at: new Date('2026-04-20T09:45:00Z'),
      recurrence_type: 'weekly',
      recurrence_interval: 1,
      recurrence_until: null,
      recurrence_parent_id: null,
    } as Schedule;

    it('should return null for non-recurring schedule', async () => {
      const result = await service.spawnNextIfRecurring({
        ...baseRecurring,
        recurrence_type: 'none',
      } as Schedule);
      expect(result).toBeNull();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should create next weekly instance preserving end and remind offsets', async () => {
      mockRepository.create.mockImplementation((data: any) => data as Schedule);
      mockRepository.save.mockImplementation(async (data: any) => ({
        ...(data as Schedule),
        id: 11,
      }));

      const result = await service.spawnNextIfRecurring(
        baseRecurring,
        new Date('2026-04-20T12:00:00Z'),
      );

      expect(mockRepository.create).toHaveBeenCalledTimes(1);
      const created = (mockRepository.create as jest.Mock).mock.calls[0][0];
      expect(created.start_time.toISOString()).toBe('2026-04-27T10:00:00.000Z');
      expect(created.end_time.toISOString()).toBe('2026-04-27T11:00:00.000Z');
      expect(created.remind_at.toISOString()).toBe('2026-04-27T09:45:00.000Z');
      expect(created.recurrence_type).toBe('weekly');
      expect(created.recurrence_interval).toBe(1);
      expect(created.recurrence_parent_id).toBe(10);
      expect(result?.id).toBe(11);
    });

    it('should preserve existing recurrence_parent_id across series', async () => {
      mockRepository.create.mockImplementation((data: any) => data as Schedule);
      mockRepository.save.mockImplementation(async (data: any) => ({
        ...(data as Schedule),
        id: 99,
      }));

      await service.spawnNextIfRecurring(
        { ...baseRecurring, id: 50, recurrence_parent_id: 10 } as Schedule,
      );

      const created = (mockRepository.create as jest.Mock).mock.calls[0][0];
      expect(created.recurrence_parent_id).toBe(10);
    });

    it('should stop when next start_time exceeds recurrence_until', async () => {
      const result = await service.spawnNextIfRecurring({
        ...baseRecurring,
        recurrence_until: new Date('2026-04-22T00:00:00Z'),
      } as Schedule);

      expect(result).toBeNull();
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should create daily instance with correct step', async () => {
      mockRepository.create.mockImplementation((data: any) => data as Schedule);
      mockRepository.save.mockImplementation(async (data: any) => ({ ...(data as Schedule), id: 12 }));

      await service.spawnNextIfRecurring({
        ...baseRecurring,
        recurrence_type: 'daily',
        recurrence_interval: 3,
      } as Schedule);

      const created = (mockRepository.create as jest.Mock).mock.calls[0][0];
      expect(created.start_time.toISOString()).toBe('2026-04-23T10:00:00.000Z');
    });

    it('should clamp monthly to last day of target month', async () => {
      mockRepository.create.mockImplementation((data: any) => data as Schedule);
      mockRepository.save.mockImplementation(async (data: any) => ({ ...(data as Schedule), id: 13 }));

      await service.spawnNextIfRecurring({
        ...baseRecurring,
        start_time: new Date('2026-01-31T10:00:00Z'),
        end_time: null,
        remind_at: null,
        recurrence_type: 'monthly',
        recurrence_interval: 1,
      } as Schedule);

      const created = (mockRepository.create as jest.Mock).mock.calls[0][0];
      expect(created.start_time.toISOString()).toBe('2026-02-28T10:00:00.000Z');
      expect(created.end_time).toBeNull();
      expect(created.remind_at).toBeNull();
    });

    it('should bump past remind_at up to now if shifted instance would remind in past', async () => {
      mockRepository.create.mockImplementation((data: any) => data as Schedule);
      mockRepository.save.mockImplementation(async (data: any) => ({ ...(data as Schedule), id: 14 }));

      const now = new Date('2030-01-01T00:00:00Z'); // far future
      await service.spawnNextIfRecurring(
        {
          ...baseRecurring,
          remind_at: new Date('2026-04-20T09:45:00Z'),
        } as Schedule,
        now,
      );

      const created = (mockRepository.create as jest.Mock).mock.calls[0][0];
      // remind_at should not be in the past
      expect(created.remind_at.getTime()).toBeGreaterThanOrEqual(now.getTime());
    });
  });
});
