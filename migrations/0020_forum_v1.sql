-- Vodkach Forum v1
-- Run once against the existing vodkach-db D1 database.
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS forum_threads (
  id TEXT PRIMARY KEY,
  author_user_id TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_pinned INTEGER NOT NULL DEFAULT 0,
  is_locked INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_activity_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_forum_threads_author ON forum_threads(author_user_id);
CREATE INDEX IF NOT EXISTS idx_forum_threads_activity ON forum_threads(is_pinned DESC, last_activity_at DESC);

CREATE TABLE IF NOT EXISTS forum_replies (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL,
  author_user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (thread_id) REFERENCES forum_threads(id) ON DELETE CASCADE,
  FOREIGN KEY (author_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_forum_replies_thread ON forum_replies(thread_id, created_at);
CREATE INDEX IF NOT EXISTS idx_forum_replies_author ON forum_replies(author_user_id);

INSERT INTO schema_meta (key, value)
VALUES ('forum_schema_version', '0020_forum_v1')
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now');
