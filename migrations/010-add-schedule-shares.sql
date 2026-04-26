-- 010-add-schedule-shares.sql
-- Cho phép share lịch view-only với user khác.
--
-- - Owner = `schedules.user_id` vẫn là người tạo và là người duy nhất sửa/xoá.
-- - Mỗi row trong `schedule_shares` = 1 user khác được "thấy" lịch.
-- - Khi reminder rơi xuống channel, bot sẽ mention thêm các participants.
-- - Cascade khi schedule hoặc user bị xoá.
--
-- Áp dụng:
--   psql "$DATABASE_URL" -f migrations/010-add-schedule-shares.sql

CREATE TABLE IF NOT EXISTS schedule_shares (
  schedule_id          INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  shared_with_user_id  VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  shared_at            TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (schedule_id, shared_with_user_id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_shares_user
  ON schedule_shares (shared_with_user_id);
