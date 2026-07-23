import { db } from "./db";

/**
 * Campaign access. A film is no longer owned by one user — it has members.
 * The creator is `admin`; invited street-team members are `member`. Both get
 * full working access to the press kit and vault; admin-only powers are the
 * governance ones (rotate the invite, remove members, delete the campaign).
 *
 * This is the single access boundary: every film-scoped query resolves the
 * film through membership rather than a stored owner id.
 */
export type Role = "admin" | "member";

/** SQL fragment: the films a user may act on. Bind `userId` where used. */
export const MEMBER_FILMS = "SELECT film_id FROM film_members WHERE user_id = ?";

export async function roleInFilm(userId: string, filmId: string): Promise<Role | null> {
  const row = await db()
    .prepare("SELECT role FROM film_members WHERE film_id = ? AND user_id = ?")
    .bind(filmId, userId)
    .first<{ role: Role }>();
  return row?.role ?? null;
}

export async function isMember(userId: string, filmId: string): Promise<boolean> {
  return (await roleInFilm(userId, filmId)) !== null;
}

export async function isAdmin(userId: string, filmId: string): Promise<boolean> {
  return (await roleInFilm(userId, filmId)) === "admin";
}

/** Add a user to a campaign, without disturbing an existing role. */
export async function addMember(
  filmId: string,
  userId: string,
  role: Role = "member",
): Promise<void> {
  await db()
    .prepare(
      "INSERT OR IGNORE INTO film_members (film_id, user_id, role) VALUES (?,?,?)",
    )
    .bind(filmId, userId, role)
    .run();
}
