-- Migration 001: Khởi tạo bảng users + user_settings
-- Chạy trên Neon PostgreSQL

CREATE TABLE IF NOT EXISTS users (
  user_id       VARCHAR(50) PRIMARY KEY,
  username      VARCHAR(100),
  display_name  VARCHAR(150),
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_settings (
  user_id                 VARCHAR(50) PRIMARY KEY REFERENCES users(user_id) ON DELETE CASCADE,
  timezone                VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
  default_channel_id      VARCHAR(50),
  default_remind_minutes  INTEGER DEFAULT 30,
  notify_via_dm           BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_settings_default_channel
  ON user_settings(default_channel_id);
