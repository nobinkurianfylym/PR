import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { CHECKLIST_KEYS } from "@/lib/checklist";

interface StateRow {
  item_key: string;
  done: number;
  file_name: string;
  assignee: string;
  due_date: string;
}

/** The active campaign's checklist state — one entry per touched item. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ state: {} });

  const d = db();
  const [{ results }, film, assets, links, coverage] = await Promise.all([
    d.prepare("SELECT item_key, done, file_name, assignee, due_date FROM checklist_state WHERE film_id = ?").bind(filmId).all<StateRow>(),
    d.prepare("SELECT published, trailer_url, release_date, synopsis FROM films WHERE id = ?").bind(filmId).first<{ published: number; trailer_url: string; release_date: string; synopsis: string }>(),
    d.prepare("SELECT DISTINCT type FROM assets WHERE film_id = ? AND status = 'approved'").bind(filmId).all<{ type: string }>(),
    d.prepare("SELECT platform FROM film_links WHERE film_id = ?").bind(filmId).all<{ platform: string }>(),
    d.prepare("SELECT COUNT(*) n FROM shared_links WHERE film_id = ? AND status = 'approved'").bind(filmId).first<{ n: number }>(),
  ]);

  const state: Record<string, { done: boolean; file: string | null; assignee: string; dueDate: string }> = {};
  for (const r of results) {
    state[r.item_key] = { done: r.done === 1, file: r.file_name || null, assignee: r.assignee || "", dueDate: r.due_date || "" };
  }

  // Items whose completion is provable from real artifacts already on file —
  // "done" in reality, not just because a box was ticked.
  const types = new Set((assets.results as { type: string }[]).map((a) => a.type));
  const platforms = new Set((links.results as { platform: string }[]).map((l) => l.platform));
  const ytTrailer = /youtu\.?be/i.test(film?.trailer_url ?? "");
  const verified: string[] = [];
  const mark = (key: string, ok: boolean) => { if (ok) verified.push(key); };
  mark("campaign.release-date", !!film?.release_date);
  mark("press-kit.synopsis", !!film?.synopsis?.trim());
  mark("press-kit.posters", types.has("Poster"));
  mark("press-kit.stills", types.has("Stills"));
  mark("press-kit.trailer", types.has("Trailer") || ytTrailer);
  mark("press-kit.epk", types.has("EPK"));
  mark("press-kit.logo", types.has("Logo"));
  mark("fans.fan-club", film?.published === 1);
  mark("fans.leaderboard", film?.published === 1);
  mark("fans.community", platforms.has("whatsapp") || platforms.has("telegram"));
  mark("social.channels", ["instagram", "x", "facebook", "youtube"].some((p) => platforms.has(p)));
  mark("pr.outreach", (coverage?.n ?? 0) > 0);

  return NextResponse.json({ state, verified });
}

/** Tick or untick an item. */
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });

  const { key, done, assignee, dueDate } = (await req.json()) as {
    key?: string; done?: boolean; assignee?: string; dueDate?: string;
  };
  if (!key || !CHECKLIST_KEYS.has(key)) {
    return NextResponse.json({ error: "Unknown item" }, { status: 400 });
  }
  const d = db();

  if (done !== undefined) {
    await d
      .prepare(
        `INSERT INTO checklist_state (film_id, item_key, done) VALUES (?,?,?)
         ON CONFLICT(film_id, item_key)
         DO UPDATE SET done = excluded.done, updated_at = datetime('now')`,
      )
      .bind(filmId, key, done ? 1 : 0)
      .run();
  }
  if (assignee !== undefined) {
    await d
      .prepare(
        `INSERT INTO checklist_state (film_id, item_key, assignee) VALUES (?,?,?)
         ON CONFLICT(film_id, item_key)
         DO UPDATE SET assignee = excluded.assignee, updated_at = datetime('now')`,
      )
      .bind(filmId, key, String(assignee).slice(0, 120))
      .run();
  }
  if (dueDate !== undefined) {
    const dd = /^\d{4}-\d{2}-\d{2}$/.test(dueDate) ? dueDate : "";
    await d
      .prepare(
        `INSERT INTO checklist_state (film_id, item_key, due_date) VALUES (?,?,?)
         ON CONFLICT(film_id, item_key)
         DO UPDATE SET due_date = excluded.due_date, updated_at = datetime('now')`,
      )
      .bind(filmId, key, dd)
      .run();
  }

  return NextResponse.json({ ok: true });
}
