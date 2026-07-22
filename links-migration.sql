-- Official pages for a film: IMDb, socials, ticketing, music.
CREATE TABLE IF NOT EXISTS film_links (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  platform TEXT NOT NULL,
  url TEXT NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_film_links_unique ON film_links(film_id, platform);
