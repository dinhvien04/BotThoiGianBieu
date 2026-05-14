-- 014-drop-unrelated-shared-db-tables.sql
-- Dọn các bảng không thuộc Bot Thời Gian Biểu nhưng đang nằm chung trong DB.
--
-- Giữ lại các bảng của bot:
--   users
--   user_settings
--   schedules
--   tags
--   schedule_tags
--   schedule_shares
--   schedule_templates
--   schedule_audit_logs
--
-- Xóa các bảng của app địa điểm / review và bảng bot cũ không còn dùng:
--   "Answer"
--   "Category"
--   "Collection"
--   "CollectionItem"
--   "Favorite"
--   "PasswordResetToken"
--   "Photo"
--   "Place"
--   "PlaceCategory"
--   "Question"
--   "RefreshToken"
--   "Region"
--   "Review"
--   "ReviewLike"
--   "User"
--   schedule_editors
--
-- Chạy:
--   psql "$DATABASE_URL" -f migrations/014-drop-unrelated-shared-db-tables.sql
--
-- Idempotent: dùng IF EXISTS để chạy lại không lỗi.

BEGIN;

-- Bảng dư nhưng có FK vào bảng bot hiện tại.
DROP TABLE IF EXISTS public.schedule_editors;

-- Bảng con / junction của app khác.
DROP TABLE IF EXISTS public."ReviewLike";
DROP TABLE IF EXISTS public."CollectionItem";
DROP TABLE IF EXISTS public."PlaceCategory";
DROP TABLE IF EXISTS public."Favorite";
DROP TABLE IF EXISTS public."Photo";
DROP TABLE IF EXISTS public."Answer";
DROP TABLE IF EXISTS public."Question";
DROP TABLE IF EXISTS public."Review";
DROP TABLE IF EXISTS public."Collection";
DROP TABLE IF EXISTS public."PasswordResetToken";
DROP TABLE IF EXISTS public."RefreshToken";

-- Bảng cha của app khác.
DROP TABLE IF EXISTS public."Place";
DROP TABLE IF EXISTS public."Category";
DROP TABLE IF EXISTS public."Region";
DROP TABLE IF EXISTS public."User";

COMMIT;
