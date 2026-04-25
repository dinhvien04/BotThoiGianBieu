-- 007-add-recurrence.sql
-- Thêm các cột recurrence cho bảng schedules để hỗ trợ lịch lặp
-- (daily / weekly / monthly) theo MVP ở commands *lich-lap và *bo-lap.
--
-- Safe to re-run: dùng IF NOT EXISTS cho column và CHECK constraints có
-- tên cụ thể.
--
-- Áp dụng:
--   psql "$DATABASE_URL" -f migrations/007-add-recurrence.sql

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS recurrence_type VARCHAR(20) NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS recurrence_interval INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS recurrence_until TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS recurrence_parent_id INTEGER;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schedules_recurrence_type_check'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_recurrence_type_check
      CHECK (recurrence_type IN ('none', 'daily', 'weekly', 'monthly'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schedules_recurrence_interval_check'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_recurrence_interval_check
      CHECK (recurrence_interval >= 1);
  END IF;
END
$$;

-- Index để query series nhanh (vd: xoá hàng loạt series sau này).
CREATE INDEX IF NOT EXISTS idx_schedules_recurrence_parent_id
  ON schedules (recurrence_parent_id)
  WHERE recurrence_parent_id IS NOT NULL;
