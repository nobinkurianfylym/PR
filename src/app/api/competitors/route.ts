import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });
  const b = (await req.json()) as { title?: string; event?: string; eventDate?: string };
  if (!b.title?.trim() || !b.event?.trim()) {
    return NextResponse.json({ error: "Film and what they did are required" }, { status: 400 });
  }
  const id = crypto.randomUUID();
  await db()
    .prepare("INSERT INTO competitors (id, film_id, title, event, event_date) VALUES (?,?,?,?,?)")
    .bind(id, filmId, b.title.trim().slice(0, 120), b.event.trim().slice(0, 200), (b.eventDate ?? "").slice(0, 10))
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
