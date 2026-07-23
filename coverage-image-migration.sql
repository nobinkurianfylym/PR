-- A small preview thumbnail for shared coverage links (og:image, or a
-- YouTube frame). Resolved once when a link is approved; empty = none.
ALTER TABLE shared_links ADD COLUMN image TEXT NOT NULL DEFAULT '';
