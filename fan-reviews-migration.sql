-- Fans writing their own reviews on the public fan page, shown on the review
-- wall under the critics. One review per fan per film (they edit their existing
-- one rather than piling up), public immediately like the fan board; the film's
-- team or a master admin can remove any.
CREATE TABLE IF NOT EXISTS fan_reviews (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  fan_id TEXT NOT NULL REFERENCES fans(id),
  rating REAL NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fan_reviews_unique ON fan_reviews(film_id, fan_id);
CREATE INDEX IF NOT EXISTS idx_fan_reviews_film ON fan_reviews(film_id, created_at);
