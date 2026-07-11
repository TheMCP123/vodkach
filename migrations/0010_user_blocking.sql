-- Vodkach user blocking
-- Run once after 0009_active_sessions.sql.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS blocked_users (
  blocker_id TEXT NOT NULL,
  blocked_user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (blocker_id, blocked_user_id),
  CHECK (blocker_id != blocked_user_id),
  FOREIGN KEY (blocker_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (blocked_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_blocked_users_target
ON blocked_users (blocked_user_id);

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0010_user_blocking')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
