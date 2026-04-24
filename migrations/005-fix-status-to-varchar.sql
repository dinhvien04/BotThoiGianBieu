-- Migration 005: Convert column `status` (và `item_type` nếu có) từ ENUM → VARCHAR.
-- Lý do: DB đang dùng enum `schedule_status` chỉ cho phép 1 giá trị "pending",
-- khi update sang "completed"/"cancelled" sẽ fail.
-- Entity TypeORM dùng VARCHAR(20), convert để khớp.
--
-- ⚠ Phải DROP các partial index có `WHERE status = 'pending'` trước rồi
-- CREATE lại sau — vì literal 'pending' trong index condition được lưu
-- dưới dạng enum, cản trở ALTER COLUMN.

BEGIN;

-- 1) Drop toàn bộ index tham chiếu tới status (migration 002, 003, 004)
DROP INDEX IF EXISTS idx_schedules_status;
DROP INDEX IF EXISTS idx_schedules_reminder_due;
DROP INDEX IF EXISTS idx_schedules_end_due;

-- 2) Convert column status từ enum → VARCHAR
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'schedules'
      AND column_name = 'status'
      AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE schedules ALTER COLUMN status DROP DEFAULT;
    ALTER TABLE schedules ALTER COLUMN status TYPE VARCHAR(20) USING status::text;
    ALTER TABLE schedules ALTER COLUMN status SET DEFAULT 'pending';
    DROP TYPE IF EXISTS schedule_status;
    RAISE NOTICE 'Converted schedules.status: enum → VARCHAR(20)';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'schedules'
      AND column_name = 'item_type'
      AND data_type = 'USER-DEFINED'
  ) THEN
    ALTER TABLE schedules ALTER COLUMN item_type DROP DEFAULT;
    ALTER TABLE schedules ALTER COLUMN item_type TYPE VARCHAR(20) USING item_type::text;
    ALTER TABLE schedules ALTER COLUMN item_type SET DEFAULT 'task';
    DROP TYPE IF EXISTS schedule_item_type;
    RAISE NOTICE 'Converted schedules.item_type: enum → VARCHAR(20)';
  END IF;
END $$;

-- 3) Tạo lại các index (giờ với VARCHAR comparison)
CREATE INDEX IF NOT EXISTS idx_schedules_status
  ON schedules(status);

CREATE INDEX IF NOT EXISTS idx_schedules_reminder_due
  ON schedules(remind_at)
  WHERE remind_at IS NOT NULL
    AND acknowledged_at IS NULL
    AND status = 'pending';

CREATE INDEX IF NOT EXISTS idx_schedules_end_due
  ON schedules(end_time)
  WHERE end_time IS NOT NULL
    AND end_notified_at IS NULL
    AND status = 'pending';

COMMIT;

-- Verify: nên thấy status/item_type là "character varying"
-- SELECT column_name, data_type, udt_name
-- FROM information_schema.columns
-- WHERE table_name = 'schedules' AND column_name IN ('status', 'item_type');
