-- Migration 004: Thêm cột end_notified_at để track đã gửi notification kết thúc chưa.
-- Chạy trên Neon PostgreSQL.

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS end_notified_at TIMESTAMP WITH TIME ZONE;

-- Index để cron query nhanh các lịch tới giờ kết thúc:
CREATE INDEX IF NOT EXISTS idx_schedules_end_due
  ON schedules(end_time)
  WHERE end_time IS NOT NULL
    AND end_notified_at IS NULL
    AND status = 'pending';
