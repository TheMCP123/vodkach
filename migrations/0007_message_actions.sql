-- Vodkach message replies
-- Run once after previous migrations.

PRAGMA foreign_keys = ON;

ALTER TABLE messages ADD COLUMN reply_to_message_id TEXT
  REFERENCES messages(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_messages_reply_to
ON messages (reply_to_message_id);

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0007_message_actions')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
