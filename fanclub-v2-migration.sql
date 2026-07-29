-- Fan club v2: referral attribution, email verification, magic-link tokens,
-- and admin-managed rewards.
ALTER TABLE fans ADD COLUMN ref_visits INTEGER NOT NULL DEFAULT 0;
ALTER TABLE fans ADD COLUMN ref_joins INTEGER NOT NULL DEFAULT 0;
ALTER TABLE fans ADD COLUMN referred_by TEXT NOT NULL DEFAULT '';
ALTER TABLE fans ADD COLUMN verified INTEGER NOT NULL DEFAULT 0;

-- One row per (referrer, unique visitor); joined_fan_id set if they signed up.
CREATE TABLE IF NOT EXISTS fan_referrals (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL,
  referrer_id TEXT NOT NULL,
  visitor_key TEXT NOT NULL,
  joined_fan_id TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_fan_referrals_unique
  ON fan_referrals(film_id, referrer_id, visitor_key);

-- Magic-link tokens (SHA-256 hash at rest, short-lived).
CREATE TABLE IF NOT EXISTS fan_tokens (
  token_hash TEXT PRIMARY KEY,
  fan_id TEXT NOT NULL,
  film_id TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

-- Prizes a film's top fans can win — added by the admin, shown to fans.
CREATE TABLE IF NOT EXISTS fan_rewards (
  id TEXT PRIMARY KEY,
  film_id TEXT NOT NULL,
  title TEXT NOT NULL,
  detail TEXT NOT NULL DEFAULT '',
  sort INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
