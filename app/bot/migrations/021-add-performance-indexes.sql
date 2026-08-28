-- 021-add-performance-indexes.sql
-- Thêm các partial và composite indexes để tối ưu hóa hiệu năng
-- truy vấn reminder ticks, end notifications và dashboard.

BEGIN;

-- 1. Index tối ưu hóa cron tìm start reminders đến hạn
CREATE INDEX IF NOT EXISTS idx_schedules_due_reminders
  ON schedules (remind_at)
  WHERE acknowledged_at IS NULL AND status = 'pending';

-- 2. Index tối ưu hóa cron tìm end notifications đến hạn
CREATE INDEX IF NOT EXISTS idx_schedules_due_end_notifications
  ON schedules (end_time)
  WHERE end_notified_at IS NULL AND status = 'pending';

-- 3. Composite index cho danh sách lịch dashboard của user
CREATE INDEX IF NOT EXISTS idx_schedules_user_status_start
  ON schedules (user_id, status, is_pinned DESC, start_time ASC);

-- 4. Index hỗ trợ thống kê admin và metric 30 ngày gần nhất
CREATE INDEX IF NOT EXISTS idx_schedules_created_at
  ON schedules (created_at);

CREATE INDEX IF NOT EXISTS idx_users_created_at
  ON users (created_at);

COMMIT;
