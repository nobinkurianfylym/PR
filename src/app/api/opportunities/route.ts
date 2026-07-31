import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";

const KINDS = ["Trend", "Festival", "Audio", "Interview", "Holiday", "Collaboration", "Activation"];

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });
  const b = (await req.json()) as { title?: string; kind?: string; windowEnds?: string; ship?: string };
  if (!b.title?.trim()) return NextResponse.json({ error: "Describe the opportunity" }, { status: 400 });
  const id = crypto.randomUUID();
  await db()
    .prepare("INSERT INTO opportunities (id, film_id, title, kind, window_ends, ship) VALUES (?,?,?,?,?,?)")
    .bind(
      id, filmId, b.title.trim().slice(0, 160),
      KINDS.includes(b.kind ?? "") ? b.kind! : "Trend",
      (b.windowEnds ?? "").slice(0, 10), String(b.ship ?? "").trim().slice(0, 200),
    )
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
