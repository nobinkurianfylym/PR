import { cookies } from "next/headers";
import { db } from "./db";

/**
 * Fan identity on a public press/fan page. A fan isn't a full account — they
 * join with an email — so we remember them per film with an HttpOnly cookie
 * holding their fan id. That cookie is the only thing that attributes a share
 * to a fan, so points can't be farmed by a client posting arbitrary ids.
 */
export const POINTS = {
  join: 20,
  share: 10,
} as const;

function cookieName(filmId: string): string {
  return `pr_fan_${filmId}`;
}

export async function setFanCookie(filmId: string, fanId: string): Promise<void> {
  (await cookies()).set(cookieName(filmId), fanId, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

/** The signed-in fan for this film, verified against the DB, or null. */
export async function currentFan(
  filmId: string,
): Promise<{ id: string; name: string; email: string; points: number; shares: number } | null> {
  const id = (await cookies()).get(cookieName(filmId))?.value;
  if (!id) return null;
  const fan = await db()
    .prepare("SELECT id, name, email, points, shares FROM fans WHERE id = ? AND film_id = ?")
    .bind(id, filmId)
    .first<{ id: string; name: string; email: string; points: number; shares: number }>();
  return fan ?? null;
}

/** A fan's 1-based rank within their film, by points then earliest joined. */
export async function fanRank(filmId: string, fanId: string): Promise<number | null> {
  const row = await db()
    .prepare(
      `SELECT COUNT(*) + 1 AS rank FROM fans
        WHERE film_id = ? AND (points > (SELECT points FROM fans WHERE id = ?)
          OR (points = (SELECT points FROM fans WHERE id = ?)
              AND created_at < (SELECT created_at FROM fans WHERE id = ?)))`,
    )
    .bind(filmId, fanId, fanId, fanId)
    .first<{ rank: number }>();
  return row?.rank ?? null;
}

/**
 * Award points for an action, once per (fan, kind, detail). Returns the points
 * granted (0 if it was a repeat). Keeps fans.points/shares in step with the
 * audit rows.
 */
export async function award(
  filmId: string,
  fanId: string,
  kind: "join" | "share",
  detail: string,
): Promise<number> {
  const pts = POINTS[kind];
  const database = db();
  const res = (await database
    .prepare(
      `INSERT OR IGNORE INTO fan_actions (id, fan_id, film_id, kind, detail, points)
       VALUES (?,?,?,?,?,?)`,
    )
    .bind(crypto.randomUUID(), fanId, filmId, kind, detail.slice(0, 200), pts)
    .run()) as { meta?: { changes?: number } };

  const granted = res.meta?.changes ? pts : 0;
  if (granted > 0) {
    await database
      .prepare(
        `UPDATE fans SET points = points + ?, shares = shares + ? WHERE id = ?`,
      )
      .bind(granted, kind === "share" ? 1 : 0, fanId)
      .run();
  }
  return granted;
}
