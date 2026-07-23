import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { setActiveFilm } from "@/server/film";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { filmId } = (await req.json()) as { filmId?: string };
  if (!filmId) return NextResponse.json({ error: "filmId required" }, { status: 400 });
  const owned = await db()
    .prepare("SELECT film_id AS id FROM film_members WHERE film_id = ? AND user_id = ?")
    .bind(filmId, user.id)
    .first();
  if (!owned) return NextResponse.json({ error: "Not found" }, { status: 404 });
  await setActiveFilm(filmId);
  return NextResponse.json({ ok: true });
}
