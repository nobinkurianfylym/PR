-- Campaign Brain v2 — make it operational instead of theoretical.

-- Priorities become executable tasks: an owner, a real deadline, an attached
-- asset, and which beat/recommendation spawned them.
ALTER TABLE missions ADD COLUMN assignee TEXT NOT NULL DEFAULT '';
ALTER TABLE missions ADD COLUMN due_date TEXT NOT NULL DEFAULT '';
ALTER TABLE missions ADD COLUMN asset_id TEXT NOT NULL DEFAULT '';
ALTER TABLE missions ADD COLUMN source TEXT NOT NULL DEFAULT '';

-- Checklist items become schedulable: an owner and a due date per item.
ALTER TABLE checklist_state ADD COLUMN assignee TEXT NOT NULL DEFAULT '';
ALTER TABLE checklist_state ADD COLUMN due_date TEXT NOT NULL DEFAULT '';

-- An opportunity is a window date + the exact thing to ship by then. No
-- invented "potential reach".
ALTER TABLE opportunities ADD COLUMN ship TEXT NOT NULL DEFAULT '';

-- Competitor entries carry the source article for release-date clash intel.
ALTER TABLE competitors ADD COLUMN url TEXT NOT NULL DEFAULT '';

-- Real, producer-entered facts for the war-room and clash search.
ALTER TABLE films ADD COLUMN market TEXT NOT NULL DEFAULT '';
ALTER TABLE films ADD COLUMN booking_status TEXT NOT NULL DEFAULT '';

-- Live trailer metrics snapshot pulled from the real YouTube link. prev_* holds
-- the previous snapshot so daily velocity is a real measured delta, not a guess.
CREATE TABLE IF NOT EXISTS youtube_stats (
  film_id TEXT PRIMARY KEY REFERENCES films(id),
  video_id TEXT NOT NULL,
  views INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
  prev_views INTEGER NOT NULL DEFAULT 0,
  prev_fetched_at TEXT NOT NULL DEFAULT ''
);
