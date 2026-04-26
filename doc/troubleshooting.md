# 🛠️ Troubleshooting Guide

Hướng dẫn xử lý các sự cố thường gặp khi sử dụng và maintain Bot Thời Gian Biểu.

## 🚨 Sự Cố Thường Gặp

### 1. Bot Không Phản Hồi

#### Triệu chứng
- User gõ lệnh nhưng bot không reply
- Bot online nhưng không xử lý messages

#### Nguyên nhân có thể
- Bot service đã crash
- Database connection bị mất
- Mezon WebSocket connection bị ngắt
- Bot không có permission trong channel

#### Cách khắc phục

**Kiểm tra bot status:**
```bash
# Với PM2
pm2 status bot-thoi-gian-bieu
pm2 logs bot-thoi-gian-bieu --lines 50

# Với Docker
docker ps | grep bot
docker logs bot-container --tail 50
```

**Kiểm tra database connection:**
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Kiểm tra active connections
psql "$DATABASE_URL" -c "SELECT count(*) FROM pg_stat_activity;"
```

**Restart bot:**
```bash
# PM2
pm2 restart bot-thoi-gian-bieu

# Docker
docker restart bot-container

# Manual
npm run start:prod
```

**Kiểm tra permissions:**
- Bot có permission "Send Messages" trong channel
- Bot có permission "Read Message History"
- Bot đã được invite vào channel

### 2. Database Connection Errors

#### Triệu chứng
```
Error: connect ECONNREFUSED
Error: password authentication failed
Error: database "bot_schedule" does not exist
```

#### Cách khắc phục

**Connection refused:**
```bash
# Kiểm tra PostgreSQL service
sudo systemctl status postgresql
sudo systemctl start postgresql

# Kiểm tra port
netstat -tlnp | grep 5432
```

**Authentication failed:**
```bash
# Kiểm tra credentials trong .env
cat .env | grep DATABASE_URL

# Test với psql
psql "$DATABASE_URL" -c "\l"
```

**Database không tồn tại:**
```bash
# Tạo database
createdb bot_schedule

# Hoặc với psql
psql -c "CREATE DATABASE bot_schedule;"
```

**SSL issues (cloud databases):**
```bash
# Thêm SSL mode vào connection string
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
```

### 3. Migration Errors

#### Triệu chứng
```
ERROR: relation "schedules" already exists
ERROR: column "priority" of relation "schedules" already exists
```

#### Cách khắc phục

**Kiểm tra schema hiện tại:**
```sql
-- Xem tất cả tables
\dt

-- Xem structure của table
\d schedules

-- Kiểm tra columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'schedules';
```

**Chạy migration có điều kiện:**
```sql
-- Ví dụ migration idempotent
ALTER TABLE schedules 
ADD COLUMN IF NOT EXISTS priority VARCHAR(20) DEFAULT 'normal';

CREATE INDEX IF NOT EXISTS idx_schedules_priority 
ON schedules(priority);
```

**Reset migrations (cẩn thận!):**
```bash
# Backup trước
pg_dump "$DATABASE_URL" > backup.sql

# Drop và recreate
psql "$DATABASE_URL" -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"

