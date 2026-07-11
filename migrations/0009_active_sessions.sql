-- Vodkach active session metadata
-- Run once after 0008_profiles_presence.sql.

PRAGMA foreign_keys = ON;

ALTER TABLE sessions ADD COLUMN user_agent TEXT;
ALTER TABLE sessions ADD COLUMN country TEXT;
ALTER TABLE sessions ADD COLUMN last_seen_at TEXT;

UPDATE sessions
SET last_seen_at = COALESCE(last_seen_at, created_at)
WHERE last_seen_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_last_seen_at
ON sessions (last_seen_at);

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0009_active_sessions')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
