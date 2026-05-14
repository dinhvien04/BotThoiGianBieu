# syntax=docker/dockerfile:1.7

# ===== Stage 1: build =====
FROM node:20-alpine AS builder

WORKDIR /repo

COPY package.json package-lock.json ./
COPY app/bot/package.json app/bot/package.json
COPY app/web/package.json app/web/package.json

RUN npm ci --workspace app/bot --include-workspace-root

COPY app/bot app/bot

RUN npm run bot:build

# Remove dev dependencies before copying to the runtime image.
RUN npm prune --omit=dev

# ===== Stage 2: runtime =====
FROM node:20-alpine AS runtime

ENV NODE_ENV=production \
    TZ=Asia/Ho_Chi_Minh

WORKDIR /app

RUN apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo "$TZ" > /etc/timezone

COPY --from=builder /repo/node_modules ./node_modules
COPY --from=builder /repo/package.json ./package.json
COPY --from=builder /repo/app/bot/package.json ./app/bot/package.json
COPY --from=builder /repo/app/bot/dist ./app/bot/dist
COPY --from=builder /repo/app/bot/migrations ./app/bot/migrations
COPY --from=builder /repo/app/bot/assets ./app/bot/assets

# mezon-sdk creates ./mezon-cache in CWD at startup.
RUN mkdir -p /app/mezon-cache && chown -R node:node /app

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "app/bot/dist/main.js"]
