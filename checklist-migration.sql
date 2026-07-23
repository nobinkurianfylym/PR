-- Per-film campaign checklist state. The checklist template lives in code
-- (src/lib/checklist.ts); here we store only what changes per film: whether an
-- item is ticked and any file attached to it. item_key is "<category>.<item>".
CREATE TABLE IF NOT EXISTS checklist_state (
  film_id TEXT NOT NULL REFERENCES films(id),
  item_key TEXT NOT NULL,
  done INTEGER NOT NULL DEFAULT 0,
  file_name TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL DEFAULT '',
  content_type TEXT NOT NULL DEFAULT '',
  size INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (film_id, item_key)
);
