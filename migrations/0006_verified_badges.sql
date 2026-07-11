-- Vodkach verified badge
-- Run once after previous migrations.

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_users_verified
ON users (verified);

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0006_verified_badges')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
