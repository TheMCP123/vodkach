PRAGMA foreign_keys = ON;

ALTER TABLE servers ADD COLUMN banner_data TEXT;
ALTER TABLE server_channels ADD COLUMN type TEXT NOT NULL DEFAULT 'text';
ALTER TABLE server_channels ADD COLUMN bitrate INTEGER NOT NULL DEFAULT 64000;
ALTER TABLE server_channels ADD COLUMN user_limit INTEGER NOT NULL DEFAULT 0;
ALTER TABLE server_channels ADD COLUMN permissions_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE server_messages ADD COLUMN gif_url TEXT;
ALTER TABLE server_messages ADD COLUMN mentions_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS server_roles (
  id TEXT PRIMARY KEY,
  server_id TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#99a0aa',
  position INTEGER NOT NULL DEFAULT 0,
  permissions_json TEXT NOT NULL DEFAULT '{}',
  mentionable INTEGER NOT NULL DEFAULT 0,
  hoist INTEGER NOT NULL DEFAULT 0,
  managed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(server_id) REFERENCES servers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_server_roles_server ON server_roles(server_id, position DESC);

CREATE TABLE IF NOT EXISTS server_member_roles (
  server_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role_id TEXT NOT NULL,
  PRIMARY KEY(server_id,user_id,role_id),
  FOREIGN KEY(server_id) REFERENCES servers(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY(role_id) REFERENCES server_roles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS server_timeouts (
  server_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  moderator_user_id TEXT NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(server_id,user_id),
  FOREIGN KEY(server_id) REFERENCES servers(id) ON DELETE CASCADE,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_server_timeouts_expiry ON server_timeouts(server_id,expires_at);

CREATE TABLE IF NOT EXISTS server_audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  server_id TEXT NOT NULL,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target_id TEXT,
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(server_id) REFERENCES servers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_server_audit_server ON server_audit_log(server_id,created_at DESC);

INSERT OR IGNORE INTO server_roles(id,server_id,name,color,position,permissions_json,mentionable,hoist,managed)
SELECT 'role_everyone_' || id,id,'@everyone','#99a0aa',0,'{"view_channels":true,"send_messages":true,"connect_voice":true,"speak":true}',0,0,1 FROM servers;

INSERT INTO schema_meta(key,value) VALUES('schema_version_servers','0018_servers_pro')
ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=datetime('now');
