-- Public submissions: anyone can send materials; the producer approves them.
ALTER TABLE films ADD COLUMN submissions_open INTEGER NOT NULL DEFAULT 1;
ALTER TABLE assets ADD COLUMN status TEXT NOT NULL DEFAULT 'approved';
ALTER TABLE assets ADD COLUMN submitted_by TEXT NOT NULL DEFAULT '';
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(film_id, status);
