# 🚀 Deployment Guide

Hướng dẫn deploy Hệ Thống Chatbot Quản Lý Sự Kiện & Nhắc Việc Trên Mezon lên production environment.

## 🎯 Production Requirements

### Minimum System Requirements
- **CPU**: 1 vCPU (2 vCPU khuyến nghị)
- **RAM**: 512MB (1GB khuyến nghị)
- **Storage**: 10GB SSD
- **Network**: Stable internet connection
- **OS**: Ubuntu 20.04+ / CentOS 8+ / Docker

### Recommended Production Stack
- **Server**: VPS/Cloud instance (DigitalOcean, AWS EC2, Google Cloud)
- **Database**: Managed PostgreSQL (Neon, Supabase, AWS RDS)
- **Process Manager**: PM2 hoặc Docker
- **Reverse Proxy**: Nginx (optional)
- **Monitoring**: PM2 Monitor, Uptime Robot

## 🐳 Docker Deployment (Khuyến nghị)

### 1. Dockerfile Production

```dockerfile
# Multi-stage build for smaller image
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM node:18-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S botuser -u 1001

# Copy built application
COPY --from=builder --chown=botuser:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=botuser:nodejs /app/dist ./dist
COPY --from=builder --chown=botuser:nodejs /app/package*.json ./
COPY --from=builder --chown=botuser:nodejs /app/migrations ./migrations

# Switch to non-root user
USER botuser

# Expose port (if needed)
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "console.log('Health check passed')" || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/main.js"]
```

### 2. docker-compose.yml Production

```yaml
version: '3.8'

services:
  bot:
    build:
      context: .
      dockerfile: Dockerfile
      target: production
    container_name: bot-thoi-gian-bieu
    restart: unless-stopped
    environment:
      - NODE_ENV=production
      - APPLICATION_ID=${APPLICATION_ID}
      - APPLICATION_TOKEN=${APPLICATION_TOKEN}
      - DATABASE_URL=${DATABASE_URL}
      - BOT_PREFIX=${BOT_PREFIX:-*}
      - TZ=Asia/Ho_Chi_Minh
    volumes:
      - ./logs:/app/logs
    networks:
      - bot-network
    depends_on:
      - postgres
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  postgres:
    image: postgres:15-alpine
    container_name: bot-postgres
    restart: unless-stopped
    environment:
      - POSTGRES_DB=${POSTGRES_DB:-bot_schedule}
      - POSTGRES_USER=${POSTGRES_USER:-postgres}
      - POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./migrations:/docker-entrypoint-initdb.d:ro
    networks:
      - bot-network
    ports:
      - "5432:5432"
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  nginx:
    image: nginx:alpine
    container_name: bot-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
      - ./ssl:/etc/nginx/ssl:ro
    networks:
      - bot-network
    depends_on:
      - bot

volumes:
  postgres_data:

networks:
  bot-network:
    driver: bridge
```

### 3. Environment Configuration

```bash
# .env.production
NODE_ENV=production
APPLICATION_ID=your_bot_id
APPLICATION_TOKEN=your_bot_token
DATABASE_URL=postgresql://user:pass@postgres:5432/bot_schedule
BOT_PREFIX=*

# Database credentials
POSTGRES_DB=bot_schedule
POSTGRES_USER=postgres
POSTGRES_PASSWORD=secure_password_here

# Optional
TZ=Asia/Ho_Chi_Minh
LOG_LEVEL=info
```

### 4. Deploy Commands

```bash
# Clone repository
git clone https://github.com/your-repo/BotThoiGianBieu.git
cd BotThoiGianBieu

# Setup environment
cp .env.example .env.production
# Edit .env.production với production values

# Build và start
docker-compose -f docker-compose.yml --env-file .env.production up -d --build

# Xem logs
docker-compose logs -f bot

# Stop services
docker-compose down
```

## 🖥️ VPS Deployment

### 1. Server Setup (Ubuntu 20.04)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install PostgreSQL (optional - khuyến nghị dùng managed DB)
sudo apt install postgresql postgresql-contrib

# Create user for bot
sudo adduser botuser
sudo usermod -aG sudo botuser
```

### 2. Application Setup

```bash
# Switch to bot user
sudo su - botuser

# Clone repository
git clone https://github.com/your-repo/BotThoiGianBieu.git
cd BotThoiGianBieu

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Setup environment
cp .env.example .env
# Edit .env với production values
```

### 3. PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'bot-thoi-gian-bieu',
    script: 'dist/main.js',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### 4. Start with PM2

```bash
# Create logs directory
mkdir -p logs

# Run migrations
npm run migration:run

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
# Follow the instructions to run the generated command

# Monitor
pm2 monit
```

## ☁️ Cloud Platform Deployment

### 1. Heroku Deployment

```bash
# Install Heroku CLI
# Create Heroku app
heroku create bot-thoi-gian-bieu

# Add PostgreSQL addon
heroku addons:create heroku-postgresql:hobby-dev

# Set environment variables
heroku config:set APPLICATION_ID=your_bot_id
heroku config:set APPLICATION_TOKEN=your_bot_token
heroku config:set NODE_ENV=production

# Deploy
git push heroku main

# Run migrations
heroku run npm run migration:run

# View logs
heroku logs --tail
```

**Procfile:**
```
web: node dist/main.js
release: npm run migration:run
```

### 2. Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login and init
railway login
railway init

# Set environment variables
railway variables set APPLICATION_ID=your_bot_id
railway variables set APPLICATION_TOKEN=your_bot_token
railway variables set NODE_ENV=production

# Add PostgreSQL
railway add postgresql

# Deploy
railway up
```

