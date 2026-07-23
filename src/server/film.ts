import { cookies } from "next/headers";
import { db } from "./db";

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
