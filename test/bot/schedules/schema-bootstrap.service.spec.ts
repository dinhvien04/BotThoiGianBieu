import { ScheduleSchemaBootstrapService } from 'src/schedules/schema-bootstrap.service';

describe('ScheduleSchemaBootstrapService', () => {
  it('ensures schedule channel schema and share/editor junction tables exist', async () => {
    const dataSource = {
      query: jest.fn().mockResolvedValue(undefined),
    };
    const service = new ScheduleSchemaBootstrapService(dataSource as never);

    await service.onModuleInit();

    expect(dataSource.query).toHaveBeenCalledTimes(6);
    expect(dataSource.query.mock.calls[0][0]).toContain('ADD COLUMN IF NOT EXISTS channel_id');
    expect(dataSource.query.mock.calls[1][0]).toContain(
      'CREATE INDEX IF NOT EXISTS idx_schedules_channel_id',
    );
    expect(dataSource.query.mock.calls[2][0]).toContain(
      'CREATE TABLE IF NOT EXISTS schedule_shares',
    );
    expect(dataSource.query.mock.calls[3][0]).toContain(
      'CREATE INDEX IF NOT EXISTS idx_schedule_shares_user',
    );
    expect(dataSource.query.mock.calls[4][0]).toContain(
      'CREATE TABLE IF NOT EXISTS schedule_editors',
    );
    expect(dataSource.query.mock.calls[5][0]).toContain(
      'CREATE INDEX IF NOT EXISTS idx_schedule_editors_user',
    );
  });
});
