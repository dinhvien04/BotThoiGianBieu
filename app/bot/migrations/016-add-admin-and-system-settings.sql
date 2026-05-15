-- 016-add-admin-and-system-settings.sql
-- Bổ sung hạ tầng cho module Admin:
--   1. Trường `role` trên bảng `users` ('user' / 'admin').
--   2. Trường `is_locked` trên bảng `users` — admin có thể khoá tài khoản.
--   3. Bảng `system_settings` — key/value config toàn hệ thống do admin sửa.
--   4. Bảng `broadcasts` — lịch sử các thông điệp admin gửi tới user (DM Mezon).
--
-- Áp dụng:
--   psql "$DATABASE_URL" -f migrations/016-add-admin-and-system-settings.sql
--
-- Idempotent — chạy lại an toàn.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS is_locked BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

CREATE TABLE IF NOT EXISTS system_settings (
  key         VARCHAR(100) PRIMARY KEY,
  value       JSONB,
  updated_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_by  VARCHAR(50)
);

CREATE TABLE IF NOT EXISTS broadcasts (
  id                BIGSERIAL PRIMARY KEY,
  sender_user_id    VARCHAR(50) NOT NULL,
  message           TEXT NOT NULL,
  recipient_filter  JSONB,
  total_recipients  INTEGER NOT NULL DEFAULT 0,
  success_count     INTEGER NOT NULL DEFAULT 0,
  failed_count      INTEGER NOT NULL DEFAULT 0,
  created_at        TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_broadcasts_sender_created
  ON broadcasts (sender_user_id, created_at DESC);
