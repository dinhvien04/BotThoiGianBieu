# 🛠️ Setup & Installation

Hướng dẫn chi tiết cài đặt và cấu hình Hệ Thống Chatbot Quản Lý Sự Kiện & Nhắc Việc Trên Mezon từ đầu.

## 📋 Yêu Cầu Hệ Thống

### Môi Trường Development
- **Node.js**: 18.x hoặc cao hơn
- **npm**: 8.x hoặc cao hơn (đi kèm Node.js)
- **PostgreSQL**: 15.x hoặc cao hơn
- **Git**: Để clone repository

### Môi Trường Production
- **Node.js**: 18.x LTS
- **PostgreSQL**: Cloud database (khuyến nghị Neon, Supabase)
- **Process Manager**: PM2 hoặc Docker
- **Reverse Proxy**: Nginx (nếu cần)

## 🚀 Cài Đặt Nhanh

### 1. Clone Repository

```bash
git clone https://github.com/dinhvien04/BotThoiGianBieu.git
cd BotThoiGianBieu
```

### 2. Cài Đặt Dependencies

```bash
npm install
```

### 3. Cấu Hình Environment

```bash
cp .env.example .env
```

Chỉnh sửa file `.env`:

```env
# Bot Configuration
APPLICATION_ID=your_mezon_bot_id
APPLICATION_TOKEN=your_mezon_bot_token
BOT_PREFIX=*

# Database
DATABASE_URL=postgresql://username:password@host:port/database

# Optional
NODE_ENV=development
PORT=3000
```

### 4. Thiết Lập Database

#### Option A: Sử dụng Cloud Database (Khuyến nghị)

