PRAGMA foreign_keys = ON;

ALTER TABLE calls ADD COLUMN caller_joined_at TEXT;
ALTER TABLE calls ADD COLUMN callee_joined_at TEXT;
ALTER TABLE calls ADD COLUMN caller_muted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE calls ADD COLUMN callee_muted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE calls ADD COLUMN caller_sharing INTEGER NOT NULL DEFAULT 0;
ALTER TABLE calls ADD COLUMN callee_sharing INTEGER NOT NULL DEFAULT 0;
ALTER TABLE calls ADD COLUMN caller_speaking INTEGER NOT NULL DEFAULT 0;
ALTER TABLE calls ADD COLUMN callee_speaking INTEGER NOT NULL DEFAULT 0;
ALTER TABLE calls ADD COLUMN media_updated_at TEXT;

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0013_call_media_state')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
