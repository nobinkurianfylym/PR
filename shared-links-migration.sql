-- Links shared with the production team from a public press kit:
-- published reviews, social posts, coverage.
CREATE TABLE IF NOT EXISTS shared_links (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  url TEXT NOT NULL,
  kind TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  submitted_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shared_links_film ON shared_links(film_id, created_at);
