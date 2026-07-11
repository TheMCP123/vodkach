-- Vodkach banner colors and richer session location
-- Run once after 0010_user_blocking.sql.

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN banner_color TEXT NOT NULL DEFAULT '#5b1115';

ALTER TABLE sessions ADD COLUMN city TEXT;
ALTER TABLE sessions ADD COLUMN region TEXT;

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0011_banner_sessions_ui')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
