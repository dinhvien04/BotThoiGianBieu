-- PR-Q: Pin / hide schedule
ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS is_hidden BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_schedules_user_pinned
  ON schedules (user_id, is_pinned)
  WHERE is_pinned = TRUE;
