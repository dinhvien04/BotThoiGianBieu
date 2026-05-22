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
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS schedule_shares (
        schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
        shared_with_user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        shared_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (schedule_id, shared_with_user_id)
      )
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_shares_user
        ON schedule_shares(shared_with_user_id)
    `);
    await this.dataSource.query(`
      CREATE TABLE IF NOT EXISTS schedule_editors (
        schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
        editor_user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
        PRIMARY KEY (schedule_id, editor_user_id)
      )
    `);
    await this.dataSource.query(`
      CREATE INDEX IF NOT EXISTS idx_schedule_editors_user
        ON schedule_editors(editor_user_id)
    `);
    this.logger.log('Schedule schema bootstrap complete.');
  }
}
