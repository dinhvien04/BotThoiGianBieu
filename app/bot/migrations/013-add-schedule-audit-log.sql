-- 013-add-schedule-audit-log.sql
-- Lưu lịch sử thay đổi của mỗi schedule — phục vụ *lich-su <ID>.
-- Mỗi action lưu: ai (user_id), khi nào (created_at), cái gì
-- (action), và (optional) snapshot diff dạng JSON.
--
-- Chạy:
--     psql "$DATABASE_URL" -f migrations/013-add-schedule-audit-log.sql
--
-- Idempotent — chạy lại an toàn.

CREATE TABLE IF NOT EXISTS schedule_audit_logs (
  id          BIGSERIAL PRIMARY KEY,
  schedule_id INTEGER NOT NULL,
  user_id     VARCHAR(50) NOT NULL,
  action      VARCHAR(30) NOT NULL,
  changes     JSONB,
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Không dùng FK tới schedules.id vì khi user xoá lịch, ta vẫn giữ
-- audit log để có thể trace "ai đã xoá lịch X". Nếu cần cascade thì
-- migration sau có thể bổ sung.

CREATE INDEX IF NOT EXISTS idx_audit_schedule_created
  ON schedule_audit_logs (schedule_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_user_created
  ON schedule_audit_logs (user_id, created_at DESC);
