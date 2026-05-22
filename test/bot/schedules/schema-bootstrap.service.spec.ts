import { ScheduleSchemaBootstrapService } from 'src/schedules/schema-bootstrap.service';

describe('ScheduleSchemaBootstrapService', () => {
  it('ensures schedule channel_id column and index exist', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ScheduleSchemaBootstrapService(dataSource as never);

    await service.onModuleInit();

    expect(dataSource.query).toHaveBeenCalledTimes(2);
    expect(dataSource.query.mock.calls[0][0]).toContain('ADD COLUMN IF NOT EXISTS channel_id');
    expect(dataSource.query.mock.calls[1][0]).toContain(
      'CREATE INDEX IF NOT EXISTS idx_schedules_channel_id',
    );
  });
});
