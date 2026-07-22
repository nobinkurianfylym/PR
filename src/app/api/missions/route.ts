import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { activeFilmId } from "@/server/film";

/** Turns a Brain recommendation into a tracked priority on the campaign. */
export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const filmId = await activeFilmId(user.id);
  if (!filmId) return NextResponse.json({ error: "No campaign" }, { status: 400 });

  const b = (await req.json()) as { title?: string; detail?: string; impact?: string; due?: string };
  const title = String(b.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "Title required" }, { status: 400 });

  const impact = ["High", "Medium", "Low"].includes(b.impact ?? "") ? b.impact! : "High";
  const id = crypto.randomUUID();
  await db()
    .prepare("INSERT INTO missions (id, film_id, title, detail, impact, due) VALUES (?,?,?,?,?,?)")
    .bind(id, filmId, title.slice(0, 200), String(b.detail ?? "").slice(0, 400), impact, String(b.due ?? "Today").slice(0, 40))
    .run();
  return NextResponse.json({ id }, { status: 201 });
}
