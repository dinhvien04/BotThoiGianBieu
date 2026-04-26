# syntax=docker/dockerfile:1.7

# ===== Stage 1: build =====
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig*.json nest-cli.json ./
COPY src ./src

RUN npm run build

# Loại dev deps để copy gọn sang stage cuối
RUN npm prune --omit=dev

# ===== Stage 2: runtime =====
FROM node:20-alpine AS runtime

ENV NODE_ENV=production \
    TZ=Asia/Ho_Chi_Minh

WORKDIR /app

RUN apk add --no-cache tini tzdata && \
    cp /usr/share/zoneinfo/$TZ /etc/localtime && \
    echo "$TZ" > /etc/timezone

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY package*.json ./
COPY migrations ./migrations

USER node

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main.js"]
