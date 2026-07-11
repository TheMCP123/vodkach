-- Vodkach profiles and presence
-- Run once after 0007_message_actions.sql.

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN pronouns TEXT;
ALTER TABLE users ADD COLUMN bio TEXT;
ALTER TABLE users ADD COLUMN status_preference TEXT NOT NULL DEFAULT 'online';
ALTER TABLE users ADD COLUMN last_seen_at TEXT;

CREATE INDEX IF NOT EXISTS idx_users_last_seen_at
ON users (last_seen_at);

CREATE INDEX IF NOT EXISTS idx_users_status_preference
ON users (status_preference);

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0008_profiles_presence')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
