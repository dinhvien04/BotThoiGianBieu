-- 009-add-tags.sql
-- Tag/nhãn many-to-many cho schedules.
--
-- Mỗi user có namespace tag riêng — `tags(user_id, name)` unique.
-- Tên tag được normalize về lowercase trước khi lưu, để search/uniqueness
-- không phân biệt hoa/thường.
--
-- Junction table `schedule_tags`: cascade khi schedule hoặc tag bị xoá.
--
-- Áp dụng:
--   psql "$DATABASE_URL" -f migrations/009-add-tags.sql

CREATE TABLE IF NOT EXISTS tags (
  id          SERIAL PRIMARY KEY,
  user_id     VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name        VARCHAR(50) NOT NULL,
  color       VARCHAR(20),
  created_at  TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT tags_user_name_unique UNIQUE (user_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_user
  ON tags (user_id);

CREATE TABLE IF NOT EXISTS schedule_tags (
  schedule_id INTEGER NOT NULL REFERENCES schedules(id) ON DELETE CASCADE,
  tag_id      INTEGER NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (schedule_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_schedule_tags_tag
  ON schedule_tags (tag_id);
