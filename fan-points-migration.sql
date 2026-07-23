-- Fan engagement: points earned by sharing official content, and an audit
-- trail so each unique share is rewarded once (no farming).
ALTER TABLE fans ADD COLUMN points INTEGER NOT NULL DEFAULT 0;
ALTER TABLE fans ADD COLUMN shares INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS fan_actions (
  id TEXT PRIMARY KEY,
  fan_id TEXT NOT NULL REFERENCES fans(id),
  film_id TEXT NOT NULL REFERENCES films(id),
  kind TEXT NOT NULL,          -- 'join' | 'share'
  detail TEXT NOT NULL DEFAULT '',
  points INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
-- One reward per (fan, kind, detail): sharing the same poster to X twice
-- counts once.
CREATE UNIQUE INDEX IF NOT EXISTS idx_fan_actions_unique ON fan_actions(fan_id, kind, detail);
CREATE INDEX IF NOT EXISTS idx_fans_points ON fans(film_id, points);
