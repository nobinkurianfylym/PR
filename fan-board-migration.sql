-- The fan-club discussion board: short public comments from joined fans.
-- Posting is gated to fans (by cookie identity); the film's team and the
-- master admin can delete. Kept intentionally small — a comment wall.
CREATE TABLE IF NOT EXISTS fan_posts (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL REFERENCES films(id),
  fan_id TEXT NOT NULL REFERENCES fans(id),
  body TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_fan_posts_film ON fan_posts(film_id, created_at);
