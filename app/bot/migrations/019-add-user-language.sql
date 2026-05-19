ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS chk_user_settings_language;

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS language VARCHAR(10) DEFAULT 'vi' NOT NULL;

ALTER TABLE user_settings
  ADD CONSTRAINT chk_user_settings_language CHECK (language IN ('vi', 'en'));
