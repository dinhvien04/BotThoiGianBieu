-- 001-init-base-schema.sql
-- Base schema initialization for Bot Thoi Gian Bieu.
-- Creates core tables: users, user_settings, schedules.
-- Safe to re-run on existing databases (all statements use IF NOT EXISTS).

-- 1. Base Users Table
CREATE TABLE IF NOT EXISTS users (
  user_id       VARCHAR(50) PRIMARY KEY,
  username      VARCHAR(100),
  display_name  VARCHAR(150),
  created_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 2. Base User Settings Table
CREATE TABLE IF NOT EXISTS user_settings (
  user_id                 VARCHAR(50) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  timezone                VARCHAR(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  default_channel_id      VARCHAR(50),
  default_remind_minutes  INTEGER NOT NULL DEFAULT 30,
  notify_via_dm           BOOLEAN NOT NULL DEFAULT FALSE,
  notify_via_channel      BOOLEAN NOT NULL DEFAULT TRUE,
  created_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 3. Base Schedules Table
CREATE TABLE IF NOT EXISTS schedules (
  id                SERIAL PRIMARY KEY,
  user_id           VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  item_type         VARCHAR(20) NOT NULL DEFAULT 'task',
  title             VARCHAR(255) NOT NULL,
  description       TEXT,
  start_time        TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time          TIMESTAMP WITH TIME ZONE,
  status            VARCHAR(20) NOT NULL DEFAULT 'pending',
  remind_at         TIMESTAMP WITH TIME ZONE,
  is_reminded       BOOLEAN NOT NULL DEFAULT FALSE,
  acknowledged_at   TIMESTAMP WITH TIME ZONE,
  end_notified_at   TIMESTAMP WITH TIME ZONE,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- 4. Base Indexes
CREATE INDEX IF NOT EXISTS idx_schedules_user_start
  ON schedules (user_id, start_time);

CREATE INDEX IF NOT EXISTS idx_schedules_remind
  ON schedules (remind_at, is_reminded);

CREATE INDEX IF NOT EXISTS idx_schedules_status
  ON schedules (status);

