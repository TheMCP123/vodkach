-- Vodkach D1 initial schema
-- Run this in Cloudflare D1 Console for vodkach-db.

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT UNIQUE,
  email TEXT UNIQUE,
  email_verified INTEGER NOT NULL DEFAULT 0,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_users_google_sub ON users (google_sub);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users (username);

CREATE TABLE IF NOT EXISTS devices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_name TEXT,
  public_key TEXT NOT NULL,
  key_algorithm TEXT NOT NULL DEFAULT 'x25519',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_seen_at TEXT,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_devices_user_id ON devices (user_id);
CREATE INDEX IF NOT EXISTS idx_devices_public_key ON devices (public_key);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  device_id TEXT,
  refresh_token_hash TEXT NOT NULL UNIQUE,
  user_agent_hash TEXT,
  ip_hash TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  FOREIGN KEY (device_id) REFERENCES devices (id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_device_id ON sessions (device_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO schema_meta (key, value)
VALUES ('schema_version', '0001_initial_users_devices_sessions')
ON CONFLICT(key) DO UPDATE SET
  value = excluded.value,
  updated_at = datetime('now');
