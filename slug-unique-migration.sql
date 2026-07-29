-- Concurrency guard: two films can never hold the same slug/subdomain.
CREATE UNIQUE INDEX IF NOT EXISTS idx_films_slug_unique ON films(slug) WHERE slug IS NOT NULL;
