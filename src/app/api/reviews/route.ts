import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = (await req.json()) as { quote?: string; publication?: string; critic?: string; rating?: number };
  const rating = Number(b.rating);
  if (!b.quote?.trim() || !b.publication?.trim() || !(rating >= 0.5 && rating <= 5)) {
    return NextResponse.json({ error: "Quote, publication, and a 0.5–5 rating are required" }, { status: 400 });
  }
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "Create a film first" }, { status: 400 });
  const id = crypto.randomUUID();
  await db()
    .prepare("INSERT INTO reviews (id, film_id, quote, publication, critic, rating) VALUES (?,?,?,?,?,?)")
    .bind(id, filmId, b.quote.trim(), b.publication.trim(), b.critic?.trim() ?? "", rating)
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
