CREATE TABLE IF NOT EXISTS server_polls (
  id TEXT PRIMARY KEY,
  channel_id TEXT NOT NULL,
  creator_user_id TEXT NOT NULL,
  question TEXT NOT NULL,
  anonymous INTEGER NOT NULL DEFAULT 0,
  allow_multiple INTEGER NOT NULL DEFAULT 0,
  hide_results_until_vote INTEGER NOT NULL DEFAULT 0,
  closes_at TEXT,
  closed_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (channel_id) REFERENCES server_channels(id) ON DELETE CASCADE,
  FOREIGN KEY (creator_user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS server_poll_options (
  id TEXT PRIMARY KEY,
  poll_id TEXT NOT NULL,
  option_text TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (poll_id) REFERENCES server_polls(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS server_poll_votes (
  poll_id TEXT NOT NULL,
  option_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (poll_id, option_id, user_id),
  FOREIGN KEY (poll_id) REFERENCES server_polls(id) ON DELETE CASCADE,
  FOREIGN KEY (option_id) REFERENCES server_poll_options(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_server_polls_channel_created ON server_polls(channel_id, created_at);
CREATE INDEX IF NOT EXISTS idx_server_poll_options_poll ON server_poll_options(poll_id, position);
CREATE INDEX IF NOT EXISTS idx_server_poll_votes_poll ON server_poll_votes(poll_id);
