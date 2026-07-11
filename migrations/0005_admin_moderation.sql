-- Vodkach D1 admin moderation schema
-- Run once after 0003 and 0004.

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN banned_until TEXT;
ALTER TABLE users ADD COLUMN ban_reason TEXT;

CREATE TABLE IF NOT EXISTS banned_emails (
  email TEXT PRIMARY KEY,
  reason TEXT,
  banned_by TEXT,
  banned_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  FOREIGN KEY (banned_by) REFERENCES users (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_banned_emails_expires_at
ON banned_emails (expires_at);

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0005_admin_moderation')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
