PRAGMA foreign_keys = ON;

ALTER TABLE servers ADD COLUMN description TEXT NOT NULL DEFAULT '';
ALTER TABLE servers ADD COLUMN icon_color TEXT NOT NULL DEFAULT '#fc0303';
ALTER TABLE servers ADD COLUMN is_public INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS server_invites (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  creator_user_id TEXT NOT NULL,
  max_uses INTEGER,
  uses INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT,
  revoked_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_server_invites_server ON server_invites(server_id, created_at);
CREATE INDEX IF NOT EXISTS idx_servers_public ON servers(is_public, created_at);

INSERT OR IGNORE INTO server_invites (id, server_id, code, creator_user_id)
SELECT 'sinv_' || lower(hex(randomblob(16))), id, invite_code, owner_user_id FROM servers;

INSERT INTO schema_meta (key, value)
VALUES ('schema_version_servers', '0016_servers_v2')
ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now');
