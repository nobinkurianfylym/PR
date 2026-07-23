-- The PR.FYLYM fan database: everyone who joins any film's fan club, one row
-- per (film, email). Queryable per-film by that campaign's team, and globally
-- by the platform master admin.
CREATE TABLE IF NOT EXISTS fans (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  name TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL,
  city TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fans_film_email ON fans(film_id, email);
CREATE INDEX IF NOT EXISTS idx_fans_email ON fans(email);
CREATE INDEX IF NOT EXISTS idx_fans_film ON fans(film_id);

-- Messages the master admin composes to fans. Stored regardless of whether a
-- provider is configured to actually deliver them.
CREATE TABLE IF NOT EXISTS broadcasts (
  id TEXT PRIMARY KEY,
  scope TEXT NOT NULL,           -- 'all', or a specific film_id
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  recipient_count INTEGER NOT NULL DEFAULT 0,
  sent_count INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'saved',   -- saved | sent | partial | failed
  created_by TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_broadcasts_created ON broadcasts(created_at);
