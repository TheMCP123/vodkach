-- Vodkach D1 approval + friends migration
-- Correct version for a database where access_status does NOT exist yet.
-- Run once after 0002_text_chats_messages.sql.

PRAGMA foreign_keys = ON;

ALTER TABLE users ADD COLUMN access_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE users ADD COLUMN requested_at TEXT;
ALTER TABLE users ADD COLUMN approved_at TEXT;
ALTER TABLE users ADD COLUMN approved_by TEXT;
ALTER TABLE users ADD COLUMN rejected_at TEXT;
ALTER TABLE users ADD COLUMN disabled_at TEXT;

UPDATE users
SET requested_at = COALESCE(created_at, datetime('now'))
WHERE requested_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_users_access_status
ON users (access_status);

CREATE TABLE IF NOT EXISTS friend_requests (
  id TEXT PRIMARY KEY,
  requester_id TEXT NOT NULL,
  addressee_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'canceled')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  responded_at TEXT,
  UNIQUE (requester_id, addressee_id),
  CHECK (requester_id != addressee_id),
  FOREIGN KEY (requester_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (addressee_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_friend_requests_requester
ON friend_requests (requester_id, status);

CREATE INDEX IF NOT EXISTS idx_friend_requests_addressee
ON friend_requests (addressee_id, status);

CREATE TABLE IF NOT EXISTS friendships (
  user_a_id TEXT NOT NULL,
  user_b_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_a_id, user_b_id),
  CHECK (user_a_id < user_b_id),
  FOREIGN KEY (user_a_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_friendships_user_a
ON friendships (user_a_id);

CREATE INDEX IF NOT EXISTS idx_friendships_user_b
ON friendships (user_b_id);

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0003_approval_friends')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
