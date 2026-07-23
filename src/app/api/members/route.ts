import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";
import { roleInFilm } from "@/server/membership";

/** The roster of the active campaign, plus the invite link (admins only). */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });

  const role = await roleInFilm(user.id, filmId);
  if (!role) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const database = db();
  const { results: members } = await database
    .prepare(
      `SELECT m.user_id, m.role, m.joined_at, u.name, u.email
         FROM film_members m JOIN users u ON u.id = m.user_id
        WHERE m.film_id = ? ORDER BY (m.role = 'admin') DESC, m.joined_at`,
    )
    .bind(filmId)
    .all();

  // The invite token is governance — only an admin sees it.
  let inviteToken: string | null = null;
  if (role === "admin") {
    const film = await database
      .prepare("SELECT invite_token FROM films WHERE id = ?")
      .bind(filmId)
      .first<{ invite_token: string | null }>();
    inviteToken = film?.invite_token ?? null;
  }

  return NextResponse.json({ role, members, inviteToken, you: user.id });
}
