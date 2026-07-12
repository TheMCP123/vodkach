
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS calls (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  caller_user_id TEXT NOT NULL,
  callee_user_id TEXT NOT NULL,
  realtime_meeting_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ringing'
    CHECK (status IN ('ringing', 'active', 'declined', 'ended', 'missed')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  accepted_at TEXT,
  ended_at TEXT,
  expires_at TEXT,
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (caller_user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (callee_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_calls_participants_status
  ON calls(caller_user_id, callee_user_id, status, created_at);

CREATE INDEX IF NOT EXISTS idx_calls_chat_status
  ON calls(chat_id, status, created_at);

CREATE TABLE IF NOT EXISTS chat_polls (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  creator_user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  anonymous INTEGER NOT NULL DEFAULT 0,
  allow_multiple INTEGER NOT NULL DEFAULT 0,
  hide_results_until_vote INTEGER NOT NULL DEFAULT 0,
  closes_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (chat_id) REFERENCES chats(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_polls_chat_created
  ON chat_polls(chat_id, created_at);

CREATE TABLE IF NOT EXISTS chat_poll_options (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  label TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (poll_id) REFERENCES chat_polls(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_poll_options_poll
  ON chat_poll_options(poll_id, position);

CREATE TABLE IF NOT EXISTS chat_poll_votes (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (poll_id, option_id, user_id),
  FOREIGN KEY (poll_id) REFERENCES chat_polls(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES chat_poll_options(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_poll_votes_poll_user
  ON chat_poll_votes(poll_id, user_id);

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0012_calls_polls')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
