-- Album-art thumbnails for music links (Spotify / Apple Music / YouTube
-- Music), resolved from the linked page's og:image when links are saved.
ALTER TABLE film_links ADD COLUMN image TEXT NOT NULL DEFAULT '';
