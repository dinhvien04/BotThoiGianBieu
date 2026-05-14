-- 015-add-schedule-editors.sql
-- Cho phép owner cấp quyền EDIT lịch cho user khác (ngoài chia sẻ view-only).
--
-- - `schedule_shares` (010) vẫn là view-only.
-- - `schedule_editors` mới = quyền edit (sửa lịch, đánh hoàn thành).
-- - Owner = `schedules.user_id` vẫn là người duy nhất xoá / chia sẻ tiếp.
-- - Cascade khi schedule hoặc user bị xoá.
--
-- Áp dụng:
--   psql "$DATABASE_URL" -f migrations/015-add-schedule-editors.sql

CREATE TABLE IF NOT EXISTS schedule_editors (
  schedule_id     INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  editor_user_id  VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  granted_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  PRIMARY KEY (schedule_id, editor_user_id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_editors_user
  ON schedule_editors (editor_user_id);
