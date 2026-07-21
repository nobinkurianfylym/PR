-- PR.FYLYM D1 schema (Phase 1). Applied with: wrangler d1 execute pr-fylym-db --file schema.sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS films (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  genre TEXT NOT NULL,
  language TEXT NOT NULL,
  budget INTEGER NOT NULL,
  marketing_budget INTEGER NOT NULL,
  release_date TEXT NOT NULL,
  poster_url TEXT NOT NULL DEFAULT '',
  trailer_url TEXT NOT NULL DEFAULT '',
  cast TEXT NOT NULL DEFAULT '',
  crew TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS phases (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  phase TEXT NOT NULL,
  date TEXT NOT NULL,
  summary TEXT NOT NULL,
  sort INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS missions (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  title TEXT NOT NULL,
  detail TEXT NOT NULL,
  impact TEXT NOT NULL,
  due TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS team_members (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Invited',
  contribution INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  quote TEXT NOT NULL,
  publication TEXT NOT NULL,
  critic TEXT NOT NULL DEFAULT '',
  rating REAL NOT NULL,
  date TEXT NOT NULL DEFAULT (date('now'))
);

CREATE INDEX IF NOT EXISTS idx_films_user ON films(user_id);
CREATE INDEX IF NOT EXISTS idx_phases_film ON phases(film_id, sort);
CREATE INDEX IF NOT EXISTS idx_missions_film ON missions(film_id);
CREATE INDEX IF NOT EXISTS idx_team_film ON team_members(film_id);
CREATE INDEX IF NOT EXISTS idx_reviews_film ON reviews(film_id);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
