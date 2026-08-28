import { ScheduleSchemaBootstrapService } from 'src/schedules/schema-bootstrap.service';

describe('ScheduleSchemaBootstrapService', () => {
  it('verifies that schedules table exists without executing runtime DDL', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue([{ '?column?': 1 }]),
    };
    const service = new ScheduleSchemaBootstrapService(dataSource as never);

    await service.onModuleInit();

    expect(dataSource.query).toHaveBeenCalledTimes(1);
    expect(dataSource.query.mock.calls[0][0]).toBe('SELECT 1 FROM schedules LIMIT 1');
  });

  it('handles query error gracefully when table does not exist', async () => {
    const dataSource = {
      query: jest.fn().mockRejectedValue(new Error('relation "schedules" does not exist')),
    };
    const service = new ScheduleSchemaBootstrapService(dataSource as never);

    await expect(service.onModuleInit()).resolves.not.toThrow();
    expect(dataSource.query).toHaveBeenCalledTimes(1);
  });
});