**Neon (Free tier):**
1. Đăng ký tại [neon.tech](https://neon.tech)
2. Tạo database mới
3. Copy connection string vào `DATABASE_URL`

**Supabase:**
1. Đăng ký tại [supabase.com](https://supabase.com)
2. Tạo project mới
3. Vào Settings → Database → Connection string
4. Copy vào `DATABASE_URL`

#### Option B: PostgreSQL Local

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo -u postgres createdb bot_schedule
```

**macOS (Homebrew):**
```bash
brew install postgresql
brew services start postgresql
createdb bot_schedule
```

**Windows:**
1. Tải PostgreSQL từ [postgresql.org](https://www.postgresql.org/download/windows/)
2. Cài đặt và tạo database `bot_schedule`

### 5. Chạy Migrations

```bash
# Chạy lần lượt từng migration theo thứ tự
psql "$DATABASE_URL" -f migrations/007-add-recurrence.sql
psql "$DATABASE_URL" -f migrations/008-add-priority.sql
psql "$DATABASE_URL" -f migrations/009-add-tags.sql
psql "$DATABASE_URL" -f migrations/010-add-schedule-shares.sql
psql "$DATABASE_URL" -f migrations/011-add-working-hours.sql
psql "$DATABASE_URL" -f migrations/012-add-schedule-templates.sql
psql "$DATABASE_URL" -f migrations/013-add-schedule-audit-log.sql
```

**Hoặc sử dụng script:**
```bash
# Tạo script run-migrations.sh
#!/bin/bash
for file in migrations/*.sql; do
    echo "Running $file..."
    psql "$DATABASE_URL" -f "$file"
done
```

### 6. Khởi Động Bot

**Development:**
```bash
npm run start:dev
```

**Production:**
```bash
npm run build
npm run start:prod
```

Nếu thành công, bạn sẽ thấy:
```
🤖 Bot Thời Gian Biểu đã khởi động
✅ MezonClient đã đăng nhập thành công
🎧 Bot đang lắng nghe lệnh (prefix: "*")
```

## 🔧 Cấu Hình Chi Tiết

### Environment Variables

| Variable | Mô tả | Bắt buộc | Mặc định |
|----------|-------|----------|----------|
| `APPLICATION_ID` | Mezon Bot ID | ✅ | - |
| `APPLICATION_TOKEN` | Mezon Bot Token | ✅ | - |
| `DATABASE_URL` | PostgreSQL connection string | ✅ | - |
| `BOT_PREFIX` | Command prefix | ❌ | `*` |
| `NODE_ENV` | Environment mode | ❌ | `development` |
| `PORT` | HTTP port (nếu cần) | ❌ | `3000` |
| `TZ` | Timezone | ❌ | `Asia/Ho_Chi_Minh` |

### Mezon Bot Setup

#### 1. Tạo Bot Application

1. Truy cập [Mezon Developer Portal](https://developers.mezon.ai)
2. Đăng nhập với tài khoản Mezon
3. Tạo "New Application"
4. Đặt tên bot và mô tả
5. Lưu `Application ID`

#### 2. Tạo Bot Token

1. Vào tab "Bot" trong application
2. Bấm "Add Bot"
3. Copy `Token` (chỉ hiển thị 1 lần)
4. Bật các permissions cần thiết:
   - Send Messages
   - Read Message History
   - Use Slash Commands
   - Embed Links

#### 3. Invite Bot Vào Clan

1. Vào tab "OAuth2" → "URL Generator"
2. Chọn scope: `bot`
3. Chọn permissions: `Send Messages`, `Read Message History`
4. Copy URL và mở trong browser
5. Chọn clan và authorize

### Database Configuration

#### Connection String Format

```
postgresql://[username[:password]@][host[:port]][/database][?param=value]
```

**Ví dụ:**
```env
# Local
DATABASE_URL=postgresql://postgres:password@localhost:5432/bot_schedule

# Neon
DATABASE_URL=postgresql://neondb_owner:password@ep-xxx.us-east-1.aws.neon.tech/neondb?sslmode=require

# Supabase
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

#### SSL Configuration

Đối với cloud databases, thường cần SSL:

```env
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require
```

#### Connection Pool Settings

Trong `src/config/database.config.ts`:

```typescript
export const databaseConfig = {
  type: 'postgres',
  url: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  synchronize: false, // Luôn false trong production
  logging: process.env.NODE_ENV === 'development',
  entities: [__dirname + '/../**/*.entity{.ts,.js}'],
  migrations: [__dirname + '/../migrations/*{.ts,.js}'],
  extra: {
    max: 20, // Maximum connections
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  },
};
```

## 🐳 Docker Setup

### Dockerfile

```dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

COPY . .
RUN npm run build

FROM node:18-alpine AS runtime

WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/migrations ./migrations

EXPOSE 3000
CMD ["npm", "run", "start:prod"]
```

### docker-compose.yml

```yaml
version: '3.8'

services:
  bot:
    build: .
    environment:
      - APPLICATION_ID=${APPLICATION_ID}
      - APPLICATION_TOKEN=${APPLICATION_TOKEN}
      - DATABASE_URL=${DATABASE_URL}
      - BOT_PREFIX=${BOT_PREFIX}
      - NODE_ENV=production
    restart: unless-stopped
    depends_on:
      - postgres

  postgres:
    image: postgres:15-alpine
    environment:
      - POSTGRES_DB=bot_schedule
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d
    ports:
      - "5432:5432"
    restart: unless-stopped

volumes:
  postgres_data:
```

### Chạy với Docker

```bash
# Build và start
docker-compose up -d --build

# Xem logs
docker-compose logs -f bot

# Stop
docker-compose down
```

## 🔍 Troubleshooting

### Lỗi Thường Gặp

#### 1. Database Connection Failed

**Lỗi:**
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Giải pháp:**
- Kiểm tra PostgreSQL đã chạy: `sudo systemctl status postgresql`
- Kiểm tra connection string trong `.env`
- Kiểm tra firewall/network settings

#### 2. Bot Token Invalid

**Lỗi:**
```
Error: 401 Unauthorized
```

**Giải pháp:**
- Kiểm tra `APPLICATION_TOKEN` trong `.env`
- Regenerate token trong Mezon Developer Portal
- Đảm bảo bot có permissions cần thiết

#### 3. Migration Failed

**Lỗi:**
```
ERROR: relation "schedules" already exists
```

**Giải pháp:**
- Migrations là idempotent, có thể chạy lại an toàn
- Kiểm tra database schema hiện tại
- Chạy từng migration riêng lẻ để debug

#### 4. Module Not Found

**Lỗi:**
```
Error: Cannot find module 'mezon-sdk'
```

**Giải pháp:**
```bash
rm -rf node_modules package-lock.json
npm install
```

#### 5. TypeScript Compilation Error

**Lỗi:**
```
error TS2307: Cannot find module
```

**Giải pháp:**
```bash
npm run build
# Hoặc
npx tsc --noEmit
```

### Debug Mode

Bật debug logging:

```env
NODE_ENV=development
DEBUG=bot:*
```

Hoặc trong code:

```typescript
// src/main.ts
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  logger.log('Starting bot...');
  // ...
}
```

### Health Checks

Thêm health check endpoint:

```typescript
// src/health/health.controller.ts
@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
```

## 📊 Monitoring Setup

### PM2 (Production)

```bash
# Cài đặt PM2
npm install -g pm2

# Tạo ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'bot-thoi-gian-bieu',
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF

# Start với PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Logging

Cấu hình Winston logger:

```typescript
// src/config/logger.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';

export const loggerConfig = WinstonModule.createLogger({
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.simple(),
      ),
    }),
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      format: winston.format.json(),
    }),
    new winston.transports.File({
      filename: 'logs/combined.log',
      format: winston.format.json(),
    }),
  ],
});
```

## 🔐 Security Best Practices

### Environment Security

```bash
# Đặt permissions cho .env
chmod 600 .env

# Không commit .env vào git
echo ".env" >> .gitignore
```

### Database Security

```env
# Sử dụng connection pooling
DATABASE_URL=postgresql://user:pass@host:port/db?sslmode=require&pool_max=20

# Rotate passwords định kỳ
# Sử dụng read-only user cho monitoring
```

### Bot Token Security

- Không hardcode token trong code
- Rotate token định kỳ
- Sử dụng environment variables
- Monitor unauthorized access

---

**Setup hoàn tất! Bot đã sẵn sàng hoạt động. Xem [Development Guide](./development-guide.md) để bắt đầu phát triển tính năng mới.**