### 3. DigitalOcean App Platform

```yaml
# .do/app.yaml
name: bot-thoi-gian-bieu
services:
- name: bot
  source_dir: /
  github:
    repo: your-username/BotThoiGianBieu
    branch: main
  run_command: npm run start:prod
  build_command: npm run build
  environment_slug: node-js
  instance_count: 1
  instance_size_slug: basic-xxs
  envs:
  - key: NODE_ENV
    value: production
  - key: APPLICATION_ID
    value: ${APPLICATION_ID}
  - key: APPLICATION_TOKEN
    value: ${APPLICATION_TOKEN}
  - key: DATABASE_URL
    value: ${DATABASE_URL}

databases:
- name: bot-db
  engine: PG
  version: "15"
```

## 🔧 Production Configuration

### 1. Environment Variables

```bash
# Required
APPLICATION_ID=123456789
APPLICATION_TOKEN=your_secure_token
DATABASE_URL=postgresql://user:pass@host:port/db

# Optional but recommended
NODE_ENV=production
BOT_PREFIX=*
TZ=Asia/Ho_Chi_Minh
LOG_LEVEL=info
MAX_CONNECTIONS=20
COMMAND_COOLDOWN=1000
```

### 2. Database Migration

```bash
# Run all migrations in order
for file in migrations/*.sql; do
    echo "Running $file..."
    psql "$DATABASE_URL" -f "$file"
done

# Or use migration script
npm run migration:run
```

### 3. SSL/TLS Configuration (Nginx)

```nginx
# /etc/nginx/sites-available/bot-api
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}
```

## 📊 Monitoring & Logging

### 1. PM2 Monitoring

```bash
# Install PM2 Plus (optional)
pm2 install pm2-server-monit

# Monitor processes
pm2 monit

# View logs
pm2 logs bot-thoi-gian-bieu

# Restart if needed
pm2 restart bot-thoi-gian-bieu

# Reload (zero-downtime)
pm2 reload bot-thoi-gian-bieu
```

### 2. Log Rotation

```bash
# Install logrotate
sudo apt install logrotate

# Create logrotate config
sudo tee /etc/logrotate.d/bot-logs << EOF
/home/botuser/BotThoiGianBieu/logs/*.log {
    daily
    missingok
    rotate 7
    compress
    delaycompress
    notifempty
    create 644 botuser botuser
    postrotate
        pm2 reloadLogs
    endscript
}
EOF
```

### 3. Health Checks

```bash
# Create health check script
cat > health-check.sh << 'EOF'
#!/bin/bash
HEALTH_URL="http://localhost:3000/health"
RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $RESPONSE -eq 200 ]; then
    echo "Bot is healthy"
    exit 0
else
    echo "Bot is unhealthy (HTTP $RESPONSE)"
    # Restart bot
    pm2 restart bot-thoi-gian-bieu
    exit 1
fi
EOF

chmod +x health-check.sh

# Add to crontab
crontab -e
# Add: */5 * * * * /home/botuser/BotThoiGianBieu/health-check.sh
```

## 🔄 CI/CD Pipeline

### 1. GitHub Actions

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npm run lint
      - run: npm run build
      - run: npm test

  deploy:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to server
        uses: appleboy/ssh-action@v0.1.5
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            cd /home/botuser/BotThoiGianBieu
            git pull origin main
            npm ci --only=production
            npm run build
            pm2 reload bot-thoi-gian-bieu
```

### 2. Deployment Script

```bash
#!/bin/bash
# deploy.sh

set -e

echo "🚀 Starting deployment..."

# Pull latest code
git pull origin main

# Install dependencies
npm ci --only=production

# Build application
npm run build

# Run migrations
npm run migration:run

# Restart application
pm2 reload bot-thoi-gian-bieu

# Wait for health check
sleep 10
if curl -f http://localhost:3000/health; then
    echo "✅ Deployment successful!"
else
    echo "❌ Health check failed!"
    pm2 logs bot-thoi-gian-bieu --lines 50
    exit 1
fi
```

## 🔒 Security Checklist

### Production Security
- [ ] Environment variables không hardcode
- [ ] Database credentials secure
- [ ] SSL/TLS enabled
- [ ] Firewall configured
- [ ] Regular security updates
- [ ] Bot token rotation schedule
- [ ] Access logs monitoring
- [ ] Rate limiting enabled

### Server Security
- [ ] Non-root user for application
- [ ] SSH key authentication
- [ ] Disable password authentication
- [ ] Fail2ban installed
- [ ] Regular backups
- [ ] Monitoring alerts setup

## 🆘 Troubleshooting

### Common Issues

#### Bot không start
```bash
# Check logs
pm2 logs bot-thoi-gian-bieu

# Check environment
pm2 env 0

# Restart
pm2 restart bot-thoi-gian-bieu
```

#### Database connection failed
```bash
# Test connection
psql "$DATABASE_URL" -c "SELECT 1;"

# Check migrations
psql "$DATABASE_URL" -c "\dt"
```

#### Memory issues
```bash
# Check memory usage
pm2 monit

# Increase memory limit
pm2 delete bot-thoi-gian-bieu
pm2 start ecosystem.config.js --max-memory-restart 2G
```

---

**Deployment guide này đảm bảo bot chạy stable và secure trong production. Luôn test thoroughly trước khi deploy lên production.**