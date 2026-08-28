import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class ScheduleSchemaBootstrapService implements OnModuleInit {
  private readonly logger = new Logger(ScheduleSchemaBootstrapService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleInit(): Promise<void> {
    try {
      await this.dataSource.query('SELECT 1 FROM schedules LIMIT 1');
      this.logger.log('Schedule schema verified successfully.');
    } catch (error) {
      this.logger.warn(
        'Warning: "schedules" table not queryable. Ensure migrations ran via "npm run bot:migrate".',
      );
    }
  }
}
