import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";

/** Turns the active campaign's public press kit on or off. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { published } = (await req.json()) as { published?: boolean };
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });
  await db()
    .prepare("UPDATE films SET published = ? WHERE id = ?")
    .bind(published ? 1 : 0, filmId)
    .run();
  return NextResponse.json({ ok: true, published: !!published });
}
