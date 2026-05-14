-- 012-add-schedule-templates.sql
-- Cho phép user lưu template lịch (item_type, title, description,
-- duration, default_remind_minutes, priority) để clone nhanh thay vì
-- gõ lại form *them-lich.
--
-- Chạy:
--     psql "$DATABASE_URL" -f migrations/012-add-schedule-templates.sql
--
-- Idempotent — chạy lại an toàn.

CREATE TABLE IF NOT EXISTS schedule_templates (
  id              SERIAL PRIMARY KEY,
  user_id         VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name            VARCHAR(50) NOT NULL,
  item_type       VARCHAR(20) NOT NULL DEFAULT 'task',
  title           VARCHAR(255) NOT NULL,
  description     TEXT,
  duration_minutes INTEGER,
  default_remind_minutes INTEGER,
  priority        VARCHAR(20) NOT NULL DEFAULT 'normal',
  created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Một user không có 2 template trùng tên.
CREATE UNIQUE INDEX IF NOT EXISTS idx_schedule_templates_user_name
  ON schedule_templates (user_id, name);

CREATE INDEX IF NOT EXISTS idx_schedule_templates_user
  ON schedule_templates (user_id, name);
