-- Migration 002: Khởi tạo bảng schedules
-- Chạy trên Neon PostgreSQL

CREATE TABLE IF NOT EXISTS schedules (
  id                      SERIAL PRIMARY KEY,
  user_id                 VARCHAR(50)              NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  item_type               VARCHAR(20)              NOT NULL DEFAULT 'task',
  title                   VARCHAR(255)             NOT NULL,
  description             TEXT,
  start_time              TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time                TIMESTAMP WITH TIME ZONE,
  status                  VARCHAR(20)              NOT NULL DEFAULT 'pending',
  remind_at               TIMESTAMP WITH TIME ZONE,
  is_reminded             BOOLEAN                  NOT NULL DEFAULT FALSE,
  created_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_schedules_user_start
  ON schedules(user_id, start_time);

CREATE INDEX IF NOT EXISTS idx_schedules_remind
  ON schedules(remind_at, is_reminded)
  WHERE is_reminded = FALSE AND remind_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_schedules_status
  ON schedules(status);
