-- 011-add-working-hours.sql
-- Cho phép user đặt khung giờ làm việc — reminder rơi ngoài khung này
-- sẽ tự dồn về work_start_hour của ngày làm việc kế tiếp thay vì ping
-- giữa đêm.
--
-- Chạy:
--     psql "$DATABASE_URL" -f migrations/011-add-working-hours.sql
--
-- Idempotent — chạy lại an toàn.

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS work_start_hour INTEGER NOT NULL DEFAULT 0;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS work_end_hour INTEGER NOT NULL DEFAULT 0;

-- Constraint: 0 <= hour <= 24. Nếu start === end thì coi như tắt
-- (ping mọi lúc, default behavior).
ALTER TABLE user_settings
  DROP CONSTRAINT IF EXISTS chk_user_settings_work_hours;

ALTER TABLE user_settings
  ADD CONSTRAINT chk_user_settings_work_hours
  CHECK (
    work_start_hour >= 0 AND work_start_hour <= 24
    AND work_end_hour >= 0 AND work_end_hour <= 24
  );
