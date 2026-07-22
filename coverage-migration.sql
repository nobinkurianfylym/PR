-- Approved shared links become public "In the press" coverage.
ALTER TABLE shared_links ADD COLUMN status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE shared_links ADD COLUMN label TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_shared_links_status ON shared_links(film_id, status);
