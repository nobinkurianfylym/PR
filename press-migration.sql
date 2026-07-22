-- Public press kits: a stable slug per campaign + a publish switch.
ALTER TABLE films ADD COLUMN slug TEXT;
ALTER TABLE films ADD COLUMN published INTEGER NOT NULL DEFAULT 1;
UPDATE films
   SET slug = lower(replace(replace(replace(replace(replace(title,':',''),'.',''),',',''),'''',''),' ','-'))
 WHERE slug IS NULL OR slug = '';
CREATE UNIQUE INDEX IF NOT EXISTS idx_films_slug ON films(slug);
