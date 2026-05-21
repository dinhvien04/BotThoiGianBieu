import { Controller, Get } from '@nestjs/common';

@Controller()
export class HealthController {
  @Get()
  root() {
    return this.status();
  }

  @Get('health')
  health() {
    return this.status();
  }

  private status() {
    return {
      ok: true,
      service: 'bot-thoi-gian-bieu',
      timestamp: new Date().toISOString(),
    };
  }
}
