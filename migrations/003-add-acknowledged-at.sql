-- Migration 003: Thêm cột acknowledged_at để track user đã xác nhận reminder chưa.
-- Chạy trên Neon PostgreSQL.

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMP WITH TIME ZONE;

-- Index dành riêng cho cron tìm các lịch cần nhắc:
-- "cần nhắc" = remind_at đã tới, chưa ai ack, status vẫn pending.
DROP INDEX IF EXISTS idx_schedules_remind;
CREATE INDEX IF NOT EXISTS idx_schedules_reminder_due
  ON schedules(remind_at)
  WHERE remind_at IS NOT NULL
    AND acknowledged_at IS NULL
    AND status = 'pending';
