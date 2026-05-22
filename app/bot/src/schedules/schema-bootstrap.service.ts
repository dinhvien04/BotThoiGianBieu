import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ScheduleSchemaBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(ScheduleSchemaBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    await this.dataSource.query(`
      ALTER TABLE schedules
        ADD COLUMN IF NOT EXISTS channel_id VARCHAR(50)
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_schedules_channel_id
        ON schedules(channel_id)
    `);
    this.logger.log('Schedule schema bootstrap complete.');
  }
}