# Chạy lại tất cả migrations
for file in migrations/*.sql; do
    psql "$DATABASE_URL" -f "$file"
done
```

### 4. Memory Issues

#### Triệu chứng
- Bot restart liên tục
- PM2 báo "max memory restart"
- Server chậm hoặc hang

#### Cách khắc phục

**Kiểm tra memory usage:**
```bash
# System memory
free -h
top -p $(pgrep node)

# PM2 monitoring
pm2 monit
```

**Tăng memory limit:**
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'bot-thoi-gian-bieu',
    script: 'dist/main.js',
    max_memory_restart: '2G', // Tăng từ 1G
    node_args: '--max-old-space-size=2048'
  }]
};
```

**Optimize queries:**
```typescript
// Thêm pagination cho large datasets
async findSchedules(userId: string, limit = 50): Promise<Schedule[]> {
  return this.repository.find({
    where: { user_id: userId },
    take: limit, // Limit results
    select: ['id', 'title', 'start_time'], // Select only needed fields
  });
}
```

### 5. Cron Jobs Không Chạy

#### Triệu chứng
- Reminders không được gửi
- Recurring events không tạo instance mới
- Background tasks không execute

#### Cách khắc phục

**Kiểm tra cron service:**
```bash
# Xem logs
pm2 logs bot-thoi-gian-bieu | grep "cron\|reminder"

# Kiểm tra timezone
date
echo $TZ
```

**Debug cron manually:**
```typescript
// Thêm vào controller để test manual
@Get('/debug/cron')
async debugCron() {
  await this.reminderService.checkReminders();
  return { message: 'Cron executed manually' };
}
```

**Kiểm tra cron expression:**
```typescript
// Verify cron expression
import { CronExpression } from '@nestjs/schedule';

@Cron(CronExpression.EVERY_MINUTE) // '* * * * *'
async checkReminders() {
  this.logger.debug('Cron job running...');
}
```

### 6. Interactive Forms Không Hoạt Động

#### Triệu chứng
- Forms không hiển thị
- Buttons không response
- Form data không được xử lý

#### Cách khắc phục

**Kiểm tra interaction registry:**
```typescript
// Đảm bảo handler được đăng ký
onModuleInit(): void {
  this.commandRegistry.register(this);
  this.interactionRegistry.register(this); // Thêm dòng này
}
```

**Debug interaction handling:**
```typescript
async handleButton(ctx: ButtonInteractionContext): Promise<void> {
  this.logger.debug('Button interaction received', {
    action: ctx.action,
    clickerId: ctx.clickerId,
    formData: ctx.formData,
  });
  
  // ... rest of handler
}
```

**Kiểm tra button ID format:**
```typescript
// Đảm bảo format đúng: "interactionId:action:params"
const buttons = new ButtonBuilder()
  .addButton(
    `them-lich:confirm`, // Đúng format
    '✅ Xác nhận',
    EButtonMessageStyle.SUCCESS
  )
  .build();
```

## 🔍 Debug Tools & Commands

### 1. Health Check Endpoint

```typescript
// src/health/health.controller.ts
@Controller('health')
export class HealthController {
  constructor(
    private readonly schedulesService: SchedulesService,
    private readonly botService: BotService,
  ) {}

  @Get()
  async check(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkBotConnection(),
      this.checkMemoryUsage(),
    ]);

    return {
      status: checks.every(c => c.status === 'fulfilled') ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: checks[0].status === 'fulfilled',
        botConnection: checks[1].status === 'fulfilled',
        memory: checks[2].status === 'fulfilled',
      },
    };
  }

  private async checkDatabase(): Promise<void> {
    await this.schedulesService.count();
  }

  private async checkBotConnection(): Promise<void> {
    // Kiểm tra bot connection status
    if (!this.botService.isConnected()) {
      throw new Error('Bot not connected');
    }
  }

  private async checkMemoryUsage(): Promise<void> {
    const usage = process.memoryUsage();
    const maxMemory = 1024 * 1024 * 1024; // 1GB
    
    if (usage.heapUsed > maxMemory) {
      throw new Error('Memory usage too high');
    }
  }
}
```

### 2. Debug Commands

```typescript
// src/bot/commands/debug.command.ts (chỉ cho admin)
@Injectable()
export class DebugCommand implements BotCommand {
  readonly name = 'debug';
  
  async execute(ctx: CommandContext): Promise<void> {
    // Chỉ admin mới được dùng
    if (!this.isAdmin(ctx.message.sender_id)) {
      return;
    }

    const [subcommand, ...args] = ctx.args;

    switch (subcommand) {
      case 'stats':
        await this.showStats(ctx);
        break;
      case 'memory':
        await this.showMemoryUsage(ctx);
        break;
      case 'cron':
        await this.testCron(ctx);
        break;
      case 'db':
        await this.testDatabase(ctx);
        break;
      default:
        await ctx.reply('Debug commands: stats, memory, cron, db');
    }
  }

  private async showStats(ctx: CommandContext): Promise<void> {
    const stats = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      activeConnections: await this.getActiveConnections(),
      totalSchedules: await this.schedulesService.count(),
    };

    await ctx.reply(`\`\`\`json\n${JSON.stringify(stats, null, 2)}\n\`\`\``);
  }

  private async testCron(ctx: CommandContext): Promise<void> {
    try {
      await this.reminderService.checkReminders();
      await ctx.reply('✅ Cron test successful');
    } catch (error) {
      await ctx.reply(`❌ Cron test failed: ${error.message}`);
    }
  }
}
```

### 3. Logging Configuration

```typescript
// src/config/logger.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = WinstonModule.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
    }),
  ],
});
```

## 📊 Monitoring & Alerting

### 1. Performance Monitoring

```typescript
// src/shared/interceptors/performance.interceptor.ts
@Injectable()
export class PerformanceInterceptor implements NestInterceptor {
  private readonly logger = new Logger(PerformanceInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const start = Date.now();
    const className = context.getClass().name;
    const methodName = context.getHandler().name;

    return next.handle().pipe(
      tap(() => {
        const duration = Date.now() - start;
        
        if (duration > 1000) { // Log slow operations
          this.logger.warn(`Slow operation: ${className}.${methodName} took ${duration}ms`);
        }
      }),
    );
  }
}
```

### 2. Error Tracking

```typescript
// src/shared/filters/global-exception.filter.ts
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status = exception instanceof HttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: exception instanceof Error ? exception.message : 'Unknown error',
    };

    // Log error với context
    this.logger.error(
      `${request.method} ${request.url}`,
      exception instanceof Error ? exception.stack : exception,
    );

    // Send to external monitoring (Sentry, etc.)
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoring(exception, request);
    }

    response.status(status).json(errorResponse);
  }

  private sendToMonitoring(exception: unknown, request: any): void {
    // Implement Sentry, Rollbar, etc.
  }
}
```

### 3. Uptime Monitoring

```bash
# Script để check bot health
#!/bin/bash
# health-check.sh

HEALTH_URL="http://localhost:3000/health"
WEBHOOK_URL="your_slack_webhook_url"

response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -ne 200 ]; then
    # Send alert
    curl -X POST -H 'Content-type: application/json' \
        --data '{"text":"🚨 Bot health check failed! HTTP: '$response'"}' \
        $WEBHOOK_URL
    
    # Restart bot
    pm2 restart bot-thoi-gian-bieu
fi
```

## 🔧 Performance Optimization

### 1. Database Query Optimization

```typescript
// Slow query detection
@Injectable()
export class QueryLogger {
  private readonly logger = new Logger(QueryLogger.name);

  logQuery(query: string, parameters: any[], duration: number): void {
    if (duration > 100) { // Log queries > 100ms
      this.logger.warn(`Slow query (${duration}ms): ${query}`, {
        parameters,
        duration,
      });
    }
  }
}

// Optimize common queries
async findSchedulesOptimized(userId: string): Promise<Schedule[]> {
  return this.repository
    .createQueryBuilder('schedule')
    .select([
      'schedule.id',
      'schedule.title', 
      'schedule.start_time',
      'schedule.status',
    ]) // Chỉ select fields cần thiết
    .where('schedule.user_id = :userId', { userId })
    .andWhere('schedule.status = :status', { status: 'pending' })
    .orderBy('schedule.start_time', 'ASC')
    .limit(50) // Limit results
    .getMany();
}
```

### 2. Memory Leak Detection

```typescript
// Memory monitoring
setInterval(() => {
  const usage = process.memoryUsage();
  
  if (usage.heapUsed > 500 * 1024 * 1024) { // 500MB
    console.warn('High memory usage:', {
      heapUsed: Math.round(usage.heapUsed / 1024 / 1024) + 'MB',
      heapTotal: Math.round(usage.heapTotal / 1024 / 1024) + 'MB',
    });
  }
}, 60000); // Check every minute
```

### 3. Connection Pool Tuning

```typescript
// database.config.ts
export const databaseConfig = {
  // ... other config
  extra: {
    max: 20, // Maximum connections
    min: 5,  // Minimum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
    acquireTimeoutMillis: 60000,
  },
};
```

## 🚨 Emergency Procedures

### 1. Bot Down Emergency

```bash
#!/bin/bash
# emergency-restart.sh

echo "🚨 Emergency bot restart initiated..."

# Stop current process
pm2 stop bot-thoi-gian-bieu

# Check for zombie processes
pkill -f "node.*bot"

# Clear logs if too large
if [ $(stat -f%z logs/combined.log 2>/dev/null || stat -c%s logs/combined.log) -gt 100000000 ]; then
    echo "Rotating large log files..."
    mv logs/combined.log logs/combined.log.old
    touch logs/combined.log
fi

# Start bot
pm2 start ecosystem.config.js

# Wait and check
sleep 10
if pm2 list | grep -q "online.*bot-thoi-gian-bieu"; then
    echo "✅ Bot restarted successfully"
else
    echo "❌ Bot restart failed"
    exit 1
fi
```

### 2. Database Recovery

```bash
#!/bin/bash
# db-recovery.sh

echo "🔧 Database recovery initiated..."

# Create backup
pg_dump "$DATABASE_URL" > "backup-$(date +%Y%m%d-%H%M%S).sql"

# Check for corruption
psql "$DATABASE_URL" -c "SELECT pg_database.datname FROM pg_database;"

# Reindex if needed
psql "$DATABASE_URL" -c "REINDEX DATABASE bot_schedule;"

# Vacuum
psql "$DATABASE_URL" -c "VACUUM ANALYZE;"

echo "✅ Database recovery completed"
```

### 3. Rollback Procedure

```bash
#!/bin/bash
# rollback.sh

BACKUP_FILE=$1

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: ./rollback.sh <backup_file>"
    exit 1
fi

echo "🔄 Rolling back to $BACKUP_FILE..."

# Stop bot
pm2 stop bot-thoi-gian-bieu

# Restore database
psql "$DATABASE_URL" < "$BACKUP_FILE"

# Restart bot
pm2 start bot-thoi-gian-bieu

echo "✅ Rollback completed"
```

## 📞 Support Contacts

### Internal Team
- **Lead Developer**: @dev-lead
- **DevOps**: @devops-team  
- **Database Admin**: @dba-team

### External Services
- **Neon Support**: support@neon.tech
- **Mezon Developer**: developers@mezon.ai
- **Hosting Provider**: [Provider support]

### Emergency Escalation
1. Try automated recovery scripts
2. Contact lead developer
3. Contact DevOps team
4. Contact external service providers

---

**Troubleshooting guide này giúp quickly identify và resolve các issues thường gặp. Luôn backup trước khi thực hiện major changes.**