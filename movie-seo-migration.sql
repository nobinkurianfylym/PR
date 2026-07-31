-- Producer-authored editorial text for the public movie page. Kept truthful by
-- being written by the film's own team (never generated): the synopsis powers
-- the About/Story section and the schema.org description; the tagline replaces
-- the generic hero line with the film's real one.
ALTER TABLE films ADD COLUMN synopsis TEXT NOT NULL DEFAULT '';
ALTER TABLE films ADD COLUMN tagline TEXT NOT NULL DEFAULT '';
