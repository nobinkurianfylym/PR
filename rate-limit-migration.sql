-- Lightweight fixed-window rate limiting. One row per bucket
-- (action + ip/email); reset_at is a unix second. Rows are tiny and
-- self-expiring in effect (a stale row is reset on next hit).
CREATE TABLE IF NOT EXISTS rate_limits (
  bucket TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  reset_at INTEGER NOT NULL
);
