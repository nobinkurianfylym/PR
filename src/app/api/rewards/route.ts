import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";

/**
 * Fan-club prizes for the signed-in producer's own film. Every operation is
 * scoped to the caller's active film (resolved through membership), so a
 * producer can only set and remove rewards on a campaign they belong to. Shown
 * to fans on the film's public fan page.
 */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ rewards: [] });

  const { results } = await db()
    .prepare("SELECT id, title, detail, sort FROM fan_rewards WHERE film_id = ? ORDER BY sort, created_at")
    .bind(filmId)
    .all();
  return NextResponse.json({ rewards: results });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "Create a film first" }, { status: 400 });

  const b = (await req.json()) as { title?: string; detail?: string };
  const title = String(b.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "A prize title is required" }, { status: 400 });

  await db()
    .prepare("INSERT INTO fan_rewards (id, film_id, title, detail, sort) VALUES (?,?,?,?,?)")
    .bind(crypto.randomUUID(), filmId, title.slice(0, 120), String(b.detail ?? "").trim().slice(0, 300), 0)
    .run();
  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return new NextResponse(null, { status: 204 });

  const id = new URL(req.url).searchParams.get("id") ?? "";
  // Bound to the active film so a producer can't remove another film's prize.
  await db().prepare("DELETE FROM fan_rewards WHERE id = ? AND film_id = ?").bind(id, filmId).run();
  return new NextResponse(null, { status: 204 });
}
