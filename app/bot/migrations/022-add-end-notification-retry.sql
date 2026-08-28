-- 022-add-end-notification-retry.sql
-- Thêm các trường hỗ trợ retry và chống hot-loop cho end notifications.
--
-- - `end_notification_next_attempt_at`: Thời điểm thử gửi end notification tiếp theo (nếu null thì end_time quyết định).
-- - `end_notification_attempts`: Số lần đã thử gửi end notification.

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS end_notification_next_attempt_at TIMESTAMP WITH TIME ZONE NULL,
  ADD COLUMN IF NOT EXISTS end_notification_attempts INTEGER NOT NULL DEFAULT 0;

-- Index hỗ trợ tìm end notifications đến hạn kết hợp next attempt
CREATE INDEX IF NOT EXISTS idx_schedules_due_end_retry
  ON schedules (end_time, end_notification_next_attempt_at)
  WHERE end_notified_at IS NULL AND status = 'pending';
