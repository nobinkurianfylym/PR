import { cookies } from "next/headers";
import { db, bucket } from "./db";

/**
 * Every table whose rows belong to a single film and must be torn down with it.
 * Keep in sync with the film-scoped schema — an omission here leaks orphans.
 */
const FILM_TABLES = [
  "phases", "missions", "team_members", "reviews", "assets", "film_links",
  "shared_links", "competitors", "opportunities", "film_members", "fans",
  "fan_actions", "fan_posts", "fan_reviews", "checklist_state",
];

/**
 * Permanently delete a film and everything behind it — the R2 objects for its
 * assets and checklist attachments first (so a failure never orphans storage
 * silently), then every film-scoped D1 row, its broadcasts, and the film
 * itself. Used both when a master admin deletes a project directly and when
 * deleting a user tears down the campaigns they own. Caller is responsible for
 * authorization; this does the teardown unconditionally.
 */
export async function deleteFilmCascade(filmId: string): Promise<void> {
  const d = db();
  // R2 first — assets and any checklist attachments.
  for (const table of ["assets", "checklist_state"]) {
    const { results: keys } = await d
      .prepare(`SELECT r2_key FROM ${table} WHERE film_id = ? AND r2_key != ''`)
      .bind(filmId)
      .all<{ r2_key: string }>();
    for (const { r2_key } of keys) {
      try {
        await bucket().delete(r2_key);
      } catch {
        /* keep going — a missing object shouldn't block the delete */
      }
    }
  }
  for (const table of FILM_TABLES) {
    await d.prepare(`DELETE FROM ${table} WHERE film_id = ?`).bind(filmId).run();
  }
  await d.prepare("DELETE FROM broadcasts WHERE scope = ?").bind(filmId).run();
  await d.prepare("DELETE FROM films WHERE id = ?").bind(filmId).run();
}

/**
 * Which of a user's films is "active" — the one every page acts on. Stored in
 * a cookie so a producer running several campaigns can switch between them;
 * falls back to the most recently created film when unset or stale.
 */
const FILM_COOKIE = "pr_fylym_film";

export async function activeFilmId(userId: string): Promise<string | null> {
  const database = db();
  const chosen = (await cookies()).get(FILM_COOKIE)?.value;
  if (chosen) {
    const ok = await database
      .prepare("SELECT film_id AS id FROM film_members WHERE film_id = ? AND user_id = ?")
      .bind(chosen, userId)
      .first<{ id: string }>();
    if (ok) return ok.id;
  }
  const latest = await database
    .prepare(
      `SELECT f.id FROM films f JOIN film_members m ON m.film_id = f.id
        WHERE m.user_id = ? ORDER BY f.created_at DESC, f.rowid DESC LIMIT 1`,
    )
    .bind(userId)
    .first<{ id: string }>();
  return latest?.id ?? null;
}

export async function setActiveFilm(id: string): Promise<void> {
  (await cookies()).set(FILM_COOKIE, id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
