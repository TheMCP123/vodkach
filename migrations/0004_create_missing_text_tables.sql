-- Vodkach D1 catch-up migration:
-- creates missing text chat tables after 0003 was already applied.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS chats (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('direct', 'group')),
  title TEXT,
  avatar_url TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_message_at TEXT,
  FOREIGN KEY (created_by) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chats_type ON chats (type);
CREATE INDEX IF NOT EXISTS idx_chats_last_message_at ON chats (last_message_at);

CREATE TABLE IF NOT EXISTS chat_members (
  chat_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member'
    CHECK (role IN ('owner', 'admin', 'member')),
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  left_at TEXT,
  PRIMARY KEY (chat_id, user_id),
  FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_chat_members_user_id
ON chat_members (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_members_chat_id
ON chat_members (chat_id);

CREATE TABLE IF NOT EXISTS direct_chats (
  chat_id TEXT PRIMARY KEY,
  user_a_id TEXT NOT NULL,
  user_b_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_a_id, user_b_id),
  FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
  FOREIGN KEY (user_a_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (user_b_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_direct_chats_user_a
ON direct_chats (user_a_id);

CREATE INDEX IF NOT EXISTS idx_direct_chats_user_b
ON direct_chats (user_b_id);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY,
  chat_id TEXT NOT NULL,
  sender_user_id TEXT NOT NULL,
  sender_device_id TEXT,
  client_message_id TEXT,
  body_ciphertext TEXT NOT NULL,
  body_nonce TEXT,
  body_algorithm TEXT NOT NULL DEFAULT 'pending-client-e2ee',
  body_version INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  edited_at TEXT,
  deleted_at TEXT,
  UNIQUE (chat_id, sender_user_id, client_message_id),
  FOREIGN KEY (chat_id) REFERENCES chats (id) ON DELETE CASCADE,
  FOREIGN KEY (sender_user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (sender_device_id) REFERENCES devices (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_messages_chat_created
ON messages (chat_id, created_at);

CREATE INDEX IF NOT EXISTS idx_messages_sender
ON messages (sender_user_id);

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0003_approval_friends')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
