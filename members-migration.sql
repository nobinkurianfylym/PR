-- Shared campaign access: the creator is admin, invited street-team members
-- get working access to the press kit and vault.
CREATE TABLE IF NOT EXISTS film_members (
  film_id TEXT NOT NULL REFERENCES films(id),
  user_id TEXT NOT NULL REFERENCES users(id),
  role TEXT NOT NULL DEFAULT 'member',
  joined_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (film_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_film_members_user ON film_members(user_id);

-- One reusable invite link per campaign, rotatable by the admin.
ALTER TABLE films ADD COLUMN invite_token TEXT;

-- Every existing campaign's creator becomes its admin.
INSERT OR IGNORE INTO film_members (film_id, user_id, role)
  SELECT id, user_id, 'admin' FROM films;

-- Link the roster to real accounts when someone joins.
ALTER TABLE team_members ADD COLUMN user_id TEXT;
