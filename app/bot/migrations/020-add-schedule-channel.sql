ALTER TABLE schedules
  ADD COLUMN IF NOT EXISTS channel_id VARCHAR(50);

CREATE INDEX IF NOT EXISTS idx_schedules_channel_id
  ON schedules(channel_id);
