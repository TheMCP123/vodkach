ALTER TABLE servers ADD COLUMN icon_data TEXT;
ALTER TABLE servers ADD COLUMN rules_text TEXT NOT NULL DEFAULT '';
ALTER TABLE servers ADD COLUMN verification_level INTEGER NOT NULL DEFAULT 0;
ALTER TABLE servers ADD COLUMN default_notifications TEXT NOT NULL DEFAULT 'all';
ALTER TABLE server_channels ADD COLUMN topic TEXT NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS server_bans (
  server_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  banned_by_user_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (server_id, user_id),
  FOREIGN KEY (server_id) REFERENCES servers(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_server_bans_server ON server_bans(server_id, created_at DESC);
