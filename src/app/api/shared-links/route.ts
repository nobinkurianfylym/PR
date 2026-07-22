import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";

/** The production team's inbox of links shared from the press kit. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ links: [] });
  const { results } = await db()
    .prepare(
      `SELECT id, url, kind, note, submitted_by, created_at, status, label FROM shared_links
        WHERE film_id = ? ORDER BY created_at DESC, rowid DESC`,
    )
    .bind(filmId)
    .all();
  return NextResponse.json({ links: results });
}
