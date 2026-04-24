-- Migration 006: Thêm cột `notify_via_channel` vào user_settings.
-- Mục đích: cho phép user chọn 3 mode thông báo:
--   - Chỉ DM        (notify_via_dm=true,  notify_via_channel=false)
--   - Chỉ channel   (notify_via_dm=false, notify_via_channel=true)
--   - Cả hai        (notify_via_dm=true,  notify_via_channel=true)
--
-- Backfill: giữ nguyên hành vi cũ cho user hiện có:
--   - Ai đang dm=true → chuyển thành "Chỉ DM" (channel=false)
--   - Ai đang dm=false → chuyển thành "Chỉ channel" (channel=true)

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS notify_via_channel BOOLEAN;

UPDATE user_settings
  SET notify_via_channel = NOT notify_via_dm
  WHERE notify_via_channel IS NULL;

ALTER TABLE user_settings
  ALTER COLUMN notify_via_channel SET NOT NULL;

ALTER TABLE user_settings
  ALTER COLUMN notify_via_channel SET DEFAULT TRUE;
