import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { CHECKLIST_KEYS } from "@/lib/checklist";

interface StateRow {
  item_key: string;
  done: number;
  file_name: string;
}

/** The active campaign's checklist state — one entry per touched item. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ state: {} });

  const { results } = await db()
    .prepare("SELECT item_key, done, file_name FROM checklist_state WHERE film_id = ?")
    .bind(filmId)
    .all<StateRow>();

  const state: Record<string, { done: boolean; file: string | null }> = {};
  for (const r of results) {
    state[r.item_key] = { done: r.done === 1, file: r.file_name || null };
  }
  return NextResponse.json({ state });
}

/** Tick or untick an item. */
export async function PATCH(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });

  const { key, done } = (await req.json()) as { key?: string; done?: boolean };
  if (!key || !CHECKLIST_KEYS.has(key)) {
    return NextResponse.json({ error: "Unknown item" }, { status: 400 });
  }

  await db()
    .prepare(
      `INSERT INTO checklist_state (film_id, item_key, done) VALUES (?,?,?)
       ON CONFLICT(film_id, item_key)
       DO UPDATE SET done = excluded.done, updated_at = datetime('now')`,
    )
    .bind(filmId, key, done ? 1 : 0)
    .run();

  return NextResponse.json({ ok: true });
}
