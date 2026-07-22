import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { currentUser } from "@/server/auth";
import { setActiveFilm } from "@/server/film";
import { planCampaign, seedMissions } from "@/server/brain";

/** All the producer's campaigns, newest first. */
export async function GET() {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { results } = await db()
    .prepare("SELECT id, title, release_date FROM films WHERE user_id = ? ORDER BY created_at DESC, rowid DESC")
    .bind(user.id)
    .all();
  return NextResponse.json({ films: results });
}

export async function POST(req: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const b = (await req.json()) as Record<string, unknown>;
  const title = String(b.title ?? "").trim();
  const releaseDate = String(b.releaseDate ?? "");
  if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(releaseDate)) {
    return NextResponse.json({ error: "Title and release date are required" }, { status: 400 });
  }

  const filmId = crypto.randomUUID();
  const database = db();
  await database
    .prepare(
      `INSERT INTO films (id, user_id, title, genre, language, budget, marketing_budget,
       release_date, poster_url, trailer_url, cast, crew) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
    )
    .bind(
      filmId, user.id, title,
      String(b.genre ?? ""), String(b.language ?? ""),
      Number(b.budget ?? 0), Number(b.marketingBudget ?? 0),
      releaseDate, String(b.posterUrl ?? ""), String(b.trailerUrl ?? ""),
      String(b.cast ?? ""), String(b.crew ?? ""),
    )
    .run();

  // The Brain plans the campaign and seeds the first missions.
  const statements = planCampaign(releaseDate).map((p) =>
    database
      .prepare("INSERT INTO phases (id, film_id, phase, date, summary, sort) VALUES (?,?,?,?,?,?)")
      .bind(crypto.randomUUID(), filmId, p.phase, p.date, p.summary, p.sort),
  );
  for (const m of seedMissions(title)) {
    statements.push(
      database
        .prepare("INSERT INTO missions (id, film_id, title, detail, impact, due) VALUES (?,?,?,?,?,?)")
        .bind(crypto.randomUUID(), filmId, m.title, m.detail, m.impact, m.due),
    );
  }
  await database.batch(statements);

  // A brand-new campaign becomes the active one.
  await setActiveFilm(filmId);
  return NextResponse.json({ id: filmId }, { status: 201 });
}
