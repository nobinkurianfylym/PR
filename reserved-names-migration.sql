-- Master-admin controlled reserved names, on top of the hard-coded platform
-- list in src/lib/slug.ts. Lets the company block or free any fan-page address
-- (subdomain) from the admin console — no code deploy needed.
CREATE TABLE IF NOT EXISTS reserved_slugs (
  slug TEXT PRIMARY KEY,
  note TEXT NOT NULL DEFAULT '',
  created_by TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
