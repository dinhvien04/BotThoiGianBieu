-- 008-add-priority.sql
-- Thêm cột priority (low/normal/high) cho bảng schedules.
-- Default = 'normal' nên backward compat: lịch cũ tự fill 'normal'.
--
-- Safe to re-run: dùng IF NOT EXISTS cho column và CHECK constraint có
-- tên cụ thể.
--
-- Áp dụng:
--   psql "$DATABASE_URL" -f migrations/008-add-priority.sql

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'normal';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'schedules_priority_check'
  ) THEN
    ALTER TABLE schedules
      ADD CONSTRAINT schedules_priority_check
      CHECK (priority IN ('low', 'normal', 'high'));
  END IF;
END
$$;

-- Index để filter theo priority nhanh (vd: *danh-sach --uutien cao)
CREATE INDEX IF NOT EXISTS idx_schedules_user_priority
  ON schedules (user_id, priority);
