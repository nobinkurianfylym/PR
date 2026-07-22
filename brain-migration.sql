-- Campaign Brain: market intelligence the producer feeds in, which the
-- strategist reasons over alongside real campaign state.
CREATE TABLE IF NOT EXISTS competitors (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  title TEXT NOT NULL,
  event TEXT NOT NULL,
  event_date TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS opportunities (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  title TEXT NOT NULL,
  kind TEXT NOT NULL,
  window_ends TEXT NOT NULL DEFAULT '',
  reach INTEGER NOT NULL DEFAULT 0,
  done INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_competitors_film ON competitors(film_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_film ON opportunities(film_id);
