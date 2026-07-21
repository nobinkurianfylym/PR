CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size INTEGER NOT NULL,
  r2_key TEXT NOT NULL,
  share_token TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_assets_film ON assets(film_id);
